import mammoth from 'mammoth';

/** Trích văn bản thô (không giữ định dạng) — dùng cho KHDH cũ / Form tổ, nơi
 * chỉ cần nội dung tham khảo cho AI ở các milestone sau, chưa cần bóc tách
 * bảng có cấu trúc như Phụ lục I. */
export async function extractDocxText(buffer: Buffer): Promise<{ text: string; preview: string }> {
  const { value: text } = await mammoth.extractRawText({ buffer });
  return { text, preview: text.slice(0, 2000) };
}
