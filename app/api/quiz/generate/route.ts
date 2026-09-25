import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateQuizPackage } from '@/lib/khdh/quiz';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subject,
      grade,
      lessonTitle,
      requirement = '',
      provider,
      customApiKey
    } = body;

    if (!subject || !grade || !lessonTitle) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: Môn học, Lớp hoặc Tên bài học.' },
        { status: 400 }
      );
    }

    const quizPackage = await generateQuizPackage({
      subject,
      grade,
      lessonTitle,
      requirement,
      provider,
      customApiKey
    });

    return NextResponse.json({ success: true, quizPackage });
  } catch (err: any) {
    console.error('Quiz generate error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Có lỗi khi tạo Ngân hàng câu hỏi & Trò chơi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
