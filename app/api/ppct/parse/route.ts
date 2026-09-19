import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parsePpctFile } from '@/lib/parsing/ppct';
import { savePpctUpload } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập bằng Google để tiếp tục.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subject = String(formData.get('subject') ?? '');
    const grade = String(formData.get('grade') ?? '');

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên.' }, { status: 400 });
    }
    if (!subject || !grade) {
      return NextResponse.json({ error: 'Vui lòng chọn Môn học và Khối lớp trước khi tải lên.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await parsePpctFile(file.name, buffer);
    result.subject = subject;
    result.grade = grade;

    // Auto-Purge Cache: mỗi lần upload là một bản ghi mới, không tái sử dụng
    // bản ghi cũ -> giáo viên luôn thao tác trên dữ liệu mới nhất vừa bóc tách.
    const uploadId = await savePpctUpload({
      ownerEmail: session.user.email,
      fileName: file.name,
      subject,
      grade,
      lessons: result.lessons
    });

    return NextResponse.json({ uploadId, ...result });
  } catch (err: any) {
    console.error('PPCT parse error', err);
    return NextResponse.json(
      { error: err?.message ?? 'Có lỗi khi xử lý file. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
