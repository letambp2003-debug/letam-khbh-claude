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

export default function DashboardApp({ userEmail }: { userEmail: string }) {
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

  // Tải cài đặt từ localStorage khi mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('khdh_user_settings');
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
      localStorage.setItem('khdh_user_settings', JSON.stringify(newSettings));
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

  // Sinh KHDH
  async function handleGenerateKhdh() {
    if (!selectedLesson) return;
    if (!selectedLesson.title.trim()) {
      setError('Vui lòng nhập Tên bài học trước khi tạo KHDH.');
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
          customApiKey:
            userSettings.provider === 'gemini'
              ? userSettings.geminiApiKey
              : userSettings.claudeApiKey,
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
      {/* Nút cài đặt trên góc phải */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowSettingsModal(true)}
        >
          <span>⚙ Cài đặt AI &amp; Phương pháp</span>
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
              setContent(null);
              setWorksheetPackage(null);
              setNlsMap(null);
              setSlideDeck(null);
              setQuizPackage(null);
              setStep('upload');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            ↺ Đặt lại, tải file PPCT khác
          </button>
        )}
      </div>

      {/* BƯỚC 2: CHỌN BÀI HỌC */}
      {(step === 'review' || step === 'preview') && (
        <div className="card">
          <h2>Bước 2 · Xác nhận danh sách bài học &amp; chọn bài để triển khai</h2>
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

          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              disabled={selectedIndex === null || generatingKhdh}
              onClick={handleGenerateKhdh}
            >
              {generatingKhdh && <span className="spinner" />}
              {generatingKhdh ? 'Đang soạn KHDH...' : '📄 Soạn KHDH (Form V11-2)'}
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
