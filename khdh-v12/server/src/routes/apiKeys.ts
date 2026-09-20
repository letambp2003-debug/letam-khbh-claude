import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { encryptSecret, decryptSecret, last4 } from '../lib/crypto.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

const ProviderSchema = z.enum(['anthropic', 'google']);
const SaveKeySchema = z.object({ provider: ProviderSchema, apiKey: z.string().min(10).max(300) });

/**
 * Goi thu mot request nhe len API that de xac nhan key con hop le TRUOC khi
 * luu, thay vi de giao vien phat hien key sai chi khi soan KHDH that bai.
 * KHONG log noi dung key trong bat ky nhanh nao (thanh cong hay loi).
 */
async function validateKeyLive(provider: 'anthropic' | 'google', apiKey: string): Promise<{ ok: boolean; message?: string }> {
  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, message: 'API key Anthropic khong hop le.' };
      return { ok: false, message: `Anthropic tra ve loi HTTP ${res.status} khi kiem tra key.` };
    } else {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (res.ok) return { ok: true };
      if (res.status === 400 || res.status === 403) return { ok: false, message: 'API key Google AI khong hop le.' };
      return { ok: false, message: `Google AI tra ve loi HTTP ${res.status} khi kiem tra key.` };
    }
  } catch (err: any) {
    // Mang loi tam thoi (vi du sandbox chan outbound) khong nen chan hoan toan
    // viec luu key - tra canh bao thay vi that bai cung, giao vien van luu
    // duoc va se biet ngay khi thuc su goi AI sinh noi dung.
    return { ok: false, message: 'Khong the ket noi toi may chu AI de xac thuc ngay luc nay (co the do mang). Key van duoc luu.' };
  }
}

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = SaveKeySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Thieu provider hoac API key khong hop le.' });
  }
  const { provider, apiKey } = parsed.data;

  const validation = await validateKeyLive(provider, apiKey);

  let enc;
  try {
    enc = encryptSecret(apiKey);
  } catch (err: any) {
    console.error('Loi ma hoa API key:', err?.message ?? err);
    return res.status(500).json({
      error: 'Server chua cau hinh API_KEY_ENCRYPTION_SECRET nen khong the luu API key an toan.'
    });
  }

  db.prepare(
    `INSERT INTO api_keys (owner_email, provider, ciphertext, iv, auth_tag, last4, validated_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(owner_email, provider) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       iv = excluded.iv,
       auth_tag = excluded.auth_tag,
       last4 = excluded.last4,
       validated_at = excluded.validated_at,
       updated_at = datetime('now')`
  ).run(req.userEmail, provider, enc.ciphertext, enc.iv, enc.authTag, last4(apiKey), validation.ok ? new Date().toISOString() : null);

  res.json({ ok: true, validated: validation.ok, message: validation.message });
});

router.get('/', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(`SELECT provider, last4, validated_at, updated_at FROM api_keys WHERE owner_email = ?`)
    .all(req.userEmail) as Array<{ provider: string; last4: string; validated_at: string | null; updated_at: string }>;
  res.json({ keys: rows });
});

router.delete('/:provider', requireAuth, (req: AuthedRequest, res) => {
  const parsed = ProviderSchema.safeParse(req.params.provider);
  if (!parsed.success) return res.status(400).json({ error: 'Provider khong hop le.' });
  db.prepare(`DELETE FROM api_keys WHERE owner_email = ? AND provider = ?`).run(req.userEmail, parsed.data);
  res.json({ ok: true });
});

/**
 * Dung noi bo boi cac module sinh noi dung AI (KHDH, Worksheet, Game, Video...)
 * de lay API key da giai ma cua giao vien hien tai; neu giao vien chua tu
 * nhap, roi lai bien moi truong ANTHROPIC_API_KEY/GOOGLE_AI_API_KEY cua server
 * lam mac dinh (dung y "Cho nhap Anthropic API Key rieng tren giao dien" ma
 * van co gia tri fallback cho truong hop chua cau hinh).
 */
export function resolveApiKey(ownerEmail: string, provider: 'anthropic' | 'google'): string | null {
  const row = db
    .prepare(`SELECT ciphertext, iv, auth_tag FROM api_keys WHERE owner_email = ? AND provider = ?`)
    .get(ownerEmail, provider) as { ciphertext: string; iv: string; auth_tag: string } | undefined;

  if (row) {
    try {
      return decryptSecret(row.ciphertext, row.iv, row.auth_tag);
    } catch (err) {
      console.error('Khong giai ma duoc API key da luu (co the API_KEY_ENCRYPTION_SECRET da doi):', (err as any)?.message);
    }
  }

  const envFallback = provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.GOOGLE_AI_API_KEY;
  return envFallback || null;
}

export default router;
