import mammoth from 'mammoth';

/**
 * Trích xuất toàn bộ văn bản thuần từ file .docx hoặc .pdf (dùng cho SGK và KHDH cũ)
 */
export async function extractDocumentText(
  fileName: string,
  buffer: Buffer
): Promise<{ text: string; charCount: number; preview: string; pageCount?: number }> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.docx')) {
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    return {
      text: cleanText,
      charCount: cleanText.length,
      preview: cleanText.slice(0, 250) + (cleanText.length > 250 ? '...' : '')
    };
  }

  if (lower.endsWith('.pdf')) {
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    const cleanText = (data.text || '').replace(/\s+/g, ' ').trim();
    return {
      text: cleanText,
      charCount: cleanText.length,
      pageCount: data.numpages,
      preview: cleanText.slice(0, 250) + (cleanText.length > 250 ? '...' : '')
    };
  }

  throw new Error('Chỉ hỗ trợ file .docx hoặc .pdf.');
}
