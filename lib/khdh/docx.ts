import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign
} from 'docx';
import type { KhdhContent, ActivityBlock } from '@/types/khdh';

const FONT = 'Times New Roman';

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; alignment?: any } = {}) {
  return new Paragraph({
    alignment: opts.alignment,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        font: FONT,
        size: opts.size ?? 24 // 12pt
      })
    ]
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 26 })]
  });
}

function bulletList(items: string[]) {
  return items.map(
    (item) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({ text: item, font: FONT, size: 24 })]
      })
  );
}

/**
 * Chuyển đoạn nội dung có thể chứa khối "TIKZ:" hoặc "PROMPT_ANH:" thành
 * các Paragraph riêng biệt, hiển thị rõ là khối mã / prompt để GV dễ nhận biết
 * và copy sang Overleaf hoặc công cụ tạo ảnh AI.
 */
function contentParagraphs(text: string): Paragraph[] {
  if (!text) return [p('')];
  const lines = text.split(/\n+/);
  const paragraphs: Paragraph[] = [];
  let buffer: string[] = [];
  let mode: 'text' | 'tikz' | 'prompt' = 'text';

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const joined = buffer.join('\n');
    if (mode === 'tikz') {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          shading: { type: ShadingType.SOLID, color: 'F2F2F2', fill: 'F2F2F2' },
          children: [new TextRun({ text: '[Mã TikZ/Overleaf để vẽ hình]', bold: true, italics: true, font: 'Consolas', size: 20 })]
        })
      );
      joined.split('\n').forEach((l) =>
        paragraphs.push(
          new Paragraph({
            shading: { type: ShadingType.SOLID, color: 'F2F2F2', fill: 'F2F2F2' },
            children: [new TextRun({ text: l, font: 'Consolas', size: 20 })]
          })
        )
      );
    } else if (mode === 'prompt') {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          shading: { type: ShadingType.SOLID, color: 'EAF1FF', fill: 'EAF1FF' },
          children: [
            new TextRun({ text: 'Prompt tạo ảnh minh hoạ: ', bold: true, italics: true, font: FONT, size: 22 }),
            new TextRun({ text: joined, italics: true, font: FONT, size: 22 })
          ]
        })
      );
    } else {
      joined.split('\n').forEach((l) => paragraphs.push(p(l)));
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.toUpperCase().startsWith('TIKZ:')) {
      flushBuffer();
      mode = 'tikz';
      buffer.push(line.replace(/^TIKZ:\s*/i, ''));
      continue;
    }
    if (line.toUpperCase().startsWith('PROMPT_ANH:')) {
      flushBuffer();
      mode = 'prompt';
      buffer.push(line.replace(/^PROMPT_ANH:\s*/i, ''));
      continue;
    }
    if (mode !== 'text' && line === '') {
      flushBuffer();
      mode = 'text';
      continue;
    }
    buffer.push(rawLine);
  }
  flushBuffer();

  return paragraphs.length > 0 ? paragraphs : [p(text)];
}

function cellText(text: string, opts: { bold?: boolean; shading?: string } = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading, fill: opts.shading } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: text.split(/\n+/).map(
      (l) =>
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: l, bold: opts.bold, font: FONT, size: 22 })]
        })
    )
  });
}

function activityTable(steps: ActivityBlock['steps']) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cellText('HOẠT ĐỘNG CỦA GV VÀ HS', { bold: true, shading: 'D9E2F3' }),
      cellText('SẢN PHẨM DỰ KIẾN', { bold: true, shading: 'D9E2F3' })
    ]
  });

  const rows = steps.map(
    (step) =>
      new TableRow({
        children: [
          cellText(`${step.title}\n${step.teacherAndStudent}`),
          cellText(step.expectedProduct)
        ]
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '999999' }
    },
    rows: [headerRow, ...rows]
  });
}

function renderActivityBlock(block: ActivityBlock, showHeading: boolean): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  if (showHeading) {
    out.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: block.heading, bold: true, font: FONT, size: 24 })]
      })
    );
  }
  out.push(p('a) Mục tiêu', { bold: true }));
  out.push(...contentParagraphs(block.goal));
  out.push(p('b) Nội dung', { bold: true }));
  out.push(...contentParagraphs(block.content));
  out.push(p('c) Sản phẩm', { bold: true }));
  out.push(...contentParagraphs(block.product));
  out.push(p('d) Tổ chức thực hiện', { bold: true }));
  out.push(activityTable(block.steps ?? []));
  return out;
}

export async function buildKhdhDocxBuffer(content: KhdhContent): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Header trường / tổ
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `TRƯỜNG: ${content.schoolName || '..............................'}`, bold: true, font: FONT, size: 24 })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `TỔ: ${content.department || '..............................'}`, bold: true, font: FONT, size: 24 })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `Họ tên giáo viên: ${content.teacherName || '..............................'}`, font: FONT, size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
      children: [new TextRun({ text: content.lessonTitle?.toUpperCase() || 'BÀI HỌC', bold: true, font: FONT, size: 30 })]
    }),
    p(`Môn học: ${content.subject} – Lớp: ${content.grade}`),
    p(`Thời lượng: ${content.durationPeriods} tiết`),
    p(`PPCT: ${content.ppctPeriods || ''}`),
    p(`Tuần: ${content.week || ''}`)
  );

  // I. MỤC TIÊU
  children.push(heading('I. MỤC TIÊU'));
  children.push(p('1. Kiến thức', { bold: true }));
  children.push(...bulletList(content.goals.knowledge));
  children.push(p('2. Năng lực', { bold: true }));
  children.push(...bulletList(content.goals.competencies));
  children.push(p('3. Phẩm chất', { bold: true }));
  children.push(...bulletList(content.goals.qualities.map((q) => `${q.name}: ${q.behavior}`)));

  // II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
  children.push(heading('II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU'));
  children.push(p('1. Giáo viên', { bold: true }));
  children.push(...bulletList(content.equipment.teacher));
  children.push(p('2. Học sinh', { bold: true }));
  children.push(...bulletList(content.equipment.student));

  // III. TIẾN TRÌNH DẠY HỌC
  children.push(heading('III. TIẾN TRÌNH DẠY HỌC'));
  for (const section of content.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 260, after: 140 },
        children: [new TextRun({ text: section.heading, bold: true, font: FONT, size: 26 })]
      })
    );
    const multi = (section.subActivities?.length ?? 0) > 1;
    for (const block of section.subActivities ?? []) {
      children.push(...renderActivityBlock(block, multi));
    }
  }

  // IV. HƯỚNG DẪN VỀ NHÀ
  children.push(heading('IV. HƯỚNG DẪN VỀ NHÀ'));
  children.push(...bulletList(content.homework));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1418, right: 1134 } // ~2cm/2.5cm theo chuẩn A4 giáo án
          }
        },
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}
