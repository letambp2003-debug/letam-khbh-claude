import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { createSessionToken } from '../lib/session.js';
import { upsertUser, getUser, setUiMode } from '../db/client.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

const clientId = process.env.GOOGLE_CLIENT_ID || '';
const oauthClient = clientId ? new OAuth2Client(clientId) : null;

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const LoginSchema = z.object({ credential: z.string().min(20) });

/**
 * Dang nhap bang Google Identity Services: client goi Google Sign-In,
 * nhan ve mot ID token (JWT), gui len day de server xac thuc chu ky +
 * audience truoc khi tao phien lam viec rieng. Server KHONG bao gio tin
 * thang thong tin nguoi dung tu client ma khong xac thuc lai ID token.
 */
router.post('/google', async (req, res) => {
  if (!oauthClient) {
    return res.status(500).json({
      error: 'Server chua cau hinh GOOGLE_CLIENT_ID. Xem huong dan trong .env.example.'
    });
  }
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Thieu credential tu Google Identity Services.' });
  }

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: clientId
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: 'Tai khoan Google chua xac thuc email.' });
    }

    const email = payload.email.toLowerCase();
    const domain = email.split('@')[1];
    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      return res.status(403).json({
        error: `Chi tai khoan thuoc domain duoc cap phep (${allowedDomains.join(', ')}) moi dang nhap duoc.`
      });
    }

    upsertUser(email, payload.name || '', payload.picture || '');
    const token = createSessionToken(email);

    res.cookie('khdh_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const user = getUser(email);
    return res.json({ user: { email, name: user?.name, picture: user?.picture, uiMode: user?.ui_mode } });
  } catch (err: any) {
    console.error('Google ID token verification failed:', err?.message ?? err);
    return res.status(401).json({ error: 'Xac thuc Google that bai. Vui long thu dang nhap lai.' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('khdh_session');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const user = getUser(req.userEmail!);
  if (!user) return res.status(404).json({ error: 'Khong tim thay nguoi dung.' });
  res.json({ user: { email: user.email, name: user.name, picture: user.picture, uiMode: user.ui_mode } });
});

const UiModeSchema = z.object({ mode: z.enum(['co_ban', 'nang_cao', 'chuyen_gia']) });

router.post('/ui-mode', requireAuth, (req: AuthedRequest, res) => {
  const parsed = UiModeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Che do giao dien khong hop le.' });
  setUiMode(req.userEmail!, parsed.data.mode);
  res.json({ ok: true });
});

export default router;
