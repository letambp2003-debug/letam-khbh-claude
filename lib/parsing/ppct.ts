import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import type { Lesson, PpctParseResult } from '@/types/khdh';

/**
 * Bóc tách bảng Phụ lục I / PPCT từ file .docx, .pdf hoặc văn bản dán trực tiếp.
 *
 * Chiến lược:
 * 1. Nhận diện các cột tiêu đề theo chuẩn Công văn 5512 (STT, Tên bài học / Chủ đề,
 *    Số tiết / Thời lượng, Thời điểm / Tuần thực hiện, Yêu cầu cần đạt, Thiết bị...).
 * 2. Tự động nhận diện và bỏ qua các bảng phi PPCT (danh sách giáo viên, thiết bị,
 *    phòng bộ môn, bảng kiểm tra đánh giá định kỳ) để tránh lẫn lộn dữ liệu rác.
 * 3. Hỗ trợ quét tìm hàng tiêu đề trong tối đa 10 hàng đầu tiên (xử lý các bảng có
 *    hàng tiêu đề gộp/tiêu đề học kỳ).
 * 4. Tự động loại bỏ các cảnh báo trùng lặp (deduplicate warnings).
 */

const COLUMN_PATTERNS: Record<keyof Lesson | 'stt', string[]> = {
  title: [
    'ten bai hoc', 'bai hoc', 'ten bai', 'chu de', 'noi dung bai hoc',
    'noi dung day hoc', 'noi dung', 'ten chuyen de', 'chuyen de',
    'ten bai day', 'bai day', 'ten bai hoc/chu de', 'bai hoc/chu de',
    'chu de/bai hoc', 'bai'
  ],
  periods: [
    'so tiet', 'thoi luong', 'thoi luong (tiet)', 'thoi luong(tiet)',
    'tiet ppct', 'so tiet thuc hien', 'ppct', 'tiet'
  ],
  week: [
    'thoi diem', 'thoi diem (tuan)', 'thoi diem(tuan)', 'thoi diem thuc hien',
    'tuan thuc hien', 'thoi gian thuc hien', 'tuan/tiet', 'tuan', 'thoi gian'
  ],
  requirement: [
    'yeu cau can dat', 'yccd', 'chuan kien thuc', 'muc tieu', 'yeu cau'
  ],
  stt: [
    'stt', 'so tt', 'so thu tu', 'tt'
  ]
};

const NON_PPCT_INDICATORS = [
  'ho va ten', 'chuc vu', 'mon day', 'to chuyen mon', 'ban giam hieu',
  'ten thiet bi', 'so luong', 'phong hoc bo mon', 'bai kiem tra',
  'hinh thuc kiem tra', 'ma de', 'phan cong giang day'
];

function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

function matchColumnType(headerText: string): keyof Lesson | 'stt' | null {
  const plain = stripDiacritics(normalize(headerText));
  if (!plain) return null;

  for (const [type, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const pat of patterns) {
      if (
        plain === pat ||
        plain.startsWith(pat + ' ') ||
        plain.endsWith(' ' + pat) ||
        plain.includes('(' + pat) ||
        plain.includes(pat)
      ) {
        return type as keyof Lesson | 'stt';
      }
    }
  }
  return null;
}

function isLikelyNonPpctTable(headers: string[]): boolean {
  const rowText = stripDiacritics(headers.join(' '));
  return NON_PPCT_INDICATORS.some((ind) => rowText.includes(ind));
}

