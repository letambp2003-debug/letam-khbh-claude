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
  VerticalAlign,
  ImportedXmlComponent,
  LineRuleType
} from 'docx';
import type { KhdhContent, ActivityBlock } from '@/types/khdh';
import { parseContentBlocks, parseInlineMath, isStandaloneDisplayMathLine } from './content';
import { tryLatexToOmmlXml } from './mathOmml';

// ===== Chuẩn trình bày: tiết kiệm giấy khi in, đúng thể thức văn bản =====
// - Font Times New Roman 13pt cho thân bài (cỡ phổ biến trong văn bản hành
//   chính/giáo án tại Việt Nam), 12pt trong bảng để nén nội dung.
// - Giãn dòng đơn (single line spacing), không giãn đoạn quá tay.
// - Lề trang theo khổ A4 có chừa lề đóng file: trái 3cm, phải 2cm, trên/dưới 2cm.
const FONT = 'Times New Roman';
const BODY_SIZE = 26; // 13pt
const TABLE_SIZE = 24; // 12pt
const LINE_SINGLE = { line: 276, lineRule: LineRuleType.AUTO }; // ~1.15 dòng, đọc dễ mà không tốn giấy
const PARA_SPACING_AFTER = 100; // 5pt sau mỗi đoạn thường
const HEADING_SPACING = { before: 200, after: 100 };

function importedRoot(xml: string) {
  // `.root` được khai báo protected trong types của docx, nhưng
  // fromXmlString() luôn trả về 1 node bọc (rootKey=undefined) chứa đúng 1
  // phần tử con là node XML thật sự cần dùng làm ParagraphChild.
  return (ImportedXmlComponent.fromXmlString(xml) as any).root[0];
}

/** Bọc 1 công thức LaTeX thành OMML để chèn NGUYÊN SINH vào Word (không phải ảnh, không phải text LaTeX thô). */
function mathInlineNode(latex: string): TextRun | any {
  const result = tryLatexToOmmlXml(latex);
  if (result.ok && result.ommlXml) {
    return importedRoot(result.ommlXml);
  }
  // Fallback an toàn: nếu công thức lỗi cú pháp, không làm hỏng cả file — hiển thị
  // nguyên văn kèm cảnh báo để giáo viên tự sửa, thay vì chặn xuất file.
  console.warn('Không chuyển được LaTeX sang OMML:', latex, result.error);
  return new TextRun({ text: `[CÔNG THỨC LỖI: ${latex}]`, italics: true, color: 'C00000', font: FONT, size: BODY_SIZE });
}

function mathDisplayParagraph(latex: string): Paragraph {
  const result = tryLatexToOmmlXml(latex);
  if (result.ok && result.ommlXml) {
    const omathPara = importedRoot(`<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${result.ommlXml}</m:oMathPara>`);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: PARA_SPACING_AFTER, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
      children: [omathPara]
    });
  }
  console.warn('Không chuyển được LaTeX (display) sang OMML:', latex, result.error);
  return p(`[CÔNG THỨC LỖI: ${latex}]`, { italics: true, alignment: AlignmentType.CENTER });
}

function p(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number; alignment?: any; color?: string } = {}
) {
  return new Paragraph({
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
    spacing: { after: PARA_SPACING_AFTER, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
        font: FONT,
        size: opts.size ?? BODY_SIZE
      })
    ]
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { ...HEADING_SPACING, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
    // color đen tường minh: đè lên màu xanh mặc định của style "Heading" trong
    // Word, giữ đúng thể thức văn bản hành chính (in đen trắng không bị xám).
    children: [new TextRun({ text, bold: true, font: FONT, size: 28, color: '000000' })]
  });
}

function bulletList(items: string[]) {
  if (items.length === 0) return [p('')];
  return items.flatMap((item) => lineToParagraph(item, { bullet: true }));
}

