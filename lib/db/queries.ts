import { v4 as uuidv4 } from 'uuid';
import { ensureSchema, sql } from './client';
import type { Lesson, KhdhContent } from '@/types/khdh';

/**
 * Tất cả hàm dưới đây nhận `ownerEmail` (lấy từ session Google đã đăng nhập)
 * và luôn lọc WHERE owner_email = ownerEmail. Đây chính là cơ chế
 * "User Data Isolation" mô tả trong quy trình: giáo viên A không thể đọc
 * hay ghi đè dữ liệu PPCT / KHDH của giáo viên B hay trường khác.
 */

export async function savePpctUpload(params: {
  ownerEmail: string;
  fileName: string;
  subject: string;
  grade: string;
  lessons: Lesson[];
}) {
  await ensureSchema();
  const id = uuidv4();
  await sql`
    INSERT INTO ppct_uploads (id, owner_email, file_name, subject, grade, lessons_json)
    VALUES (${id}, ${params.ownerEmail}, ${params.fileName}, ${params.subject}, ${params.grade}, ${JSON.stringify(
      params.lessons
    )}::jsonb)
  `;
  return id;
}

export async function getPpctUpload(id: string, ownerEmail: string) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM ppct_uploads WHERE id = ${id} AND owner_email = ${ownerEmail} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listPpctUploads(ownerEmail: string) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, file_name, subject, grade, created_at
    FROM ppct_uploads
    WHERE owner_email = ${ownerEmail}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return rows;
}

export async function saveKhdh(params: {
  ownerEmail: string;
  ppctUploadId?: string | null;
  schoolName?: string;
  teacherName?: string;
  department?: string;
  subject: string;
  grade: string;
  lessonTitle: string;
  week?: string;
  ppctPeriods?: string;
  durationPeriods?: number;
  template?: string;
  content: KhdhContent;
}) {
  await ensureSchema();
  const id = uuidv4();
  await sql`
    INSERT INTO khdh_generated (
      id, owner_email, ppct_upload_id, school_name, teacher_name, department,
      subject, grade, lesson_title, week, ppct_periods, duration_periods, template, content_json
    ) VALUES (
      ${id}, ${params.ownerEmail}, ${params.ppctUploadId ?? null}, ${params.schoolName ?? null},
      ${params.teacherName ?? null}, ${params.department ?? null}, ${params.subject}, ${params.grade},
      ${params.lessonTitle}, ${params.week ?? null}, ${params.ppctPeriods ?? null},
      ${params.durationPeriods ?? null}, ${params.template ?? 'V11-2'}, ${JSON.stringify(params.content)}::jsonb
    )
  `;
  return id;
}

export async function getKhdh(id: string, ownerEmail: string) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM khdh_generated WHERE id = ${id} AND owner_email = ${ownerEmail} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listKhdh(ownerEmail: string) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, lesson_title, subject, grade, template, created_at
    FROM khdh_generated
    WHERE owner_email = ${ownerEmail}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return rows;
}