function parseHtmlTables(html: string): { lessons: Lesson[]; warnings: string[] } {
  const $ = cheerio.load(html);
  const lessons: Lesson[] = [];
  const rawWarnings: string[] = [];

  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    if (rows.length < 2) return;

    // Quét tối đa 10 hàng đầu để tìm hàng tiêu đề thực sự
    let headerRowIdx = -1;
    let colMap: (keyof Lesson | 'stt' | null)[] = [];
    let detectedTitle = false;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const cellTexts = $(rows[r])
        .find('th,td')
        .toArray()
        .map((c) => normalize($(c).text()));

      // Nếu chỉ có 1 cell gộp thì bỏ qua dòng này (tiêu đề văn bản)
      if (cellTexts.length < 2) continue;

      // Nếu bảng chứa thông tin cán bộ/thiết bị/kiểm tra thì bỏ qua cả bảng
      if (isLikelyNonPpctTable(cellTexts)) {
        return;
      }

      const types = cellTexts.map(matchColumnType);
      const hasTitle = types.includes('title');
      const matchedMeaningful = types.filter((t) => t && t !== 'stt').length;

      if (hasTitle || matchedMeaningful >= 2) {
        headerRowIdx = r;
        colMap = types;
        detectedTitle = hasTitle;
        break;
      }
    }

    // Nếu không khớp tiêu đề nào, kiểm tra xem bảng có phải bảng rác không
    if (headerRowIdx === -1) {
      return;
    }

    // Nếu chưa nhận diện được cột Title nhưng có các cột khác, chọn cột có độ dài chuỗi trung bình lớn nhất
    if (!detectedTitle) {
      let maxLen = 0;
      let titleColIdx = -1;
      for (let c = 0; c < colMap.length; c++) {
        if (colMap[c] === 'stt' || colMap[c] === 'periods' || colMap[c] === 'week') continue;
        let totalLen = 0;
        let count = 0;
        for (let r = headerRowIdx + 1; r < Math.min(rows.length, headerRowIdx + 6); r++) {
          const text = $(rows[r]).find('th,td').eq(c).text().trim();
          totalLen += text.length;
          count++;
        }
        const avg = count > 0 ? totalLen / count : 0;
        if (avg > maxLen && avg > 4) {
          maxLen = avg;
          titleColIdx = c;
        }
      }
      if (titleColIdx !== -1) {
        colMap[titleColIdx] = 'title';
      } else {
        return;
      }
    }

    // Bóc tách từng hàng bài học
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const cells = $(rows[r])
        .find('th,td')
        .toArray()
        .map((c) => normalize($(c).text()));

      if (cells.every((c) => !c)) continue;

      const item: Lesson = { week: '', periods: '', title: '', requirement: '' };
      colMap.forEach((type, idx) => {
        const val = cells[idx] || '';
        if (type === 'title') {
          item.title = val;
        } else if (type === 'periods') {
          item.periods = val;
        } else if (type === 'week') {
          item.week = val;
        } else if (type === 'requirement') {
          item.requirement = val;
        }
      });

      // Lọc bỏ hàng lặp tiêu đề trên đầu trang hoặc hàng tổng kết số tiết
      const plainTitle = stripDiacritics(item.title);
      if (
        !item.title ||
        item.title.length < 2 ||
        plainTitle === 'bai hoc' ||
        plainTitle === 'ten bai hoc' ||
        plainTitle === 'chu de' ||
        plainTitle.startsWith('tong so tiet') ||
        plainTitle.startsWith('tong cong')
      ) {
        continue;
      }

      lessons.push(item);
    }
  });

  const warnings = Array.from(new Set(rawWarnings));
  return { lessons, warnings };
}

export async function parsePpctDocx(buffer: Buffer): Promise<PpctParseResult> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const { lessons, warnings } = parseHtmlTables(html);

  if (lessons.length === 0) {
    warnings.push(
      'Không tìm thấy bảng bài học hợp lệ trong file .docx. Bạn có thể dán trực tiếp danh sách bài học hoặc kiểm tra lại file.'
    );
  }

  return { subject: '', grade: '', lessons, warnings };
}

