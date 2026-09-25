'use client';

import { useState } from 'react';
import type { NlsMap, SlideDeck, SlideCard } from '@/types/extended';

interface NlsSlideViewProps {
  nlsMap: NlsMap;
  slideDeck: SlideDeck;
}

export default function NlsSlideView({ nlsMap, slideDeck }: NlsSlideViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'slides'>('matrix');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyPrompt(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className={`btn ${activeSubTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('matrix')}
        >
          📊 Ma trận Năng lực - Phẩm chất (NLS Map)
        </button>
        <button
          className={`btn ${activeSubTab === 'slides' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('slides')}
        >
          🖼 Khung kịch bản Slide bài giảng ({slideDeck.slides?.length || 0} slides)
        </button>
      </div>

      {activeSubTab === 'matrix' ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #cbd5e0',
            borderRadius: 8,
            padding: 20,
            overflowX: 'auto'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#1a365d' }}>MA TRẬN NĂNG LỰC - PHẨM CHẤT BÀI HỌC</h3>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              {nlsMap.lessonTitle} · Môn {nlsMap.subject} {nlsMap.grade}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#ebf4ff', color: '#2b6cb0' }}>
                <th style={{ border: '1px solid #cbd5e0', padding: '10px 12px', width: '22%' }}>
                  Tiến trình hoạt động
                </th>
                <th style={{ border: '1px solid #cbd5e0', padding: '10px 12px', width: '25%' }}>
                  Năng lực chung hình thành
                </th>
                <th style={{ border: '1px solid #cbd5e0', padding: '10px 12px', width: '25%' }}>
                  Năng lực đặc thù &amp; Phẩm chất
                </th>
                <th style={{ border: '1px solid #cbd5e0', padding: '10px 12px', width: '28%' }}>
                  Bằng chứng &amp; Công cụ đánh giá
                </th>
              </tr>
            </thead>
            <tbody>
              {nlsMap.matrix.map((row, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ border: '1px solid #cbd5e0', padding: '10px 12px', verticalAlign: 'top' }}>
                    <strong style={{ color: '#1a365d' }}>{row.activityName}</strong>
                  </td>
                  <td style={{ border: '1px solid #cbd5e0', padding: '10px 12px', verticalAlign: 'top' }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {row.generalCompetencies.map((c, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td style={{ border: '1px solid #cbd5e0', padding: '10px 12px', verticalAlign: 'top' }}>
                    <div style={{ marginBottom: 6 }}>
                      <strong style={{ color: '#2b6cb0' }}>Năng lực môn:</strong>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {row.specificCompetencies.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong style={{ color: '#805ad5' }}>Phẩm chất:</strong>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {row.qualities.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </td>
                  <td style={{ border: '1px solid #cbd5e0', padding: '10px 12px', verticalAlign: 'top', color: '#2d3748' }}>
                    🎯 {row.assessmentEvidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {nlsMap.summaryNote && (
            <div
              style={{
                marginTop: 16,
                background: '#fffff0',
                border: '1px solid #fefcbf',
                padding: 12,
                borderRadius: 6,
                fontSize: 13,
                color: '#744210'
              }}
            >
              💡 <strong>Lưu ý khảo thí thường xuyên:</strong> {nlsMap.summaryNote}
            </div>
          )}
        </div>
      ) : (
        /* Danh sách Slide Cards */
        <div>
          <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            💡 Bạn có thể bấm "Sao chép Prompt" để nạp vào Canva, Gamma.app hoặc Microsoft Copilot để thiết kế slide minh
            họa tự động trong vài giây!
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 16
            }}
          >
            {slideDeck.slides.map((slide, sIdx) => {
              const phaseColor =
                slide.phase === 'Khởi động'
                  ? '#dd6b20'
                  : slide.phase === 'Khám phá'
                  ? '#3182ce'
                  : slide.phase === 'Thực hành'
                  ? '#38a169'
                  : '#805ad5';

              return (
                <div
                  key={sIdx}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10
                      }}
                    >
                      <span
                        style={{
                          background: phaseColor,
                          color: '#fff',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        Slide {slide.slideNumber}: {slide.phase}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 10px 0', fontSize: 16, color: '#1a202c' }}>{slide.title}</h4>

                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginBottom: 10 }}>
                      <strong style={{ fontSize: 12, color: '#4a5568' }}>Nội dung trình chiếu:</strong>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: 18, fontSize: 13, color: '#2d3748' }}>
                        {slide.bulletPoints.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>

                    {slide.visualPrompt && (
                      <div
                        style={{
                          background: '#ebf8ff',
                          border: '1px dashed #bee3f8',
                          padding: 10,
                          borderRadius: 6,
                          marginBottom: 10,
                          fontSize: 12
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#2b6cb0', marginBottom: 2 }}>
                          🎨 Prompt hình ảnh minh họa:
                        </div>
                        <div style={{ color: '#2c5282', fontStyle: 'italic', marginBottom: 6 }}>
                          "{slide.visualPrompt}"
                        </div>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => copyPrompt(slide.visualPrompt, sIdx)}
                        >
                          {copiedIndex === sIdx ? '✓ Đã sao chép!' : '📋 Sao chép prompt ảnh'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #edf2f7', paddingTop: 10, fontSize: 12, color: '#4a5568' }}>
                    <div style={{ marginBottom: 4 }}>
                      🗣 <strong>Lời giảng của GV:</strong> <em>{slide.teacherScript}</em>
                    </div>
                    <div>
                      🙋 <strong>Hành động của HS:</strong> {slide.studentAction}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
