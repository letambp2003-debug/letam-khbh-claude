import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildWorksheetDocxBuffer } from '@/lib/khdh/docx';
import type { WorksheetPackage } from '@/types/extended';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const worksheetPackage: WorksheetPackage = body.worksheetPackage;

    if (!worksheetPackage || !worksheetPackage.sheets || worksheetPackage.sheets.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu Phiếu học tập để xuất file.' }, { status: 400 });
    }

    const buffer = await buildWorksheetDocxBuffer(worksheetPackage);
    const safeTitle = (worksheetPackage.lessonTitle || 'PhieuHocTap').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]+/g, '_');
    const fileName = encodeURIComponent(`PhieuHocTap_${safeTitle}.docx`);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`
      }
    });
  } catch (err: any) {
    console.error('Worksheet export error:', err);
    return NextResponse.json({ error: err?.message ?? 'Có lỗi khi xuất file Word.' }, { status: 500 });
  }
}
