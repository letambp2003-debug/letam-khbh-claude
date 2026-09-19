/**
 * Bộ phân tích nội dung dùng CHUNG cho cả:
 *  - Preview trên web (render bằng KaTeX, phía client)
 *  - Xuất file Word (render bằng OMML native, phía server)
 *
 * Quy ước nguồn (đúng chuẩn MATH_CANONICAL trong 06_MATH_VISUAL_V11_2.MD):
 *  - Công thức trong dòng:  $...$
 *  - Công thức khối riêng dòng: $$...$$
 *  - Hình vẽ Toán chính xác:
 *      Code TikZ / Overleaf:
 *      ```tikz
 *      ...mã TikZ...
 *      ```
 *  - Ảnh minh hoạ thực tế:
 *      Prompt tạo ảnh:
 *      ```text
 *      ...prompt...
 *      ```
 *
 * File này không phụ thuộc mathjax/docx nên dùng an toàn ở cả client & server.
 */

export interface TextBlock {
  type: 'text';
  lines: string[]; // mỗi phần tử là 1 dòng, đã tách theo \n
}

export interface TikzBlock {
  type: 'tikz';
  code: string;
}

export interface ImagePromptBlock {
  type: 'image_prompt';
  prompt: string;
}

export type ContentBlock = TextBlock | TikzBlock | ImagePromptBlock;

export interface InlineText {
  type: 'text';
  value: string;
}

export interface InlineMath {
  type: 'math';
  latex: string;
  display: boolean; // true nếu là $$...$$
}

export type InlineToken = InlineText | InlineMath;

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;
// Nhãn đứng ngay trước khối fenced, dùng để phân biệt TikZ vs Prompt ảnh khi
// AI không set đúng language hint trên dòng ```lang.
const TIKZ_LABEL_RE = /(code\s*tikz|tikz\s*\/\s*overleaf|mã\s*tikz)/i;
const IMAGE_LABEL_RE = /(prompt\s*(tạo|ảnh)|prompt_anh|prompt\s*ảnh)/i;

/**
 * Tách nội dung thô (có thể chứa nhiều dòng, khối TikZ, khối prompt ảnh)
 * thành danh sách block cấp cao.
 */
export function parseContentBlocks(raw: string): ContentBlock[] {
  if (!raw) return [{ type: 'text', lines: [''] }];

  const blocks: ContentBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;

  const pushTextChunk = (chunk: string) => {
    if (!chunk) return;
    const lines = chunk.split('\n');
    // Bỏ dòng trắng thừa ở đầu/cuối chunk nhưng giữ dòng trắng ở giữa (ngăn cách ý)
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    if (lines.length > 0) blocks.push({ type: 'text', lines });
  };

  while ((match = FENCE_RE.exec(raw)) !== null) {
    const before = raw.slice(lastIndex, match.index);
    const lang = (match[1] || '').toLowerCase();
    const code = match[2].trim();

    // Tìm dòng nhãn (không tính dòng trắng) ngay trước fence, để phân loại
    // khối (TikZ / Prompt ảnh) và tránh in nhãn 2 lần.
    const beforeLines = before.replace(/[ \t]+$/, '').split('\n');
    let labelIdx = beforeLines.length - 1;
    while (labelIdx >= 0 && beforeLines[labelIdx].trim() === '') labelIdx--;
    const label = labelIdx >= 0 ? beforeLines[labelIdx].trim() : '';
    const isTikzLabel = TIKZ_LABEL_RE.test(label);
    const isImageLabel = IMAGE_LABEL_RE.test(label);

    if (isTikzLabel || isImageLabel) {
      pushTextChunk(beforeLines.slice(0, labelIdx).join('\n'));
      blocks.push({ type: 'text', lines: [label] });
    } else {
      pushTextChunk(before);
    }

    if (lang === 'tikz' || isTikzLabel) {
      blocks.push({ type: 'tikz', code });
    } else if (lang === 'text' || isImageLabel) {
      blocks.push({ type: 'image_prompt', prompt: code });
    } else {
      // Không rõ loại: coi như văn bản thường đặt trong khối mã cho an toàn
      blocks.push({ type: 'text', lines: code.split('\n') });
    }

    lastIndex = FENCE_RE.lastIndex;
  }
  pushTextChunk(raw.slice(lastIndex));

  return blocks.length > 0 ? blocks : [{ type: 'text', lines: [''] }];
}

/**
 * Tách một DÒNG văn bản thường thành các token xen kẽ text / công thức.
 * Hỗ trợ $$...$$ (display, có thể lồng trong dòng) và $...$ (inline).
 */
export function parseInlineMath(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: line.slice(last, m.index) });
    if (m[1] !== undefined) {
      tokens.push({ type: 'math', latex: m[1].trim(), display: true });
    } else if (m[2] !== undefined) {
      tokens.push({ type: 'math', latex: m[2].trim(), display: false });
    }
    last = re.lastIndex;
  }
  if (last < line.length) tokens.push({ type: 'text', value: line.slice(last) });
  return tokens.length > 0 ? tokens : [{ type: 'text', value: line }];
}

/** Một dòng được coi là "công thức khối độc lập" nếu toàn bộ dòng chỉ là 1 khối $$...$$ */
export function isStandaloneDisplayMathLine(line: string): { latex: string } | null {
  const trimmed = line.trim();
  const m = trimmed.match(/^\$\$([\s\S]+)\$\$$/);
  if (m) return { latex: m[1].trim() };
  return null;
}
