import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateKhdhContent } from '@/lib/khdh/generate';
import { saveKhdh } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập bằng Google để tiếp tục.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      schoolName = '',
      department = '',
      teacherName = '',
      subject,
      grade,
      lessonTitle,
      week = '',
      ppctPeriods = '',
      durationPeriods = 1,
      requirement = '',
      extraNotes = '',
      ppctUploadId = null
    } = body;

    if (!subject || !grade || !lessonTitle) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: Môn học, Lớp hoặc Tên bài học.' },
        { status: 400 }
      );
    }

    const content = await generateKhdhContent({
      schoolName,
      department,
      teacherName,
      subject,
      grade,
      lessonTitle,
      week,
      ppctPeriods,
      durationPeriods: Number(durationPeriods) || 1,
      requirement,
      extraNotes
    });

    // Lưu DB là best-effort: nội dung do AI soạn ra đã sẵn sàng dùng ngay cả
    // khi Postgres chưa cấu hình/lỗi tạm thời — giáo viên vẫn xem trước và
    // xuất Word được (route xuất file chấp nhận gửi thẳng nội dung khi
    // không có id), chỉ mất khả năng tải lại/re-export sau này từ lịch sử.
    let id: string | null = null;
    try {
      id = await saveKhdh({
        ownerEmail: session.user.email,
        ppctUploadId,
        schoolName,
        teacherName,
        department,
        subject,
        grade,
        lessonTitle,
        week,
        ppctPeriods,
        durationPeriods: Number(durationPeriods) || 1,
        content
      });
    } catch (dbErr) {
      console.error('Không lưu được KHDH vào DB (bỏ qua, vẫn trả nội dung đã soạn):', dbErr);
    }

    return NextResponse.json({ id, content });
  } catch (err: any) {
    console.error('KHDH generate error', err);
    return NextResponse.json(
      { error: err?.message ?? 'Có lỗi khi tạo KHDH. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