/** Dựng 1 Paragraph từ 1 dòng văn bản có thể chứa công thức $...$ xen kẽ. */
function lineToParagraph(line: string, opts: { bullet?: boolean } = {}): Paragraph[] {
  if (line.trim() === '') return [];

  // Dòng chỉ gồm đúng 1 công thức khối $$...$$ -> tách thành 1 đoạn công thức
  // căn giữa riêng, không gộp bullet/justify để đúng chuẩn trình bày công thức.
  const standalone = isStandaloneDisplayMathLine(line);
  if (standalone) {
    return [mathDisplayParagraph(standalone.latex)];
  }

  const tokens = parseInlineMath(line);
  const children = tokens.map((t) =>
    t.type === 'text'
      ? new TextRun({ text: t.value, font: FONT, size: BODY_SIZE })
      : mathInlineNode(t.latex)
  );

  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PARA_SPACING_AFTER, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
      bullet: opts.bullet ? { level: 0 } : undefined,
      children
    })
  ];
}

/**
 * Chuyển 1 đoạn nội dung thô (có thể chứa nhiều dòng, khối TikZ, khối prompt
 * ảnh, công thức inline/display) thành danh sách Paragraph/Table để chèn vào
 * Word — dùng chung 1 bộ phân tích với phần preview (lib/khdh/content.ts).
 */
function contentNodes(text: string): (Paragraph | Table)[] {
  const blocks = parseContentBlocks(text);
  const nodes: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.type === 'text') {
      for (const line of block.lines) {
        nodes.push(...lineToParagraph(line));
      }
    } else if (block.type === 'tikz') {
      nodes.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          shading: { type: ShadingType.SOLID, color: 'F2F2F2', fill: 'F2F2F2' },
          children: [
            new TextRun({ text: 'Mã TikZ/Overleaf để vẽ hình (dán vào Overleaf để biên dịch):', bold: true, italics: true, font: 'Consolas', size: 20 })
          ]
        })
      );
      for (const l of block.code.split('\n')) {
        nodes.push(
          new Paragraph({
            spacing: { after: 20, line: 240, lineRule: LineRuleType.AUTO },
            shading: { type: ShadingType.SOLID, color: 'F2F2F2', fill: 'F2F2F2' },
            children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 20 })]
          })
        );
      }
    } else if (block.type === 'image_prompt') {
      nodes.push(
        new Paragraph({
          spacing: { before: 60, after: PARA_SPACING_AFTER },
          shading: { type: ShadingType.SOLID, color: 'EAF1FF', fill: 'EAF1FF' },
          children: [
            new TextRun({ text: 'Prompt tạo ảnh minh hoạ: ', bold: true, italics: true, font: FONT, size: 22 }),
            new TextRun({ text: block.prompt, italics: true, font: FONT, size: 22 })
          ]
        })
      );
    }
  }

  return nodes.length > 0 ? nodes : [p('')];
}

function cellParagraphs(text: string, opts: { bold?: boolean } = {}): Paragraph[] {
  const blocks = parseContentBlocks(text);
  const out: Paragraph[] = [];
  for (const block of blocks) {
    if (block.type === 'text') {
      for (const line of block.lines) {
        if (line.trim() === '') continue;
        const standalone = isStandaloneDisplayMathLine(line);
        if (standalone) {
          out.push(mathDisplayParagraph(standalone.latex));
          continue;
        }
        const tokens = parseInlineMath(line);
        out.push(
          new Paragraph({
            spacing: { after: 40, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
            children: tokens.map((t) =>
              t.type === 'text'
                ? new TextRun({ text: t.value, bold: opts.bold, font: FONT, size: TABLE_SIZE })
                : mathInlineNode(t.latex)
            )
          })
        );
      }
    } else if (block.type === 'tikz') {
      out.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `[Mã TikZ]: ${block.code.split('\n')[0]}...`, italics: true, font: 'Consolas', size: 18 })]
        })
      );
    } else if (block.type === 'image_prompt') {
      out.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `[Prompt ảnh]: ${block.prompt}`, italics: true, font: FONT, size: TABLE_SIZE })]
        })
      );
    }
  }
  return out.length > 0 ? out : [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: TABLE_SIZE })] })];
}