export async function parsePpctPdf(buffer: Buffer): Promise<PpctParseResult> {
  const pdfParseModule: any = await import('pdf-parse');
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const data = await pdfParse(buffer);
  const rawLines: string[] = data.text
    .split('\n')
    .map((l: string) => normalize(l))
    .filter((l: string) => l.length > 0);

  const lessons: Lesson[] = [];
  const warnings: string[] = [];

  // Mẫu 1: Dòng bắt đầu bằng Tuần rồi Tiết: "1  1,2  Tên bài học  YCCĐ..."
  const pattern1 = /^(\d{1,2})\s+([\d,\-–\s]+?)\s{2,}(.+)$/;
  // Mẫu 2: Dòng bắt đầu bằng STT rồi Tên bài học rồi Số tiết: "1.  Bài 1: Tên bài  2 tiết  Tuần 1"
  const pattern2 = /^(\d{1,3})[\.\)]?\s+([^\d]+?)\s+(\d{1,2})\s*(?:tiết)?\s*(?:tuần\s*)?(\d{1,2}[\d,\-–\s]*)?$/i;

  for (const line of rawLines) {
    const m1 = line.match(pattern1);
    if (m1) {
      const [, week, periods, rest] = m1;
      const parts = rest.split(/\s{2,}/);
      lessons.push({
        week,
        periods: periods.trim(),
        title: parts[0]?.trim() ?? rest.trim(),
        requirement: parts.slice(1).join(' ').trim()
      });
      continue;
    }

    const m2 = line.match(pattern2);
    if (m2 && m2[2].trim().length > 3) {
      lessons.push({
        week: m2[4] ? 'Tuần ' + m2[4].trim() : '',
        periods: m2[3]?.trim() ?? '',
        title: m2[2]?.trim() ?? '',
        requirement: ''
      });
    }
  }

  if (lessons.length === 0) {
    warnings.push(
      'File PDF dạng văn bản scan/ảnh hoặc bố cục phức tạp không bóc tách tự động được. Khuyến nghị dùng file Word (.docx) gốc hoặc sử dụng mục "Dán văn bản / Danh sách bài học" bên dưới.'
    );
  }

  return { subject: '', grade: '', lessons, warnings };
}

/**
 * Bóc tách danh sách bài học từ văn bản dán trực tiếp (từ Excel, Word hoặc văn bản tự do).
 */
export function parsePpctText(rawText: string): PpctParseResult {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const lessons: Lesson[] = [];

  for (const line of lines) {
    // Trường hợp 1: Dán từ bảng Excel / Word (các cột cách nhau bằng ký tự Tab '\t')
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 2) {
        // Mẫu: STT \t Tên bài \t Số tiết \t Tuần \t YCCĐ
        if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
          lessons.push({
            week: parts[3] || '',
            periods: parts[2] || '',
            title: parts[1] || '',
            requirement: parts[4] || ''
          });
          continue;
        }
        // Mẫu: Tuần \t Tiết \t Tên bài \t YCCĐ
        if (parts.length >= 3 && (/^tuần/i.test(parts[0]) || /^\d+$/.test(parts[0]))) {
          lessons.push({
            week: parts[0] || '',
            periods: parts[1] || '',
            title: parts[2] || '',
            requirement: parts[3] || ''
          });
          continue;
        }
        // Mẫu: Tên bài \t Số tiết \t Tuần
        lessons.push({
          week: parts[2] || '',
          periods: parts[1] || '',
          title: parts[0] || '',
          requirement: parts[3] || ''
        });
        continue;
      }
    }

    // Trường hợp 2: Dòng văn bản thông thường (ví dụ: "Bài 1. Tên bài - 2 tiết - Tuần 1")
    const match = line.match(/^(\d+[\.\)]\s*)?([^\(\d\-–\t]+(?:[\w\s\p{L}]+))(?:\s*[\(\-–]\s*(\d+)\s*tiết)?(?:\s*[,–\-]\s*(?:tuần\s*)?(\d+[\d,\-–\s]*))?/iu);
    if (match && match[2] && match[2].trim().length > 3) {
      lessons.push({
        title: match[2].trim(),
        periods: match[3] || '',
        week: match[4] ? 'Tuần ' + match[4].trim() : '',
        requirement: ''
      });
    }
  }

  const warnings: string[] = [];
  if (lessons.length === 0) {
    warnings.push(
      'Không nhận diện được dòng bài học nào. Vui lòng định dạng: mỗi dòng 1 bài học (ví dụ: "Bài 1. Tên bài - 2 tiết - Tuần 1") hoặc copy các hàng từ bảng Excel/Word dán vào.'
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
