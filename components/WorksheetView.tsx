'use client';

import { useState } from 'react';
import type { WorksheetPackage, Worksheet, WorksheetTask } from '@/types/extended';
import MathText from '@/components/MathText';

interface WorksheetViewProps {
  packageData: WorksheetPackage;
  onUpdatePackage?: (pkg: WorksheetPackage) => void;
}

export default function WorksheetView({ packageData, onUpdatePackage }: WorksheetViewProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSheet = packageData.sheets[activeSheetIndex] || packageData.sheets[0];

  function handleSheetChange(field: keyof Worksheet, value: any) {
    if (!onUpdatePackage) return;
    const updatedSheets = packageData.sheets.map((s, idx) =>
      idx === activeSheetIndex ? { ...s, [field]: value } : s
    );
    onUpdatePackage({ ...packageData, sheets: updatedSheets });
  }

  function handleTaskChange(taskIndex: number, field: keyof WorksheetTask, value: any) {
    if (!onUpdatePackage) return;
    const updatedTasks = currentSheet.tasks.map((t, idx) =>
      idx === taskIndex ? { ...t, [field]: value } : t
    );
    handleSheetChange('tasks', updatedTasks);
  }

  async function handleExportDocx() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/worksheet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetPackage: packageData })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Có lỗi khi xuất file Word.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PhieuHocTap_${(packageData.lessonTitle || 'BaiHoc').replace(/[^a-zA-Z0-9]+/g, '_')}.docx`;
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

  if (!currentSheet) {
    return <div className="muted">Chưa có dữ liệu Phiếu học tập.</div>;
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {/* Chọn các phiếu */}
        <div style={{ display: 'flex', gap: 8 }}>
          {packageData.sheets.map((sheet, idx) => (
            <button
              key={sheet.id || idx}
              className={`btn ${activeSheetIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13, padding: '6px 14px' }}
              onClick={() => setActiveSheetIndex(idx)}
            >
              Phiếu {sheet.sheetNumber || idx + 1}
            </button>
          ))}
        </div>

        {/* Hành động */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${isEditing ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 13 }}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? '✓ Xong chỉnh sửa' : '✏ Chỉnh sửa phiếu'}
          </button>

          <button className="btn btn-primary" style={{ fontSize: 13 }} disabled={exporting} onClick={handleExportDocx}>
            {exporting && <span className="spinner" />}
            {exporting ? 'Đang tạo file...' : '⬇ Xuất File Word (.docx)'}
          </button>
        </div>
      </div>

      {/* Khung giao diện phiếu học tập */}
      <div
        style={{
          border: '1px solid #cbd5e0',
          borderRadius: 8,
          background: '#fff',
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        {isEditing ? (
          <div style={{ marginBottom: 16 }}>
            <label className="muted" style={{ fontWeight: 600 }}>
              Tiêu đề phiếu:
            </label>
            <input
              type="text"
              value={currentSheet.title}
              onChange={(e) => handleSheetChange('title', e.target.value)}
              style={{ width: '100%', fontWeight: 700, fontSize: 16 }}
            />
            <div style={{ marginTop: 8 }}>
              <label className="muted" style={{ fontWeight: 600 }}>
                Yêu cầu cần đạt / Năng lực:
              </label>
              <input
                type="text"
                value={currentSheet.targetCompetency}
                onChange={(e) => handleSheetChange('targetCompetency', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#1a365d', fontSize: 20 }}>{currentSheet.title}</h3>
            <div className="muted" style={{ marginTop: 4, fontSize: 14 }}>
              Bài học: <strong>{packageData.lessonTitle}</strong> · Môn: {packageData.subject} {packageData.grade}
            </div>
          </div>
        )}

        {/* Khung học sinh */}
        <div
          style={{
            border: '1px dashed #718096',
            borderRadius: 6,
            padding: '10px 16px',
            marginBottom: 20,
            background: '#f8fafc',
            fontSize: 13
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Họ và tên học sinh / Nhóm: ..............................................................</span>
            <span>Lớp: .................</span>
          </div>
          <div style={{ marginTop: 6, color: '#4a5568' }}>
            🎯 <strong>YCCĐ:</strong> {currentSheet.targetCompetency}
          </div>
          <div style={{ marginTop: 4, color: '#4a5568' }}>
            👥 <strong>Hình thức:</strong>{' '}
            {currentSheet.groupMode === 'group'
              ? 'Thảo luận nhóm 4 - 6 học sinh'
              : currentSheet.groupMode === 'pair'
              ? 'Làm việc cặp đôi'
              : 'Làm việc cá nhân'}
          </div>
        </div>

        {/* Danh sách nhiệm vụ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {currentSheet.tasks.map((task, tIdx) => (
            <div
              key={task.id || tIdx}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 16,
                background: '#fafafa'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => handleTaskChange(tIdx, 'title', e.target.value)}
                    style={{ flex: 1, fontWeight: 700, color: '#2b6cb0' }}
                  />
                ) : (
                  <h4 style={{ margin: 0, color: '#2b6cb0', fontSize: 16 }}>{task.title}</h4>
                )}
                <span
                  style={{
                    background: '#edf2f7',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {task.score} điểm
                </span>
              </div>

              {task.instructions && (
                <div style={{ fontStyle: 'italic', color: '#4a5568', marginBottom: 10, fontSize: 13 }}>
                  📌 <strong>Hướng dẫn:</strong> {task.instructions}
                </div>
              )}

              {/* Nội dung câu hỏi/bài tập */}
              {isEditing ? (
                <div>
                  <label className="muted" style={{ fontSize: 12 }}>
                    Nội dung câu hỏi / đề bài (hỗ trợ LaTeX $...$):
                  </label>
                  <textarea
                    rows={3}
                    value={task.questionContent}
                    onChange={(e) => handleTaskChange(tIdx, 'questionContent', e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
              ) : (
                <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #edf2f7' }}>
                  <MathText text={task.questionContent} />
                </div>
              )}

              {/* Vùng gợi ý đáp án cho giáo viên */}
              <div
                style={{
                  marginTop: 12,
                  background: '#f0fff4',
                  border: '1px solid #c6f6d5',
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 13
                }}
              >
                <div style={{ fontWeight: 600, color: '#22543d', marginBottom: 4 }}>💡 Gợi ý đáp án của GV:</div>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={task.suggestedAnswer}
                    onChange={(e) => handleTaskChange(tIdx, 'suggestedAnswer', e.target.value)}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <MathText text={task.suggestedAnswer} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bảng Rubric */}
        {currentSheet.rubric && currentSheet.rubric.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ color: '#1a365d', marginBottom: 10 }}>BẢNG TIÊU CHÍ ĐÁNH GIÁ (RUBRIC)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#edf2f7' }}>
                    <th style={{ border: '1px solid #cbd5e0', padding: '8px 10px', width: '25%' }}>Tiêu chí</th>
                    <th style={{ border: '1px solid #cbd5e0', padding: '8px 10px', width: '25%' }}>Mức Tốt</th>
                    <th style={{ border: '1px solid #cbd5e0', padding: '8px 10px', width: '25%' }}>Mức Đạt</th>
                    <th style={{ border: '1px solid #cbd5e0', padding: '8px 10px', width: '25%' }}>Cần cố gắng</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSheet.rubric.map((r, rIdx) => (
                    <tr key={rIdx}>
                      <td style={{ border: '1px solid #cbd5e0', padding: '8px 10px', fontWeight: 600 }}>{r.criteria}</td>
                      <td style={{ border: '1px solid #cbd5e0', padding: '8px 10px' }}>{r.excellent}</td>
                      <td style={{ border: '1px solid #cbd5e0', padding: '8px 10px' }}>{r.good}</td>
                      <td style={{ border: '1px solid #cbd5e0', padding: '8px 10px' }}>{r.needsImprovement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
