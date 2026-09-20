// pdf-parse không có kiểu ESM chuẩn khi dùng cùng "type": "module" — import
// động rồi lấy `.default` nếu có, đúng cách đã xử lý ổn định ở bản V11-2.
export interface PdfTextResult {
  pageCount: number;
  text: string;
  preview: string;
}

export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  const pdfParseModule: any = await import('pdf-parse');
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const data = await pdfParse(buffer);
  const text: string = data.text || '';
  return {
    pageCount: data.numpages || 0,
    text,
    preview: text.slice(0, 2000)
  };
}
