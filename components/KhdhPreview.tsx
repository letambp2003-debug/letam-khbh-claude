'use client';

import { useState } from 'react';
import type { KhdhContent, KhdhSection, ActivityBlock } from '@/types/khdh';
import MathText from '@/components/MathText';

function BulletBlock({
  label,
  items,
  isEditing,
  onChange
}: {
  label: string;
  items: string[];
  isEditing?: boolean;
  onChange?: (items: string[]) => void;
}) {
  if (isEditing && onChange) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label} (mỗi ý 1 dòng)</div>
        <textarea
          rows={Math.max(2, items.length)}
          value={items.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          style={{ width: '100%', fontSize: 13 }}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {label && <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>}
      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13.5, marginBottom: 2 }}>
            <MathText text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TextBlock({
  label,
  text,
  isEditing,
  onChange
}: {
  label: string;
  text: string;
  isEditing?: boolean;
  onChange?: (val: string) => void;
}) {
  if (isEditing && onChange) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{label}</div>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', fontSize: 13 }}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 13.5 }}>
        <MathText text={text} />
      </div>
    </div>
  );
}

export default function KhdhPreview({
  content,
  onContentChange
}: {
  content: KhdhContent;
  onContentChange?: (content: KhdhContent) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  function updateBlock(
    secIdx: number,
    blockIdx: number,
    field: keyof ActivityBlock,
    value: any
  ) {
    if (!onContentChange) return;
    const newSections = content.sections.map((sec, sI) => {
      if (sI !== secIdx) return sec;
      const newSubs = sec.subActivities.map((b, bI) => {
        if (bI !== blockIdx) return b;
        return { ...b, [field]: value };
      });
      return { ...sec, subActivities: newSubs };
    });
    onContentChange({ ...content, sections: newSections });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          className={`btn ${isEditing ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: 13, padding: '4px 12px' }}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? '✓ Đã xong chỉnh sửa' : '✏ Chỉnh sửa nhanh KHDH'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div className="muted">
          TRƯỜNG: {content.schoolName || '...'} — TỔ: {content.department || '...'}
        </div>
        <div className="muted">GV: {content.teacherName || '...'}</div>
        {isEditing && onContentChange ? (
          <input
            type="text"
            value={content.lessonTitle}
            onChange={(e) => onContentChange({ ...content, lessonTitle: e.target.value })}
            style={{ fontWeight: 700, fontSize: 20, textAlign: 'center', margin: '8px 0', width: '80%' }}
          />
        ) : (
          <h2 style={{ marginBottom: 4 }}>{content.lessonTitle}</h2>
        )}
        <div className="muted">
          Môn: {content.subject} · Lớp {content.grade} · {content.durationPeriods} tiết · PPCT{' '}
          {content.ppctPeriods} · Tuần {content.week}
        </div>
      </div>

      <div className="section-title">I. Mục tiêu</div>
      <BulletBlock
        label="1. Kiến thức"
        items={content.goals.knowledge}
        isEditing={isEditing}
        onChange={(items) =>
          onContentChange &&
          onContentChange({ ...content, goals: { ...content.goals, knowledge: items } })
        }
      />
      <BulletBlock
        label="2. Năng lực"
        items={content.goals.competencies}
        isEditing={isEditing}
        onChange={(items) =>
          onContentChange &&
          onContentChange({ ...content, goals: { ...content.goals, competencies: items } })
        }
      />
      <BulletBlock
        label="3. Phẩm chất"
        items={content.goals.qualities.map((q) => `${q.name}: ${q.behavior}`)}
      />

      <div className="section-title">II. Thiết bị dạy học và học liệu</div>
      <BulletBlock
        label="1. Giáo viên"
        items={content.equipment.teacher}
        isEditing={isEditing}
        onChange={(items) =>
          onContentChange &&
          onContentChange({ ...content, equipment: { ...content.equipment, teacher: items } })
        }
      />
      <BulletBlock
        label="2. Học sinh"
        items={content.equipment.student}
        isEditing={isEditing}
        onChange={(items) =>
          onContentChange &&
          onContentChange({ ...content, equipment: { ...content.equipment, student: items } })
        }
      />

      <div className="section-title">III. Tiến trình dạy học</div>
      {content.sections.map((section, secIdx) => (
        <div key={secIdx} style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#1a365d' }}>{section.heading}</div>
          {section.subActivities?.map((block, blockIdx) => (
            <div
              key={blockIdx}
              style={{
                border: '1px solid #e2e6ee',
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
                background: '#fafbfe'
              }}
            >
              {section.subActivities.length > 1 && (
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#2b6cb0' }}>{block.heading}</div>
              )}
              <TextBlock
                label="a) Mục tiêu"
                text={block.goal}
                isEditing={isEditing}
                onChange={(val) => updateBlock(secIdx, blockIdx, 'goal', val)}
              />
              <TextBlock
                label="b) Nội dung"
                text={block.content}
                isEditing={isEditing}
                onChange={(val) => updateBlock(secIdx, blockIdx, 'content', val)}
              />
              <TextBlock
                label="c) Sản phẩm"
                text={block.product}
                isEditing={isEditing}
                onChange={(val) => updateBlock(secIdx, blockIdx, 'product', val)}
              />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>d) Tổ chức thực hiện</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>HOẠT ĐỘNG CỦA GV VÀ HS</th>
                    <th style={{ width: '40%' }}>SẢN PHẨM DỰ KIẾN</th>
                  </tr>
                </thead>
                <tbody>
                  {block.steps?.map((step, stepIdx) => (
                    <tr key={stepIdx}>
                      <td>
                        <strong>{step.title}</strong>
                        {isEditing ? (
                          <textarea
                            rows={3}
                            value={step.teacherAndStudent}
                            onChange={(e) => {
                              const newSteps = [...block.steps];
                              newSteps[stepIdx] = { ...step, teacherAndStudent: e.target.value };
                              updateBlock(secIdx, blockIdx, 'steps', newSteps);
                            }}
                            style={{ width: '100%', marginTop: 4, fontSize: 12.5 }}
                          />
                        ) : (
                          <MathText text={step.teacherAndStudent} />
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <textarea
                            rows={3}
                            value={step.expectedProduct}
                            onChange={(e) => {
                              const newSteps = [...block.steps];
                              newSteps[stepIdx] = { ...step, expectedProduct: e.target.value };
                              updateBlock(secIdx, blockIdx, 'steps', newSteps);
                            }}
                            style={{ width: '100%', fontSize: 12.5 }}
                          />
                        ) : (
                          <MathText text={step.expectedProduct} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      <div className="section-title">IV. Hướng dẫn về nhà</div>
      <BulletBlock
        label=""
        items={content.homework}
        isEditing={isEditing}
        onChange={(items) => onContentChange && onContentChange({ ...content, homework: items })}
      />
    </div>
  );
}
