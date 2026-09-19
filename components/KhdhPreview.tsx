'use client';

import type { KhdhContent } from '@/types/khdh';
import MathText from '@/components/MathText';

function BulletBlock({ label, items }: { label: string; items: string[] }) {
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

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 13.5 }}>
        <MathText text={text} />
      </div>
    </div>
  );
}

export default function KhdhPreview({ content }: { content: KhdhContent }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div className="muted">
          TRƯỜNG: {content.schoolName || '...'} — TỔ: {content.department || '...'}
        </div>
        <div className="muted">GV: {content.teacherName || '...'}</div>
        <h2 style={{ marginBottom: 4 }}>{content.lessonTitle}</h2>
        <div className="muted">
          Môn: {content.subject} · Lớp {content.grade} · {content.durationPeriods} tiết · PPCT{' '}
          {content.ppctPeriods} · Tuần {content.week}
        </div>
      </div>

      <div className="section-title">I. Mục tiêu</div>
      <BulletBlock label="1. Kiến thức" items={content.goals.knowledge} />
      <BulletBlock label="2. Năng lực" items={content.goals.competencies} />
      <BulletBlock
        label="3. Phẩm chất"
        items={content.goals.qualities.map((q) => `${q.name}: ${q.behavior}`)}
      />

      <div className="section-title">II. Thiết bị dạy học và học liệu</div>
      <BulletBlock label="1. Giáo viên" items={content.equipment.teacher} />
      <BulletBlock label="2. Học sinh" items={content.equipment.student} />

      <div className="section-title">III. Tiến trình dạy học</div>
      {content.sections.map((section, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{section.heading}</div>
          {section.subActivities?.map((block, j) => (
            <div
              key={j}
              style={{
                border: '1px solid #e2e6ee',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                background: '#fafbfe'
              }}
            >
              {section.subActivities.length > 1 && (
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{block.heading}</div>
              )}
              <TextBlock label="a) Mục tiêu" text={block.goal} />
              <TextBlock label="b) Nội dung" text={block.content} />
              <TextBlock label="c) Sản phẩm" text={block.product} />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>d) Tổ chức thực hiện</div>
              <table>
                <thead>
                  <tr>
                    <th>HOẠT ĐỘNG CỦA GV VÀ HS</th>
                    <th>SẢN PHẨM DỰ KIẾN</th>
                  </tr>
                </thead>
                <tbody>
                  {block.steps?.map((step, k) => (
                    <tr key={k}>
                      <td>
                        <strong>{step.title}</strong>
                        <MathText text={step.teacherAndStudent} />
                      </td>
                      <td>
                        <MathText text={step.expectedProduct} />
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
      <BulletBlock label="" items={content.homework} />
    </div>
  );
}
