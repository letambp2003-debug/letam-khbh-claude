'use client';

import { useRef, useState, useEffect } from 'react';
import { SUBJECTS, GRADES } from '@/lib/constants';
import LessonTable from '@/components/LessonTable';
import KhdhPreview from '@/components/KhdhPreview';
import WorksheetView from '@/components/WorksheetView';
import NlsSlideView from '@/components/NlsSlideView';
import InteractiveQuizGame from '@/components/InteractiveQuizGame';
import ApiKeyModal, { TEACHING_METHODS } from '@/components/ApiKeyModal';
import type { Lesson, KhdhContent } from '@/types/khdh';
import type { WorksheetPackage, NlsMap, SlideDeck, QuizPackage, UserAiSettings } from '@/types/extended';

type Step = 'upload' | 'review' | 'preview';
type ActiveTab = 'khdh' | 'worksheet' | 'nls_slide' | 'quiz';

const MAX_UPLOAD_MB = 4;

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Máy chủ trả về lỗi không mong đợi (HTTP ${res.status}). Vui lòng thử lại.` };
  }
}

export default function DashboardApp({ userEmail = 'Giáo viên' }: { userEmail?: string }) {
  const [step, setStep] = useState<Step>('upload');
  const [activeTab, setActiveTab] = useState<ActiveTab>('khdh');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Dữ liệu Bước 1 & Bước 2
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [schoolName, setSchoolName] = useState('');
  const [department, setDepartment] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  // Dữ liệu KHDH
  const [generatingKhdh, setGeneratingKhdh] = useState(false);
  const [khdhId, setKhdhId] = useState<string | null>(null);
  const [content, setContent] = useState<KhdhContent | null>(null);
  const [exportingKhdh, setExportingKhdh] = useState(false);

  // Dữ liệu Phiếu học tập
  const [worksheetPackage, setWorksheetPackage] = useState<WorksheetPackage | null>(null);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);

  // Dữ liệu Ma trận NLS & Slide
  const [nlsMap, setNlsMap] = useState<NlsMap | null>(null);
  const [slideDeck, setSlideDeck] = useState<SlideDeck | null>(null);
  const [generatingNlsSlide, setGeneratingNlsSlide] = useState(false);

  // Dữ liệu Ngân hàng câu hỏi & Trò chơi
  const [quizPackage, setQuizPackage] = useState<QuizPackage | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  // Cài đặt AI & Phương pháp
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userSettings, setUserSettings] = useState<UserAiSettings>({
    provider: 'gemini',
    teachingMethod: TEACHING_METHODS[0]
  });

  // Tải cài đặt từ sessionStorage khi mount (tự hủy hoàn toàn khi đóng tab)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('khdh_session_settings');
      if (saved) {
        setUserSettings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  function handleSaveSettings(newSettings: UserAiSettings) {
    setUserSettings(newSettings);
    try {
      sessionStorage.setItem('khdh_session_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  }

  const selectedLesson = selectedIndex !== null ? lessons[selectedIndex] : null;

  async function handleFile(file: File) {
    setError(null);
    setWarnings([]);

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_UPLOAD_MB) {
      setError(
        `File "${file.name}" nặng ${sizeMb.toFixed(1)}MB, vượt giới hạn ${MAX_UPLOAD_MB}MB cho phép. ` +
          'Hãy xuất lại Phụ lục I dưới dạng file .docx chỉ chứa bảng chữ, ' +
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

      const cleanWarnings = Array.from(new Set(data.warnings ?? [])) as string[];
      setUploadId(data.uploadId);
      setLessons(data.lessons || []);
      setWarnings(cleanWarnings);

      if (data.lessons && data.lessons.length > 0) {
        setSelectedIndex(0);
        setStep('review');
      } else {
        setSelectedIndex(null);
        setError('Không nhận diện được dòng bài học nào từ file này. Thầy/cô vui lòng kiểm tra lại file hoặc chuyển sang mục "Dán văn bản / Bảng PPCT" để dán trực tiếp.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handlePasteParse() {
    if (!pasteText.trim()) {
      setError('Vui lòng nhập hoặc dán nội dung danh sách bài học.');
      return;
    }
    setError(null);
    setWarnings([]);
    setUploading(true);
    try {
      const res = await fetch('/api/ppct/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText, subject, grade })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi xử lý dữ liệu.');

      const cleanWarnings = Array.from(new Set(data.warnings ?? [])) as string[];
      setUploadId(data.uploadId);
      setLessons(data.lessons || []);
      setWarnings(cleanWarnings);

      if (data.lessons && data.lessons.length > 0) {
        setSelectedIndex(0);
        setStep('review');
      } else {
        setSelectedIndex(null);
        setError('Không nhận diện được bài học nào. Thầy/cô hãy định dạng mỗi dòng 1 bài hoặc copy các dòng từ bảng Excel/Word dán vào.');
      }
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

  // Sinh KHDH
  async function handleGenerateKhdh() {
    if (!selectedLesson) {
      setError('Thầy/cô vui lòng chọn 1 dòng bài học từ bảng danh sách bên trên trước khi soạn KHDH.');
      return;
    }
    if (!selectedLesson.title.trim()) {
      setError('Vui lòng nhập Tên bài học trước khi tạo KHDH.');
      return;
    }

    const currentApiKey =
      userSettings.provider === 'gemini'
        ? userSettings.geminiApiKey?.trim()
        : userSettings.claudeApiKey?.trim();

    if (!currentApiKey) {
      setError('Thầy/cô vui lòng nạp ít nhất một API Key để bắt đầu soạn giáo án.');
      setShowSettingsModal(true);
      return;
    }

    setError(null);
    setGeneratingKhdh(true);
    setContent(null);
    try {
      const periodsCount = (selectedLesson.periods.match(/\d+/g) || ['1']).length || 1;
      const res = await fetch('/api/khdh/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          department,
          teacherName,
          subject,
          grade,
          lessonTitle: selectedLesson.title,
          week: selectedLesson.week,
          ppctPeriods: selectedLesson.periods,
          durationPeriods: periodsCount,
          requirement: selectedLesson.requirement,
          extraNotes,
          ppctUploadId: uploadId,
          provider: userSettings.provider,
          customApiKey: currentApiKey,
          teachingMethod: userSettings.teachingMethod
        })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi tạo KHDH.');
      setKhdhId(data.id);
      setContent(data.content);
      setStep('preview');
      setActiveTab('khdh');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingKhdh(false);
    }
  }

  // Sinh Phiếu học tập
  async function handleGenerateWorksheet() {
    if (!selectedLesson) return;
    setError(null);
    setGeneratingWorksheet(true);
    try {
      const periodsCount = (selectedLesson.periods.match(/\d+/g) || ['1']).length || 1;
      const res = await fetch('/api/worksheet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          lessonTitle: selectedLesson.title,
          requirement: selectedLesson.requirement,
          durationPeriods: periodsCount,
          provider: userSettings.provider,
          customApiKey:
            userSettings.provider === 'gemini'
              ? userSettings.geminiApiKey
              : userSettings.claudeApiKey,
          teachingMethod: userSettings.teachingMethod
        })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi tạo Phiếu học tập.');
      setWorksheetPackage(data.worksheetPackage);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingWorksheet(false);
    }
  }

  // Sinh Ma trận NLS & Slide
  async function handleGenerateNlsSlide() {
    if (!selectedLesson) return;
    setError(null);
    setGeneratingNlsSlide(true);
    try {
      const periodsCount = (selectedLesson.periods.match(/\d+/g) || ['1']).length || 1;
      const res = await fetch('/api/nls-slide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          lessonTitle: selectedLesson.title,
          requirement: selectedLesson.requirement,
          durationPeriods: periodsCount,
          provider: userSettings.provider,
          customApiKey:
            userSettings.provider === 'gemini'
              ? userSettings.geminiApiKey
              : userSettings.claudeApiKey,
          teachingMethod: userSettings.teachingMethod
        })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi tạo Ma trận & Slide.');
      setNlsMap(data.nlsMap);
      setSlideDeck(data.slideDeck);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingNlsSlide(false);
    }
  }

  // Sinh Ngân hàng câu hỏi & Trò chơi
  async function handleGenerateQuiz() {
    if (!selectedLesson) return;
    setError(null);
    setGeneratingQuiz(true);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          lessonTitle: selectedLesson.title,
          requirement: selectedLesson.requirement,
          provider: userSettings.provider,
          customApiKey:
            userSettings.provider === 'gemini'
              ? userSettings.geminiApiKey
              : userSettings.claudeApiKey
        })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi tạo Ngân hàng câu hỏi & Trò chơi.');
      setQuizPackage(data.quizPackage);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingQuiz(false);
    }
  }

  // Xuất KHDH sang Word
  async function handleExportKhdh() {
    if (!khdhId && !content) return;
    setExportingKhdh(true);
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
      setExportingKhdh(false);
    }
  }

  return (
    <div>
      {/* Nút cài đặt và chỉ báo trạng thái trên góc phải */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              background: '#e6fffa',
              color: '#234e52',
              border: '1px solid #b2f5ea',
              padding: '3px 10px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            🔒 Không gian riêng tư (Tab độc lập)
          </span>
          <span
            style={{
              background: '#fefcbf',
              color: '#744210',
              border: '1px solid #faf089',
              padding: '3px 10px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            ⚡ Token cao: 8,192 (Xuất trọn vẹn)
          </span>
        </div>

        <button
          className="btn btn-secondary"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowSettingsModal(true)}
        >
          <span>⚙ Cài đặt API Key &amp; Phương pháp</span>
          <span
            style={{
              background: '#ebf8ff',
              color: '#2b6cb0',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700
            }}
          >
            {userSettings.provider === 'gemini' ? 'Gemini AI' : 'Claude AI'}
          </span>
        </button>
      </div>

      <div
        style={{
          background: '#f0fff4',
          border: '1px solid #c6f6d5',
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          color: '#22543d',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span>💡</span>
        <span>
          <strong>Dùng ngay không cần đăng nhập:</strong> Dữ liệu chỉ xử lý trong phiên làm việc hiện tại của bạn. Cùng lúc nhiều thầy/cô cùng dùng hoàn toàn độc lập, không ai thấy dữ liệu của ai. Khi đóng tab, toàn bộ nội dung sẽ tự động xóa sạch.
        </span>
      </div>

      <ApiKeyModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        currentSettings={userSettings}
      />

      {error && <div className="error-box">{error}</div>}

      {/* BƯỚC 1: TẢI FILE */}
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

        {/* Toggle hình thức nạp PPCT */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={inputMode === 'upload' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6 }}
            onClick={() => setInputMode('upload')}
          >
            📁 Tải file (.docx hoặc .pdf)
          </button>
          <button
            type="button"
            className={inputMode === 'paste' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6 }}
            onClick={() => setInputMode('paste')}
          >
            📋 Dán nội dung / Bảng PPCT trực tiếp
          </button>
        </div>

        {inputMode === 'upload' ? (
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
                  hoặc bấm để chọn file từ máy tính · tối đa {MAX_UPLOAD_MB}MB · ưu tiên .docx để bóc tách chính xác nhất
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
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <label className="muted" style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#334155' }}>
              Dán danh sách bài học (Copy từ bảng Excel, Word hoặc văn bản tự do):
            </label>
            <textarea
              rows={5}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}
              placeholder={`Thầy/cô có thể copy trực tiếp các hàng từ Excel/Word và dán vào đây, ví dụ:\nBài 1. Mệnh đề toán học\t3\tTuần 1\nBài 2. Tập hợp và các phép toán\t4\tTuần 2, 3\n\nHoặc mỗi dòng 1 bài học:\nBài 1. Căn bậc hai - 3 tiết - Tuần 1\nBài 2. Căn bậc ba - 2 tiết - Tuần 2`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={uploading || !pasteText.trim()}
                onClick={handlePasteParse}
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {uploading ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: '#fff', marginRight: 4 }} /> Đang xử lý...
                  </>
                ) : (
                  '⚡ Bóc tách danh sách bài học'
                )}
              </button>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {warnings.map((w, i) => (
              <div key={i} className="error-box" style={{ background: '#fffbeb', color: '#92400e', borderColor: '#fde68a', marginBottom: 8, fontSize: 13 }}>
                💡 {w}
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
              setContent(null);
              setWorksheetPackage(null);
              setNlsMap(null);
              setSlideDeck(null);
              setQuizPackage(null);
              setStep('upload');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            ↺ Đặt lại, nạp lại dữ liệu PPCT khác
          </button>
        )}
      </div>

      {/* BƯỚC 2: CHỌN BÀI HỌC */}
      {(step === 'review' || step === 'preview') && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Bước 2 · Xác nhận danh sách bài học &amp; chọn bài để triển khai</h2>
            <span style={{ fontSize: 13, background: '#e6fffa', color: '#234e52', padding: '3px 12px', borderRadius: 14, fontWeight: 600, border: '1px solid #b2f5ea' }}>
              ✓ Đã nạp {lessons.length} bài học
            </span>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#1e40af' }}>
            💡 <strong>Lưu ý:</strong> Cột <em>Yêu cầu cần đạt (YCCĐ)</em> có thể để trống. Khi tạo KHDH, AI sẽ tự động tra cứu chuẩn kiến thức – năng lực môn {subject} lớp {grade} theo <strong>Chương trình GDPT 2018</strong> của Bộ GD&amp;ĐT. Thầy/cô có thể sửa trực tiếp nội dung trong bảng nếu cần.
          </div>

          <LessonTable
            lessons={lessons}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onChange={onLessonChange}
          />
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addBlankLesson}>
            + Thêm dòng bài học thủ công
          </button>

          <div className="section-title">Thông tin hồ sơ giáo viên (hiển thị trên bìa giáo án)</div>
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
            <label className="muted">Ghi chú thêm cho AI</label>
            <textarea
              rows={2}
              placeholder="Ví dụ: áp dụng phương pháp dạy học STEM, gắn với bài toán thực tế nông nghiệp..."
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
            />
          </div>

          {/* Trạng thái API Key hiện tại */}
          {(() => {
            const rawKey = userSettings.provider === 'gemini' ? userSettings.geminiApiKey : userSettings.claudeApiKey;
            const keyCount = (rawKey || '').split(/[\n,;\s]+/).filter((k) => k.trim().length > 5).length;
            const providerName = userSettings.provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude';

            return keyCount > 0 ? (
              <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚡</span>
                  <span><strong>AI Model:</strong> {providerName} · <strong>Đã nạp:</strong> <span style={{ background: '#dcfce7', padding: '2px 8px', borderRadius: 10, fontWeight: 700, color: '#15803d' }}>{keyCount} API Key</span> (Cơ chế xoay vòng &amp; dự phòng khi chạm 429 đang bật)</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setShowSettingsModal(true)}
                >
                  ⚙ Thêm / Đổi Key
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#92400e' }}>
                  ⚠️ <strong>Chưa nạp API Key:</strong> Thầy/cô cần nạp ít nhất 1 API Key để AI bắt đầu soạn bài (hỗ trợ dán nhiều key cùng lúc).
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={() => setShowSettingsModal(true)}
                >
                  🔑 Nạp API Key ngay
                </button>
              </div>
            );
          })()}

          {/* Hiển thị lỗi ngay tại vị trí nút bấm */}
          {error && (
            <div className="error-box" style={{ marginTop: 12, fontSize: 13 }}>
              ❌ {error}
            </div>
          )}

          {/* Hiển thị trạng thái đang soạn bài */}
          {generatingKhdh && (
            <div style={{ marginTop: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1e40af', fontWeight: 600 }}>
                <span className="spinner" style={{ borderTopColor: '#2563eb' }} />
                <span>Đang điều phối AI soạn Kế hoạch dạy học theo chuẩn Công văn 5512...</span>
              </div>
              <div style={{ fontSize: 12, color: '#1e40af', marginTop: 4, lineHeight: 1.4 }}>
                Hệ thống đang xuất chi tiết 100% nội dung (chế độ token cao 8,192). Quá trình này thường mất khoảng 25-45 giây, thầy/cô vui lòng đợi trong giây lát...
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              disabled={generatingKhdh}
              onClick={handleGenerateKhdh}
              style={{ fontSize: 15, padding: '10px 22px', fontWeight: 600 }}
            >
              {generatingKhdh ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff', marginRight: 8 }} />
                  Đang soạn KHDH...
                </>
              ) : (
                '📄 Soạn KHDH (Form V11-2)'
              )}
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 3: HỆ THỐNG PHÂN HỆ ĐẦY ĐỦ (MULTI-TAB WORKSPACE) */}
      {(step === 'preview' || content || worksheetPackage || nlsMap || quizPackage) && (
        <div className="card">
          <h2>Bước 3 · Không gian Triển khai Bộ tài liệu Đầy đủ</h2>

          {/* Thanh Tab Chuyển Phân Hệ */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: 8,
              marginBottom: 20,
              flexWrap: 'wrap'
            }}
          >
            <button
              className={`btn ${activeTab === 'khdh' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 14, padding: '8px 16px' }}
              onClick={() => setActiveTab('khdh')}
            >
              📄 1. Kế hoạch bài dạy (KHDH 5512)
            </button>

            <button
              className={`btn ${activeTab === 'worksheet' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 14, padding: '8px 16px' }}
              onClick={() => setActiveTab('worksheet')}
            >
              📝 2. Phiếu học tập (Worksheet) {worksheetPackage ? '✓' : ''}
            </button>

            <button
              className={`btn ${activeTab === 'nls_slide' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 14, padding: '8px 16px' }}
              onClick={() => setActiveTab('nls_slide')}
            >
              📊 3. Ma trận NLS &amp; Slide {nlsMap ? '✓' : ''}
            </button>

            <button
              className={`btn ${activeTab === 'quiz' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 14, padding: '8px 16px' }}
              onClick={() => setActiveTab('quiz')}
            >
              🎮 4. Trò chơi &amp; Câu hỏi {quizPackage ? '✓' : ''}
            </button>
          </div>

          {/* PHÂN HỆ 1: KHDH 5512 */}
          {activeTab === 'khdh' && (
            <div>
              {content ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <button className="btn btn-primary" disabled={exportingKhdh} onClick={handleExportKhdh}>
                      {exportingKhdh && <span className="spinner" />}
                      {exportingKhdh ? 'Đang tạo file Word...' : '⬇ Xuất File Word (.docx) KHDH'}
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e6ee', borderRadius: 10, padding: 20, background: '#fff' }}>
                    <KhdhPreview content={content} onContentChange={setContent} />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 8 }}>
                  <p className="muted" style={{ marginBottom: 14 }}>
                    Chưa tạo Kế hoạch dạy học cho bài học này.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={generatingKhdh || selectedIndex === null}
                    onClick={handleGenerateKhdh}
                  >
                    {generatingKhdh && <span className="spinner" />}
                    {generatingKhdh ? 'Đang soạn KHDH...' : '⚡ Bấm để Tạo KHDH (Chuẩn 5512)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHÂN HỆ 2: PHIẾU HỌC TẬP (WORKSHEETS) */}
          {activeTab === 'worksheet' && (
            <div>
              {worksheetPackage ? (
                <WorksheetView packageData={worksheetPackage} onUpdatePackage={setWorksheetPackage} />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 8 }}>
                  <p className="muted" style={{ marginBottom: 14 }}>
                    Hệ thống sẽ tự động thiết kế 3 Phiếu học tập (Khám phá kiến thức, Luyện tập nhóm, Vận dụng thực tế)
                    kèm gợi ý đáp án và bảng rubric chấm điểm cho bài này.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={generatingWorksheet || selectedIndex === null}
                    onClick={handleGenerateWorksheet}
                  >
                    {generatingWorksheet && <span className="spinner" />}
                    {generatingWorksheet ? 'Đang tạo hệ thống Phiếu học tập...' : '⚡ Tạo Hệ thống Phiếu học tập'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHÂN HỆ 3: MA TRẬN NLS & SLIDE PROMPTS */}
          {activeTab === 'nls_slide' && (
            <div>
              {nlsMap && slideDeck ? (
                <NlsSlideView nlsMap={nlsMap} slideDeck={slideDeck} />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 8 }}>
                  <p className="muted" style={{ marginBottom: 14 }}>
                    Tự động phân rã Ma trận Năng lực - Phẩm chất theo 4 hoạt động và gợi ý bộ Slide bài giảng (kèm prompt
                    tạo ảnh cho Canva/PowerPoint).
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={generatingNlsSlide || selectedIndex === null}
                    onClick={handleGenerateNlsSlide}
                  >
                    {generatingNlsSlide && <span className="spinner" />}
                    {generatingNlsSlide ? 'Đang phân tích Ma trận & Slide...' : '⚡ Tạo Ma trận NLS & Kịch bản Slide'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHÂN HỆ 4: NGÂN HÀNG CÂU HỎI & TRÒ CHƠI LỚP HỌC */}
          {activeTab === 'quiz' && (
            <div>
              {quizPackage ? (
                <InteractiveQuizGame quizPackage={quizPackage} />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 8 }}>
                  <p className="muted" style={{ marginBottom: 14 }}>
                    Tạo ngân hàng 8-10 câu hỏi trắc nghiệm 4 mức độ tư duy kèm chế độ Trò chơi tương tác / Vòng quay bốc
                    thăm để giáo viên trình chiếu trên lớp học.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={generatingQuiz || selectedIndex === null}
                    onClick={handleGenerateQuiz}
                  >
                    {generatingQuiz && <span className="spinner" />}
                    {generatingQuiz ? 'Đang sinh bộ câu hỏi & mini game...' : '⚡ Tạo Ngân hàng câu hỏi & Trò chơi'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
