import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Provider = 'anthropic' | 'google';

const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Anthropic Claude',
  google: 'Google AI (Gemini)'
};

const PROVIDER_HELP: Record<Provider, string> = {
  anthropic: 'Lấy tại console.anthropic.com/settings/keys',
  google: 'Lấy tại aistudio.google.com/apikey'
};

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<Array<{ provider: string; last4: string; validated_at: string | null }>>([]);
  const [inputs, setInputs] = useState<Record<Provider, string>>({ anthropic: '', google: '' });
  const [busy, setBusy] = useState<Provider | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      setKeys(await api.listApiKeys());
    } catch {
      /* im lặng — không chặn giao diện chỉ vì chưa tải được danh sách key */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave(provider: Provider) {
    const apiKey = inputs[provider].trim();
    if (!apiKey) return;
    setBusy(provider);
    setMessage(null);
    try {
      const result = await api.saveApiKey(provider, apiKey);
      setMessage(
        result.validated
          ? `Đã lưu và xác thực thành công API key ${PROVIDER_LABEL[provider]}.`
          : `Đã lưu API key ${PROVIDER_LABEL[provider]}, nhưng: ${result.message ?? 'chưa xác thực được — vui lòng kiểm tra lại.'}`
      );
      setInputs((prev) => ({ ...prev, [provider]: '' }));
      await refresh();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(provider: Provider) {
    setBusy(provider);
    try {
      await api.deleteApiKey(provider);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const existing = (p: Provider) => keys.find((k) => k.provider === p);

  return (
    <div className="card">
      <h3>API Key của bạn</h3>
      <p className="muted">
        Mỗi giáo viên tự nhập API key riêng (được mã hoá AES-256-GCM trước khi lưu, không bao giờ
        hiển thị lại toàn bộ hay ghi log). Nếu bỏ trống, hệ thống dùng key mặc định của trường (nếu
        quản trị đã cấu hình) — xem <code>SECURITY_NOTES.md</code>.
      </p>
      {message && <div className="info-box">{message}</div>}
      {(['anthropic', 'google'] as Provider[]).map((provider) => {
        const rec = existing(provider);
        return (
          <div key={provider} className="api-key-row">
            <div className="api-key-row-label">
              <strong>{PROVIDER_LABEL[provider]}</strong>
              <span className="muted"> — {PROVIDER_HELP[provider]}</span>
              {rec && (
                <div className="muted">
                  Đã lưu: ••••{rec.last4} {rec.validated_at ? '· đã xác thực' : '· chưa xác thực được'}
                </div>
              )}
            </div>
            <div className="api-key-row-input">
              <input
                type="password"
                placeholder={rec ? 'Nhập key mới để thay thế...' : 'Dán API key vào đây...'}
                value={inputs[provider]}
                onChange={(e) => setInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
              />
              <button className="btn btn-primary" disabled={busy === provider} onClick={() => handleSave(provider)}>
                {busy === provider ? '...' : 'Lưu'}
              </button>
              {rec && (
                <button className="btn btn-secondary" disabled={busy === provider} onClick={() => handleDelete(provider)}>
                  Xoá
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
