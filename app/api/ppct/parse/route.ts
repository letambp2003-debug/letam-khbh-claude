import { NextRequest, NextResponse } from 'next/server';
import { parsePpctFile, parsePpctText } from '@/lib/parsing/ppct';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let subject = '';
    let grade = '';
    let result;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      subject = String(body.subject ?? '');
      grade = String(body.grade ?? '');
      const text = String(body.text ?? '');
      if (!text.trim()) {
        return NextResponse.json({ error: 'Nội dung dán rỗng. Vui lòng nhập hoặc dán danh sách bài học.' }, { status: 400 });
      }
      result = parsePpctText(text);
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const text = String(formData.get('text') ?? '');
      subject = String(formData.get('subject') ?? '');
      grade = String(formData.get('grade') ?? '');

      if (text.trim()) {
        result = parsePpctText(text);
      } else if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        result = await parsePpctFile(file.name, buffer);
      } else {
        return NextResponse.json({ error: 'Không tìm thấy file hoặc nội dung tải lên.' }, { status: 400 });
      }
    }

    if (!subject || !grade) {
      return NextResponse.json({ error: 'Vui lòng chọn Môn học và Khối lớp trước khi tiếp tục.' }, { status: 400 });
    }

    result.subject = subject;
    result.grade = grade;

    const uploadId = `local_${Date.now()}`;
    return NextResponse.json({ uploadId, ...result });
  } catch (err: any) {
    console.error('PPCT parse error', err);
    return NextResponse.json(
      { error: err?.message ?? 'Có lỗi khi xử lý file. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
