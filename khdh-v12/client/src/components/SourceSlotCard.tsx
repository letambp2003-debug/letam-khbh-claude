import { useRef, useState } from 'react';
import { api, type SourceInfo, type SourceSlot } from '../lib/api';

const SLOT_META: Record<SourceSlot, { label: string; hint: string; accept: string; required: boolean }> = {
  pl1: { label: 'Phụ lục I / PPCT', hint: 'Bắt buộc · .docx', accept: '.docx', required: true },
  sgk: { label: 'Sách giáo khoa (SGK)', hint: 'Bắt buộc · .pdf', accept: '.pdf', required: true },
  khdh_cu: { label: 'KHDH cũ (tham khảo)', hint: 'Tuỳ chọn · .docx hoặc .pdf', accept: '.docx,.pdf', required: false },
  form_to: { label: 'Form mẫu của tổ', hint: 'Tuỳ chọn · .docx hoặc .pdf', accept: '.docx,.pdf', required: false }
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ParsedPreview({ slot, parsed }: { slot: SourceSlot; parsed: any }) {
  if (!parsed) return null;
  if (slot === 'pl1' && Array.isArray(parsed.lessons)) {
    return <div className="muted">Đã bóc tách {parsed.lessons.length} bài học từ bảng PPCT.</div>;
  }
  if (slot === 'sgk' && typeof parsed.pageCount === 'number') {
    return <div className="muted">{parsed.pageCount} trang · {parsed.charCount} ký tự trích xuất.</div>;
  }
  if (typeof parsed.charCount === 'number') {
    return <div className="muted">{parsed.charCount} ký tự trích xuất để tham khảo.</div>;
  }
  return null;
}

export default function SourceSlotCard({
  projectId,
  slot,
  source,
  onChanged
}: {
  projectId: string;
  slot: SourceSlot;
  source: SourceInfo | undefined;
  onChanged: () => void;
}) {
  const meta = SLOT_META[slot];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.uploadSource(projectId, slot, file);
      if (result.warnings?.length) setError(result.warnings.join(' '));
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api.deleteSource(projectId, slot);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="source-slot-card">
      <div className="source-slot-header">
        <strong>{meta.label}</strong>
        <span className={`muted${meta.required ? ' required-hint' : ''}`}>{meta.hint}</span>
      </div>

      {source ? (
        <div className="source-slot-filled">
          <div>📄 {source.fileName} · {formatSize(source.sizeBytes)}</div>
          <ParsedPreview slot={slot} parsed={source.parsed} />
          {source.warnings?.length > 0 && (
            <div className="warn-box" style={{ marginTop: 6 }}>
              {source.warnings.join(' ')}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
              Thay file khác
            </button>{' '}
            <button className="btn btn-secondary" disabled={busy} onClick={handleDelete}>
              Xoá
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Đang tải lên...' : '⬆ Chọn file'}
        </button>
      )}

      {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept={meta.accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
