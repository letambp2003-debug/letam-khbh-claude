import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import type { Lesson, PpctParseResult } from '@/types/khdh';

/**
 * Bóc tách bảng Phụ lục I / PPCT từ file .docx hoặc .pdf.
 *
 * Chiến lược: nhận diện cột theo TIÊU ĐỀ (Tuần, Tiết, Tên bài học / Chủ đề,
 * Yêu cầu cần đạt), không phụ thuộc thứ tự cột cố định, để chấp nhận nhiều
 * biến thể mẫu Phụ lục I giữa các trường/tổ chuyên môn. Nếu không khớp được
 * tiêu đề, sẽ dùng suy luận theo vị trí cột (Tuần, Tiết, Bài học, YCCĐ).
 */

const HEADER_ALIASES: Record<keyof Omit<Lesson, never>, string[]> = {
  week: ['tuần', 'tuan'],
  periods: ['tiết', 'tiet', 'ppct'],
  title: ['tên bài học', 'ten bai hoc', 'bài học', 'bai hoc', 'chủ đề', 'chu de', 'nội dung', 'noi dung'],
  requirement: ['yêu cầu cần đạt', 'yeu cau can dat', 'yccđ', 'yccd']
};

function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

function matchHeader(cell: string): keyof Lesson | null {
  const plain = stripDiacritics(cell);
  for (const key of Object.keys(HEADER_ALIASES) as (keyof Lesson)[]) {
    if (HEADER_ALIASES[key].some((alias) => plain.includes(stripDiacritics(alias)))) {
      return key;
    }
  }
  return null;
}

function parseHtmlTables(html: string): { lessons: Lesson[]; warnings: string[] } {
  const $ = cheerio.load(html);
  const lessons: Lesson[] = [];
  const warnings: string[] = [];

  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    if (rows.length < 2) return;

    // Tìm dòng tiêu đề: dòng có >= 2 cột khớp alias
    let headerRowIdx = -1;
    let colMap: (keyof Lesson | null)[] = [];
    for (let r = 0; r < Math.min(rows.length, 4); r++) {
      const cells = $(rows[r])
        .find('th,td')
        .toArray()
        .map((c) => normalize($(c).text()));
      const mapped = cells.map(matchHeader);
      const matchedCount = mapped.filter(Boolean).length;
      if (matchedCount >= 2) {
        headerRowIdx = r;
        colMap = mapped;
        break;
      }
    }

    if (headerRowIdx === -1) {
      // Fallback: giả định thứ tự cột chuẩn Tuần|Tiết|Tên bài học|YCCĐ khi có đúng 4 cột trở lên
      const firstCells = $(rows[0]).find('th,td').toArray();
      if (firstCells.length >= 4) {
        colMap = ['week', 'periods', 'title', 'requirement'];
        headerRowIdx = 0;
        warnings.push(
          'Không nhận diện được tiêu đề cột theo tên; đã dùng thứ tự mặc định Tuần-Tiết-Tên bài học-YCCĐ. Vui lòng kiểm tra lại bảng sau khi bóc tách.'
        );
      } else {
        return;
      }
    }

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const cells = $(rows[r])
        .find('th,td')
        .toArray()
        .map((c) => normalize($(c).text()));
      if (cells.every((c) => !c)) continue;

      const lesson: Partial<Lesson> = { week: '', periods: '', title: '', requirement: '' };
      colMap.forEach((key, idx) => {
        if (key && cells[idx]) {
          lesson[key] = ((lesson[key] as string) ? lesson[key] + ' ' : '') + cells[idx];
        }
      });
      if (lesson.title) {
        lessons.push({
          week: lesson.week ?? '',
          periods: lesson.periods ?? '',
          title: lesson.title ?? '',
          requirement: lesson.requirement ?? ''
        });
      }
    }
  });

  return { lessons, warnings };
}

export async function parsePpctDocx(buffer: Buffer): Promise<PpctParseResult> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const { lessons, warnings } = parseHtmlTables(html);

  if (lessons.length === 0) {
    warnings.push(
      'Không tìm thấy bảng PPCT hợp lệ trong file .docx. Hãy kiểm tra file có đúng định dạng bảng Phụ lục I (có cột Tuần/Tiết/Tên bài học/YCCĐ) không.'
    );
  }

  return { subject: '', grade: '', lessons, warnings };
}

export async function parsePpctPdf(buffer: Buffer): Promise<PpctParseResult> {
  // pdf-parse chỉ trả text thô (không giữ cấu trúc bảng), nên ta suy luận theo dòng.
  const pdfParseModule: any = await import('pdf-parse');
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const data = await pdfParse(buffer);
  const rawLines: string[] = data.text
    .split('\n')
    .map((l: string) => normalize(l))
    .filter((l: string) => l.length > 0);

  const lessons: Lesson[] = [];
  const warnings: string[] = [
    'File PDF không giữ cấu trúc bảng như .docx, hệ thống đã suy luận theo dòng văn bản. Vui lòng kiểm tra kỹ và chỉnh sửa dữ liệu Tuần/Tiết/Tên bài học/YCCĐ trước khi tạo KHDH. Khuyến nghị dùng file .docx gốc để có độ chính xác cao nhất.'
  ];

  // Heuristic: một dòng PPCT hợp lệ thường bắt đầu bằng số tuần và có chứa số tiết,
  // ví dụ: "1  1,2  Đơn thức và đa thức nhiều biến  Nhận biết được..."
  const lineRegex = /^(\d{1,2})\s+([\d,\-–\s]+?)\s{2,}(.+)$/;

  for (const line of rawLines) {
    const match = line.match(lineRegex);
    if (match) {
      const [, week, periods, rest] = match;
      // Tách tiêu đề bài học và YCCĐ nếu có khoảng cách lớn (>=2 space) giữa 2 phần
      const parts = rest.split(/\s{2,}/);
      lessons.push({
        week,
        periods: periods.trim(),
        title: parts[0]?.trim() ?? rest.trim(),
        requirement: parts.slice(1).join(' ').trim()
      });
    }
  }

  if (lessons.length === 0) {
    warnings.push(
      'Không tự động bóc tách được dòng PPCT nào từ PDF. Vui lòng thêm thủ công ở bảng bên dưới hoặc tải lên file .docx thay thế.'
    );
  }

  return { subject: '', grade: '', lessons, warnings };
}

export async function parsePpctFile(fileName: string, buffer: Buffer): Promise<PpctParseResult> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.docx')) {
    return parsePpctDocx(buffer);
  }
  if (lower.endsWith('.pdf')) {
    return parsePpctPdf(buffer);
  }
  throw new Error('Định dạng file không được hỗ trợ. Vui lòng tải lên file .docx hoặc .pdf.');
}