function cellText(text: string, opts: { bold?: boolean; shading?: string } = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading, fill: opts.shading } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: cellParagraphs(text, { bold: opts.bold })
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

  const rows = steps.map((step) => {
    const leftParas = [
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: step.title, bold: true, font: FONT, size: TABLE_SIZE })]
      }),
      ...cellParagraphs(step.teacherAndStudent)
    ];
    return new TableRow({
      children: [
        new TableCell({
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          children: leftParas
        }),
        cellText(step.expectedProduct)
      ]
    });
  });

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
        spacing: { before: 160, after: 80, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
        children: [new TextRun({ text: block.heading, bold: true, font: FONT, size: BODY_SIZE })]
      })
    );
  }
  out.push(p('a) Mục tiêu', { bold: true }));
  out.push(...contentNodes(block.goal));
  out.push(p('b) Nội dung', { bold: true }));
  out.push(...contentNodes(block.content));
  out.push(p('c) Sản phẩm', { bold: true }));
  out.push(...contentNodes(block.product));
  out.push(p('d) Tổ chức thực hiện', { bold: true }));
  out.push(activityTable(block.steps ?? []));
  return out;
}

export async function buildKhdhDocxBuffer(content: KhdhContent): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Header trường / tổ
  children.push(
    new Paragraph({
      spacing: { line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
      children: [new TextRun({ text: `TRƯỜNG: ${content.schoolName || '..............................'}`, bold: true, font: FONT, size: BODY_SIZE })]
    }),
    new Paragraph({
      spacing: { after: 120, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
      children: [new TextRun({ text: `TỔ: ${content.department || '..............................'}`, bold: true, font: FONT, size: BODY_SIZE })]
    }),
    new Paragraph({
      spacing: { after: 120, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
      children: [new TextRun({ text: `Họ tên giáo viên: ${content.teacherName || '..............................'}`, font: FONT, size: BODY_SIZE })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 160, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
      children: [new TextRun({ text: content.lessonTitle?.toUpperCase() || 'BÀI HỌC', bold: true, font: FONT, size: 32 })]
    }),
    p(`Môn học: ${content.subject} – Lớp: ${content.grade}`, { alignment: AlignmentType.LEFT }),
    p(`Thời lượng: ${content.durationPeriods} tiết`, { alignment: AlignmentType.LEFT }),
    p(`PPCT: ${content.ppctPeriods || ''}`, { alignment: AlignmentType.LEFT }),
    p(`Tuần: ${content.week || ''}`, { alignment: AlignmentType.LEFT })
  );

  // I. MỤC TIÊU
  children.push(heading('I. MỤC TIÊU'));
  children.push(p('1. Kiến thức', { bold: true, alignment: AlignmentType.LEFT }));
  children.push(...bulletList(content.goals.knowledge));
  children.push(p('2. Năng lực', { bold: true, alignment: AlignmentType.LEFT }));
  children.push(...bulletList(content.goals.competencies));
  children.push(p('3. Phẩm chất', { bold: true, alignment: AlignmentType.LEFT }));
  children.push(...bulletList(content.goals.qualities.map((q) => `${q.name}: ${q.behavior}`)));

  // II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
  children.push(heading('II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU'));
  children.push(p('1. Giáo viên', { bold: true, alignment: AlignmentType.LEFT }));
  children.push(...bulletList(content.equipment.teacher));
  children.push(p('2. Học sinh', { bold: true, alignment: AlignmentType.LEFT }));
  children.push(...bulletList(content.equipment.student));

  // III. TIẾN TRÌNH DẠY HỌC
  children.push(heading('III. TIẾN TRÌNH DẠY HỌC'));
  for (const section of content.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100, line: LINE_SINGLE.line, lineRule: LINE_SINGLE.lineRule },
        children: [new TextRun({ text: section.heading, bold: true, font: FONT, size: 28 })]
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
          run: { font: FONT, size: BODY_SIZE }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            // Khổ A4, lề chuẩn thể thức văn bản: trái 3cm (chừa đóng file),
            // phải/trên/dưới 2cm — tiết kiệm giấy hơn mức lề "an toàn" thường thấy.
            margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 },
            size: { width: 11906, height: 16838 } // A4 (twips)
          }
        },
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}
