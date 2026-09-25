import type { KhdhContent } from '@/types/khdh';
import type { WorksheetPackage } from '@/types/extended';

/**
 * Chuyển đổi các biểu thức LaTeX đơn giản thành văn bản đẹp mắt dễ đọc khi dán vào Word
 */
function cleanLatexForWord(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$(.*?)\$\$/g, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\times/g, ' × ')
    .replace(/\\cdot/g, ' · ')
    .replace(/\\pm/g, ' ± ')
    .replace(/\\leq/g, ' ≤ ')
    .replace(/\\geq/g, ' ≥ ')
    .replace(/\\neq/g, ' ≠ ')
    .replace(/\\approx/g, ' ≈ ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\degree/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\pi/g, 'π');
}

/**
 * Sinh chuỗi HTML với cấu trúc và style chuẩn Microsoft Word (Times New Roman 13pt, bảng viền 1px, căn lề chuẩn)
 */
export function generateKhdhHtmlForWord(content: KhdhContent): string {
  const title = cleanLatexForWord(content.lessonTitle || 'KẾ HOẠCH BÀI DẠY');

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: 'Times New Roman', serif;
    font-size: 13pt;
    line-height: 1.25;
    color: #000;
  }
  p { margin: 4pt 0; }
  h2, h3, h4 { margin: 8pt 0 4pt 0; font-family: 'Times New Roman', serif; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
  }
  th, td {
    border: 1px solid #000000;
    padding: 6pt 8pt;
    vertical-align: top;
    font-size: 12pt;
    line-height: 1.2;
  }
  th {
    background-color: #d9e2f3;
    font-weight: bold;
    text-align: center;
  }
  ul { margin: 3pt 0; padding-left: 20pt; }
  li { margin-bottom: 2pt; }
</style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 14pt;">
    <p style="margin: 0; font-size: 12pt;">TRƯỜNG: <strong>${content.schoolName || '................................................'}</strong> — TỔ: <strong>${content.department || '................................'}</strong></p>
    <p style="margin: 0; font-size: 12pt;">Họ và tên giáo viên: <strong>${content.teacherName || '................................................'}</strong></p>
    <h2 style="font-size: 16pt; margin: 8pt 0 4pt 0; text-transform: uppercase;">${title}</h2>
    <p style="font-style: italic; font-size: 12pt; margin: 0;">Môn học: ${content.subject} - Lớp ${content.grade} | Thời lượng: ${content.durationPeriods} tiết (PPCT: ${content.ppctPeriods || '...'}) | Tuần: ${content.week || '...'}</p>
  </div>

  <h3 style="font-size: 13pt; text-transform: uppercase;">I. MỤC TIÊU</h3>
  <p><strong>1. Kiến thức:</strong></p>
  <ul>
    ${content.goals.knowledge.map((k) => `<li>${cleanLatexForWord(k)}</li>`).join('')}
  </ul>

  <p><strong>2. Năng lực:</strong></p>
  <ul>
    ${content.goals.competencies.map((c) => `<li>${cleanLatexForWord(c)}</li>`).join('')}
  </ul>

  <p><strong>3. Phẩm chất:</strong></p>
  <ul>
    ${content.goals.qualities.map((q) => `<li><strong>${q.name}:</strong> ${cleanLatexForWord(q.behavior)}</li>`).join('')}
  </ul>

  <h3 style="font-size: 13pt; text-transform: uppercase;">II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h3>
  <p><strong>1. Giáo viên:</strong></p>
  <ul>
    ${content.equipment.teacher.map((t) => `<li>${cleanLatexForWord(t)}</li>`).join('')}
  </ul>
  <p><strong>2. Học sinh:</strong></p>
  <ul>
    ${content.equipment.student.map((s) => `<li>${cleanLatexForWord(s)}</li>`).join('')}
  </ul>

  <h3 style="font-size: 13pt; text-transform: uppercase;">III. TIẾN TRÌNH DẠY HỌC</h3>
