'use client';

import { useRef, useState } from 'react';
import { SUBJECTS, GRADES } from '@/lib/constants';
import LessonTable from '@/components/LessonTable';
import KhdhPreview from '@/components/KhdhPreview';
import type { Lesson, KhdhContent } from '@/types/khdh';

type Step = 'upload' | 'review' | 'preview';

// Vercel giới hạn cứng 4.5MB cho request body của mọi Serverless Function
// (Hobby lẫn Pro) — chặn sớm ở client với ngưỡng an toàn hơn (đa phần
// Phụ lục I dạng .docx/.pdf thuần bảng chữ chỉ vài trăm KB; file to thường do
// nhúng ảnh/nền không cần thiết).
const MAX_UPLOAD_MB = 4;

/** Đọc JSON response an toàn: một số lỗi hạ tầng (413, 502...) trả về HTML/text
 * thay vì JSON, nếu gọi res.json() trực tiếp sẽ ném lỗi parse khó hiểu. */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Máy chủ trả về lỗi không mong đợi (HTTP ${res.status}). Vui lòng thử lại.` };
  }
}

export default function DashboardApp({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [schoolName, setSchoolName] = useState('');
  const [department, setDepartment] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  const [generating, setGenerating] = useState(false);
  const [khdhId, setKhdhId] = useState<string | null>(null);
  const [content, setContent] = useState<KhdhContent | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setWarnings([]);

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_UPLOAD_MB) {
      setError(
        `File "${file.name}" nặng ${sizeMb.toFixed(1)}MB, vượt giới hạn ${MAX_UPLOAD_MB}MB cho phép. ` +
          'Hãy xuất lại Phụ lục I dưới dạng file .docx chỉ chứa bảng chữ (bỏ ảnh nền/ảnh chèn không cần thiết), ' +
          'hoặc tách file theo từng học kỳ rồi tải lên từng phần.'
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', subject);
      formData.append('grade', grade);

      const res = await fetch('/api/ppct/parse', { method: 'POST', body: formData });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi xử lý file.');

      setUploadId(data.uploadId);
      setLessons(data.lessons);
      setWarnings(data.warnings ?? []);
      setSelectedIndex(data.lessons.length > 0 ? 0 : null);
      setStep('review');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onLessonChange(idx: number, field: keyof Lesson, value: string) {
    setLessons((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function addBlankLesson() {
    setLessons((prev) => [...prev, { week: '', periods: '', title: '', requirement: '' }]);
    setSelectedIndex(lessons.length);
  }

  async function handleGenerate() {
    if (selectedIndex === null) return;
    const lesson = lessons[selectedIndex];
    if (!lesson.title.trim()) {
      setError('Vui lòng nhập Tên bài học trước khi tạo KHDH.');
      return;
    }
    setError(null);
    setGenerating(true);
    setContent(null);
    try {
      const periodsCount = (lesson.periods.match(/\d+/g) || ['1']).length || 1;
      const res = await fetch('/api/khdh/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          department,
          teacherName,
          subject,
          grade,
          lessonTitle: lesson.title,
          week: lesson.week,
          ppctPeriods: lesson.periods,
          durationPeriods: periodsCount,
          requirement: lesson.requirement,
          extraNotes,
          ppctUploadId: uploadId
        })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi tạo KHDH.');
      setKhdhId(data.id);
      setContent(data.content);
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport() {
    if (!khdhId && !content) return;
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/khdh/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(khdhId ? { id: khdhId } : { content })
      });
      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data.error || 'Có lỗi khi xuất file Word.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KHDH_${(content?.lessonTitle || 'BaiHoc').replace(/[^a-zA-Z0-9]+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Bước 1 · Chọn Môn học - Khối lớp &amp; nạp dữ liệu PPCT</h2>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label className="muted">Môn học</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="muted">Khối lớp</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Lớp {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={`upload-box${dragOver ? ' dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <span>
              <span className="spinner" style={{ borderTopColor: '#2454ff', marginRight: 8 }} /> Đang bóc
              tách bảng Phụ lục I...
            </span>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Kéo thả file Phụ lục I / PPCT (.docx hoặc .pdf) vào đây
              </div>
              <div className="muted">
                hoặc bấm để chọn file từ máy tính · tối đa {MAX_UPLOAD_MB}MB · ưu tiên .docx để bóc tách chính xác
                nhất
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {warnings.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {warnings.map((w, i) => (
              <div key={i} className="error-box" style={{ background: '#fff8e6', color: '#8a6d00', borderColor: '#f5e2a3' }}>
                ⚠ {w}
              </div>
            ))}
          </div>
        )}

        {uploadId && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => {
              setUploadId(null);
              setLessons([]);
              setSelectedIndex(null);
              setStep('upload');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            ↺ Đặt lại, tải file PPCT khác
          </button>
        )}
      </div>

      {(step === 'review' || step === 'preview') && (
        <div className="card">
          <h2>Bước 2 · Xác nhận danh sách bài học &amp; chọn bài để soạn KHDH</h2>
          <LessonTable
            lessons={lessons}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onChange={onLessonChange}
          />
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addBlankLesson}>
            + Thêm dòng bài học thủ công
          </button>

          <div className="section-title">Thông tin hồ sơ (tuỳ chọn, hiển thị trên KHDH)</div>
          <div className="grid-2">
            <div>
              <label className="muted">Tên trường</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </div>
            <div>
              <label className="muted">Tổ chuyên môn</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="muted">Họ tên giáo viên</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="muted">Ghi chú thêm cho AI (không bắt buộc)</label>
            <textarea
              rows={2}
              placeholder="Ví dụ: nhấn mạnh thí nghiệm thực hành, dùng bối cảnh địa phương..."
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            disabled={selectedIndex === null || generating}
            onClick={handleGenerate}
          >
            {generating && <span className="spinner" />}
            {generating ? 'Đang soạn KHDH bằng AI...' : 'Tạo KHDH (Form V11-2)'}
          </button>
        </div>
      )}

      {step === 'preview' && content && (
        <div className="card">
          <h2>Bước 3 · Xem trước &amp; xuất file Word</h2>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-primary" disabled={exporting} onClick={handleExport}>
              {exporting && <span className="spinner" />}
              {exporting ? 'Đang tạo file...' : '⬇ Xuất File Word (.docx)'}
            </button>
          </div>
          <div style={{ border: '1px solid #e2e6ee', borderRadius: 10, padding: 20, background: '#fff' }}>
            <KhdhPreview content={content} />
          </div>
        </div>
      )}
    </div>
  );
}
