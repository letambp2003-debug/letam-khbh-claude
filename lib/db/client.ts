import { sql } from '@vercel/postgres';

let initialized = false;

/**
 * Đảm bảo schema tồn tại. Được gọi ở đầu mỗi API route chạm tới DB.
 * An toàn để gọi nhiều lần (dùng CREATE TABLE IF NOT EXISTS).
 */
export async function ensureSchema() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS ppct_uploads (
      id UUID PRIMARY KEY,
      owner_email TEXT NOT NULL,
      file_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      lessons_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ppct_owner ON ppct_uploads (owner_email, created_at DESC);`;
  await sql`
    CREATE TABLE IF NOT EXISTS khdh_generated (
      id UUID PRIMARY KEY,
      owner_email TEXT NOT NULL,
      ppct_upload_id UUID,
      school_name TEXT,
      teacher_name TEXT,
      department TEXT,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      lesson_title TEXT NOT NULL,
      week TEXT,
      ppct_periods TEXT,
      duration_periods INTEGER,
      template TEXT NOT NULL DEFAULT 'V11-2',
      content_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_khdh_owner ON khdh_generated (owner_email, created_at DESC);`;
  initialized = true;
}

export { sql };
