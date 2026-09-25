'use client';

import { useState, useEffect } from 'react';
import type { UserAiSettings, AiProvider } from '@/types/extended';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: UserAiSettings) => void;
  currentSettings: UserAiSettings;
}

export const TEACHING_METHODS = [
  'Dạy học tích cực (lấy học sinh làm trung tâm)',
  'Dạy học giải quyết vấn đề (Problem-based Learning)',
  'Phương pháp Bàn tay nặn bột (Inquiry-based)',
  'Dạy học định hướng giáo dục STEM / STEAM',
  'Dạy học theo dự án (Project-based Learning)',
  'Kỹ thuật các mảnh ghép & Khăn trải bàn',
  'Dạy học phân hóa theo đối tượng học sinh'
];

export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Khuyên dùng - Nhanh & ổn định)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Thế hệ mới nhất)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Bản chuẩn)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Phân tích sâu sắc)' },
  { value: 'gemini-pro', label: 'Gemini 1.0 Pro (Tương thích mọi tài khoản Google cũ)' }
];

export default function ApiKeyModal({ isOpen, onClose, onSave, currentSettings }: ApiKeyModalProps) {
  const [provider, setProvider] = useState<AiProvider>(currentSettings.provider || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(currentSettings.geminiApiKey || '');
  const [claudeApiKey, setClaudeApiKey] = useState(currentSettings.claudeApiKey || '');
  const [geminiModel, setGeminiModel] = useState(currentSettings.geminiModel || 'gemini-2.0-flash');
  const [teachingMethod, setTeachingMethod] = useState(currentSettings.teachingMethod || TEACHING_METHODS[0]);

  useEffect(() => {
    setProvider(currentSettings.provider || 'gemini');
    setGeminiApiKey(currentSettings.geminiApiKey || '');
    setClaudeApiKey(currentSettings.claudeApiKey || '');
    setGeminiModel(currentSettings.geminiModel || 'gemini-2.0-flash');
    setTeachingMethod(currentSettings.teachingMethod || TEACHING_METHODS[0]);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  function handleSave() {
    onSave({
      provider,
      geminiApiKey: geminiApiKey.trim(),
      claudeApiKey: claudeApiKey.trim(),
      geminiModel,
      teachingMethod
    });
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 580,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#1a365d' }}>⚙ Cài đặt Mô hình AI &amp; Phương pháp Sư phạm</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#718096'
            }}
          >
            ✕
          </button>
        </div>

        <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
          Bạn có thể cấu hình API Key cá nhân để sử dụng không giới hạn tốc độ và hạn mức. Khóa được lưu trực tiếp tại
          trình duyệt của bạn.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Chọn nhà cung cấp AI ưu tiên</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label
              style={{
                flex: 1,
                padding: '10px 14px',
                border: provider === 'gemini' ? '2px solid #2454ff' : '1px solid #e2e8f0',
                borderRadius: 8,
                background: provider === 'gemini' ? '#ebf8ff' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <input
                type="radio"
                name="ai_provider"
                checked={provider === 'gemini'}
                onChange={() => setProvider('gemini')}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Google Gemini (Khuyên dùng)</div>
                <div className="muted" style={{ fontSize: 12 }}>Rất nhanh, miễn phí từ Google AI Studio</div>
              </div>
            </label>

            <label
              style={{
                flex: 1,
                padding: '10px 14px',
                border: provider === 'claude' ? '2px solid #2454ff' : '1px solid #e2e8f0',
                borderRadius: 8,
                background: provider === 'claude' ? '#ebf8ff' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <input
                type="radio"
                name="ai_provider"
                checked={provider === 'claude'}
                onChange={() => setProvider('claude')}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Anthropic Claude</div>
                <div className="muted" style={{ fontSize: 12 }}>Văn phong sư phạm sâu sắc</div>
              </div>
            </label>
          </div>
        </div>

        {provider === 'gemini' ? (
          <div style={{ marginBottom: 16, background: '#f7fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontWeight: 600, color: '#1a202c', fontSize: 13 }}>
                Google Gemini API Key (nhập 1 hoặc nhiều key)
              </label>
              {(() => {
                const count = geminiApiKey.split(/[\n,;\s]+/).filter((k) => k.trim().length > 5).length;
                return count > 0 ? (
                  <span style={{ fontSize: 12, background: '#e6fffa', color: '#234e52', padding: '2px 8px', borderRadius: 10, fontWeight: 700, border: '1px solid #b2f5ea' }}>
                    ✓ Đã nhận {count} key (Tự động luân chuyển)
                  </span>
                ) : null;
              })()}
            </div>
            <textarea
              rows={4}
              placeholder={`Thầy/cô có thể dán 1 hoặc NHIỀU API Key tại đây (mỗi key 1 dòng hoặc cách nhau bởi dấu phẩy):\nAIzaSyA...\nAIzaSyB...\nAIzaSyC...`}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600, color: '#334155', fontSize: 13, display: 'block', marginBottom: 4 }}>
                Phiên bản mô hình Google Gemini
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                Hệ thống luôn tích hợp sẵn cơ chế tự động thử model thay thế (2.5 → 2.0 → 1.5 → Pro) nếu model được chọn gặp lỗi 404 không khả dụng.
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#4a5568', marginTop: 10, lineHeight: 1.5 }}>
              ⚡ <strong>Chế độ dự phòng thông minh:</strong> Khi nhập nhiều key, hệ thống sẽ tự động chuyển sang key tiếp theo nếu một key chạm ngưỡng giới hạn (429 / Quota Exceeded), giúp giáo án luôn được tạo trọn vẹn.<br />
              💡 Lấy key miễn phí không giới hạn trong 1 phút tại:{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2454ff', textDecoration: 'underline', fontWeight: 600 }}
              >
                Google AI Studio (Get API Key)
              </a>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16, background: '#f7fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontWeight: 600, color: '#1a202c', fontSize: 13 }}>
                Anthropic Claude API Key (nhập 1 hoặc nhiều key)
              </label>
              {(() => {
                const count = claudeApiKey.split(/[\n,;\s]+/).filter((k) => k.trim().length > 5).length;
                return count > 0 ? (
                  <span style={{ fontSize: 12, background: '#e6fffa', color: '#234e52', padding: '2px 8px', borderRadius: 10, fontWeight: 700, border: '1px solid #b2f5ea' }}>
                    ✓ Đã nhận {count} key (Tự động luân chuyển)
                  </span>
                ) : null;
              })()}
            </div>
            <textarea
              rows={4}
              placeholder={`Dán 1 hoặc NHIỀU Claude API Key (mỗi key 1 dòng hoặc cách nhau bởi dấu phẩy):\nsk-ant-api03-...\nsk-ant-api03-...`}
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
            <div style={{ fontSize: 12, color: '#4a5568', marginTop: 6, lineHeight: 1.5 }}>
              ⚡ Hỗ trợ nhiều key xoay vòng tự động khi hết hạn mức.<br />
              💡 Lấy key tại:{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2454ff', textDecoration: 'underline', fontWeight: 600 }}
              >
                Anthropic Console
              </a>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Phương pháp sư phạm định hướng cho AI
          </label>
          <select
            value={teachingMethod}
            onChange={(e) => setTeachingMethod(e.target.value)}
            style={{ width: '100%', padding: '8px 12px' }}
          >
            {TEACHING_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            AI sẽ điều chỉnh hoạt động học tập và phiếu bài tập bám sát phương pháp này.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
