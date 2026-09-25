import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentText } from '@/lib/parsing/document';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { text, slot = 'sgk', fileName = 'Nội dung dán trực tiếp' } = body;
      const clean = String(text || '').trim();
      return NextResponse.json({
        slot,
        fileName,
        charCount: clean.length,
        preview: clean.slice(0, 250) + (clean.length > 250 ? '...' : ''),
        text: clean
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slot = String(formData.get('slot') || 'sgk');

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await extractDocumentText(file.name, buffer);

    if (result.charCount === 0) {
      return NextResponse.json(
        { error: `File "${file.name}" không có lớp văn bản đọc được (có thể là file scan dạng ảnh). Vui lòng thử file khác hoặc copy văn bản dán vào.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      slot,
      fileName: file.name,
      ...result
    });
  } catch (err: any) {
    console.error('Source parse error:', err);
    return NextResponse.json(
      { error: err?.message || 'Có lỗi khi đọc file tài liệu bổ trợ.' },
      { status: 500 }
    );
  }
}
