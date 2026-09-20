import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

export interface PpctLesson {
  week: string;
  periods: string;
  title: string;
  requirement: string;
}

export interface PpctParseResult {
  lessons: PpctLesson[];
  warnings: string[];
}

/**
 * Bóc tách bảng Tuần / Tiết / Tên bài học / Yêu cầu cần đạt (YCCĐ) từ file
 * Phụ lục I (.docx). Chuyển docx -> HTML bằng mammoth rồi phân tích bảng
 * bằng cheerio, dò cột theo tên tiêu đề (chấp nhận nhiều cách viết khác
 * nhau của cùng một trường) thay vì giả định thứ tự cột cố định — vì mỗi
 * trường có thể trình bày Phụ lục I hơi khác nhau.
 *
 * Kế thừa nguyên lý đã kiểm thử ở bản V11-2 (../khdh-webapp/lib/parsing).
 */

const HEADER_ALIASES: Record<keyof PpctLesson, RegExp> = {
  week: /tuần/i,
  periods: /tiết/i,
  title: /tên\s*bài|bài\s*học|chủ\s*đề/i,
  requirement: /yêu\s*cầu\s*cần\s*đạt|yccđ|yêu\s*cầu/i
};

function normalizeCell(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function parsePpctDocx(buffer: Buffer): Promise<PpctParseResult> {
  const warnings: string[] = [];
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);

  const tables = $('table').toArray();
  if (tables.length === 0) {
    return {
      lessons: [],
      warnings: ['Không tìm thấy bảng nào trong file. Vui lòng kiểm tra lại định dạng Phụ lục I.']
    };
  }

  const lessons: PpctLesson[] = [];

  for (const table of tables) {
    const rows = $(table).find('tr').toArray();
    if (rows.length < 2) continue;

    const headerCells = $(rows[0])
      .find('th,td')
      .toArray()
      .map((c) => normalizeCell($(c).text()));

    const colIndex: Partial<Record<keyof PpctLesson, number>> = {};
    headerCells.forEach((headerText, idx) => {
      for (const key of Object.keys(HEADER_ALIASES) as Array<keyof PpctLesson>) {
        if (colIndex[key] === undefined && HEADER_ALIASES[key].test(headerText)) {
          colIndex[key] = idx;
        }
      }
    });

    // Bảng này không có đủ cột nhận diện được -> có thể không phải bảng PPCT
    // (ví dụ bảng trang bìa) -> bỏ qua, không báo lỗi.
    if (colIndex.title === undefined) continue;

    for (let r = 1; r < rows.length; r++) {
      const cells = $(rows[r])
        .find('th,td')
        .toArray()
        .map((c) => normalizeCell($(c).text()));
      if (cells.every((c) => c === '')) continue;

      const title = colIndex.title !== undefined ? cells[colIndex.title] ?? '' : '';
      if (!title) continue;

      lessons.push({
        week: colIndex.week !== undefined ? cells[colIndex.week] ?? '' : '',
        periods: colIndex.periods !== undefined ? cells[colIndex.periods] ?? '' : '',
        title,
        requirement: colIndex.requirement !== undefined ? cells[colIndex.requirement] ?? '' : ''
      });
    }
  }

  if (lessons.length === 0) {
    warnings.push(
      'Tìm thấy bảng trong file nhưng không nhận diện được cột "Tên bài học". ' +
        'Vui lòng kiểm tra lại tiêu đề cột hoặc bổ sung bài học thủ công.'
    );
  }
  if (colIndexMissingRequirement(lessons)) {
    warnings.push('Một số dòng thiếu cột "Yêu cầu cần đạt" — hãy bổ sung thủ công nếu cần.');
  }

  return { lessons, warnings };
}

function colIndexMissingRequirement(lessons: PpctLesson[]): boolean {
  return lessons.length > 0 && lessons.some((l) => !l.requirement.trim());
}
