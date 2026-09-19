import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildKhdhDocxBuffer } from '@/lib/khdh/docx';
import { getKhdh } from '@/lib/db/queries';
import type { KhdhContent } from '@/types/khdh';

export const runtime = 'nodejs';
export const maxDuration = 60;

function slugifyFileName(text: string) {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'KHDH'
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập bằng Google để tiếp tục.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    let content: KhdhContent;

    if (body.id) {
      // Xuất lại từ bản ghi đã lưu, đảm bảo chỉ chủ sở hữu mới xuất được
      const record = await getKhdh(body.id, session.user.email);
      if (!record) {
        return NextResponse.json({ error: 'Không tìm thấy KHDH hoặc bạn không có quyền truy cập.' }, { status: 404 });
      }
      content = record.content_json as KhdhContent;
    } else if (body.content) {
      content = body.content as KhdhContent;
    } else {
      return NextResponse.json({ error: 'Thiếu dữ liệu KHDH để xuất file.' }, { status: 400 });
    }

    const buffer = await buildKhdhDocxBuffer(content);
    const fileName = `KHDH_${slugifyFileName(content.lessonTitle || 'BaiHoc')}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (err: any) {
    console.error('KHDH export error', err);
    return NextResponse.json({ error: err?.message ?? 'Có lỗi khi xuất file Word.' }, { status: 500 });
  }
}
