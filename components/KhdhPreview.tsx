'use client';

import type { KhdhContent } from '@/types/khdh';

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5 }}>{text}</div>
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
      <Block label="1. Kiến thức" text={content.goals.knowledge.map((k) => `• ${k}`).join('\n')} />
      <Block label="2. Năng lực" text={content.goals.competencies.map((k) => `• ${k}`).join('\n')} />
      <Block
        label="3. Phẩm chất"
        text={content.goals.qualities.map((q) => `• ${q.name}: ${q.behavior}`).join('\n')}
      />

      <div className="section-title">II. Thiết bị dạy học và học liệu</div>
      <Block label="1. Giáo viên" text={content.equipment.teacher.map((k) => `• ${k}`).join('\n')} />
      <Block label="2. Học sinh" text={content.equipment.student.map((k) => `• ${k}`).join('\n')} />

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
              <Block label="a) Mục tiêu" text={block.goal} />
              <Block label="b) Nội dung" text={block.content} />
              <Block label="c) Sản phẩm" text={block.product} />
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
                        <div style={{ whiteSpace: 'pre-wrap' }}>{step.teacherAndStudent}</div>
                      </td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{step.expectedProduct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      <div className="section-title">IV. Hướng dẫn về nhà</div>
      <Block label="" text={content.homework.map((k) => `• ${k}`).join('\n')} />
    </div>
  );
}
