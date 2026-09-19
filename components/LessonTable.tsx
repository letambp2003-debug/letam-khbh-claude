'use client';

import type { Lesson } from '@/types/khdh';

export default function LessonTable({
  lessons,
  selectedIndex,
  onSelect,
  onChange
}: {
  lessons: Lesson[];
  selectedIndex: number | null;
  onSelect: (idx: number) => void;
  onChange: (idx: number, field: keyof Lesson, value: string) => void;
}) {
  if (lessons.length === 0) {
    return <p className="muted">Chưa có dữ liệu bài học nào. Hãy tải lên file Phụ lục I / PPCT ở trên.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 34 }}></th>
            <th style={{ width: 70 }}>Tuần</th>
            <th style={{ width: 90 }}>Tiết</th>
            <th style={{ width: '30%' }}>Tên bài học</th>
            <th>Yêu cầu cần đạt (YCCĐ)</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson, idx) => (
            <tr
              key={idx}
              style={{
                background: selectedIndex === idx ? '#eef2ff' : undefined
              }}
            >
              <td style={{ textAlign: 'center' }}>
                <input
                  type="radio"
                  name="lesson-select"
                  checked={selectedIndex === idx}
                  onChange={() => onSelect(idx)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={lesson.week}
                  onChange={(e) => onChange(idx, 'week', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={lesson.periods}
                  onChange={(e) => onChange(idx, 'periods', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => onChange(idx, 'title', e.target.value)}
                />
              </td>
              <td>
                <textarea
                  rows={2}
                  value={lesson.requirement}
                  onChange={(e) => onChange(idx, 'requirement', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
