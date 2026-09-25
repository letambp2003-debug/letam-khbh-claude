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

export default function ApiKeyModal({ isOpen, onClose, onSave, currentSettings }: ApiKeyModalProps) {
  const [provider, setProvider] = useState<AiProvider>(currentSettings.provider || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(currentSettings.geminiApiKey || '');
  const [claudeApiKey, setClaudeApiKey] = useState(currentSettings.claudeApiKey || '');
  const [teachingMethod, setTeachingMethod] = useState(currentSettings.teachingMethod || TEACHING_METHODS[0]);

  useEffect(() => {
    setProvider(currentSettings.provider || 'gemini');
    setGeminiApiKey(currentSettings.geminiApiKey || '');
    setClaudeApiKey(currentSettings.claudeApiKey || '');
    setTeachingMethod(currentSettings.teachingMethod || TEACHING_METHODS[0]);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  function handleSave() {
    onSave({
      provider,
      geminiApiKey: geminiApiKey.trim(),
      claudeApiKey: claudeApiKey.trim(),
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
          <div style={{ marginBottom: 16, background: '#f7fafc', padding: 12, borderRadius: 8 }}>
            <label className="muted" style={{ fontWeight: 600 }}>
              Google Gemini API Key (tùy chọn nếu server đã có)
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              style={{ width: '100%', marginTop: 4, fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>
              💡 Lấy key miễn phí trong 1 phút tại:{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2454ff', textDecoration: 'underline' }}
              >
                Google AI Studio (Get API Key)
              </a>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16, background: '#f7fafc', padding: 12, borderRadius: 8 }}>
            <label className="muted" style={{ fontWeight: 600 }}>
              Anthropic Claude API Key (tùy chọn nếu server đã có)
            </label>
            <input
              type="password"
              placeholder="sk-ant-api..."
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              style={{ width: '100%', marginTop: 4, fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>
              💡 Lấy key tại:{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2454ff', textDecoration: 'underline' }}
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
