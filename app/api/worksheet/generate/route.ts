import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateWorksheets } from '@/lib/khdh/worksheet';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      subject,
      grade,
      lessonTitle,
      requirement = '',
      durationPeriods = 1,
      provider,
      customApiKey,
      teachingMethod
    } = body;

    if (!subject || !grade || !lessonTitle) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: Môn học, Lớp hoặc Tên bài học.' },
        { status: 400 }
      );
    }

    const worksheetPackage = await generateWorksheets({
      subject,
      grade,
      lessonTitle,
      requirement,
      durationPeriods: Number(durationPeriods) || 1,
      provider,
      customApiKey,
      teachingMethod
    });

    return NextResponse.json({ success: true, worksheetPackage });
  } catch (err: any) {
    console.error('Worksheet generate error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Có lỗi khi tạo Phiếu học tập. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
