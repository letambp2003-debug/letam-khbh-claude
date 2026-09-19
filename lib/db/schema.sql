-- Schema cho hệ thống Trợ lý số soạn KHDH
-- Mọi bảng đều cách ly dữ liệu theo owner_email (email Google của giáo viên)

CREATE TABLE IF NOT EXISTS ppct_uploads (
  id UUID PRIMARY KEY,
  owner_email TEXT NOT NULL,
  file_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  lessons_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppct_owner ON ppct_uploads (owner_email, created_at DESC);

CREATE TABLE IF NOT EXISTS khdh_generated (
  id UUID PRIMARY KEY,
  owner_email TEXT NOT NULL,
  ppct_upload_id UUID REFERENCES ppct_uploads (id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_khdh_owner ON khdh_generated (owner_email, created_at DESC);