`;

  for (const section of content.sections) {
    html += `<h4 style="font-size: 13pt; text-transform: uppercase; margin-top: 12pt;">${section.heading}</h4>`;
    for (const block of section.subActivities ?? []) {
      if ((section.subActivities?.length ?? 0) > 1) {
        html += `<p><strong>${block.heading}</strong></p>`;
      }
      html += `<p><strong>a) Mục tiêu:</strong> ${cleanLatexForWord(block.goal)}</p>`;
      html += `<p><strong>b) Nội dung:</strong> ${cleanLatexForWord(block.content)}</p>`;
      html += `<p><strong>c) Sản phẩm:</strong> ${cleanLatexForWord(block.product)}</p>`;
      html += `<p><strong>d) Tổ chức thực hiện:</strong></p>`;

      html += `<table>
        <thead>
          <tr>
            <th style="width: 60%;">HOẠT ĐỘNG CỦA GV VÀ HS</th>
            <th style="width: 40%;">SẢN PHẨM DỰ KIẾN</th>
          </tr>
        </thead>
        <tbody>`;

      for (const step of block.steps ?? []) {
        html += `<tr>
          <td>
            <p><strong>${step.title}</strong></p>
            <p>${cleanLatexForWord(step.teacherAndStudent).replace(/\n/g, '<br>')}</p>
          </td>
          <td>
            <p>${cleanLatexForWord(step.expectedProduct).replace(/\n/g, '<br>')}</p>
          </td>
        </tr>`;
      }

      html += `</tbody></table>`;
    }
  }

  html += `<h3 style="font-size: 13pt; text-transform: uppercase; margin-top: 12pt;">IV. HƯỚNG DẪN VỀ NHÀ</h3>
  <ul>
    ${content.homework.map((h) => `<li>${cleanLatexForWord(h)}</li>`).join('')}
  </ul>
</body>
</html>`;

  return html;
}

/**
 * Sinh văn bản thuần túy (plain text) làm fallback cho clipboard
 */
export function generateKhdhPlainText(content: KhdhContent): string {
  let text = `TRƯỜNG: ${content.schoolName || '...'} — TỔ: ${content.department || '...'}\n`;
  text += `Họ và tên giáo viên: ${content.teacherName || '...'}\n\n`;
  text += `${content.lessonTitle.toUpperCase()}\n`;
  text += `Môn: ${content.subject} - Lớp ${content.grade} | Thời lượng: ${content.durationPeriods} tiết | Tuần: ${content.week}\n\n`;

  text += `I. MỤC TIÊU\n`;
  text += `1. Kiến thức:\n${content.goals.knowledge.map((k) => ` - ${cleanLatexForWord(k)}`).join('\n')}\n`;
  text += `2. Năng lực:\n${content.goals.competencies.map((c) => ` - ${cleanLatexForWord(c)}`).join('\n')}\n`;
  text += `3. Phẩm chất:\n${content.goals.qualities.map((q) => ` - ${q.name}: ${cleanLatexForWord(q.behavior)}`).join('\n')}\n\n`;

  text += `II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU\n`;
  text += `1. Giáo viên:\n${content.equipment.teacher.map((t) => ` - ${cleanLatexForWord(t)}`).join('\n')}\n`;
  text += `2. Học sinh:\n${content.equipment.student.map((s) => ` - ${cleanLatexForWord(s)}`).join('\n')}\n\n`;

  text += `III. TIẾN TRÌNH DẠY HỌC\n`;
  for (const sec of content.sections) {
    text += `\n${sec.heading}\n`;
    for (const block of sec.subActivities ?? []) {
      text += `a) Mục tiêu: ${cleanLatexForWord(block.goal)}\n`;
      text += `b) Nội dung: ${cleanLatexForWord(block.content)}\n`;
      text += `c) Sản phẩm: ${cleanLatexForWord(block.product)}\n`;
      text += `d) Tổ chức thực hiện:\n`;
      for (const step of block.steps ?? []) {
        text += `  * ${step.title}\n`;
        text += `    - GV và HS: ${cleanLatexForWord(step.teacherAndStudent)}\n`;
        text += `    - Sản phẩm: ${cleanLatexForWord(step.expectedProduct)}\n`;
      }
    }
  }

  text += `\nIV. HƯỚNG DẪN VỀ NHÀ\n`;
  text += content.homework.map((h) => ` - ${cleanLatexForWord(h)}`).join('\n');
  return text;
}

/**
 * Đưa nội dung KHDH vào Clipboard dạng HTML + Plain text để dán trực tiếp vào Word
 */
export async function copyKhdhToWordClipboard(content: KhdhContent): Promise<void> {
  const html = generateKhdhHtmlForWord(content);
  const plainText = generateKhdhPlainText(content);

  if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobText = new Blob([plainText], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      })
    ]);
  } else {
    // Fallback cho trình duyệt cũ
    await navigator.clipboard.writeText(plainText);
  }
}
