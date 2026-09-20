import type Database from 'better-sqlite3';

/**
 * Schema khoi tao cho M1 (auth + quan ly API key + khung du an).
 * Cac bang cho M2+ (PROJECT/LESSON_STATE/ARTIFACT day du, version history,
 * dependency graph...) se duoc bo sung dan trong cac migration sau, tranh
 * tao truoc bang rong khong dung toi ma khong ai kiem thu.
 *
 * Moi bang du lieu cua giao vien deu co cot owner_email va MOI truy van trong
 * queries.ts BAT BUOC loc theo owner_email cua phien dang nhap hien tai --
 * dung nguyen tac User Data Isolation da ap dung o ban V11-2.
 */
export function ensureSchema(db: Database.Database) {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      picture TEXT NOT NULL DEFAULT '',
      ui_mode TEXT NOT NULL DEFAULT 'co_ban' CHECK (ui_mode IN ('co_ban','nang_cao','chuyen_gia')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- API key cua tung giao vien, ma hoa AES-256-GCM truoc khi luu (xem lib/crypto.ts).
    -- KHONG BAO GIO luu plaintext, KHONG BAO GIO ghi ra log.
    CREATE TABLE IF NOT EXISTS api_keys (
      owner_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('anthropic','google')),
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      last4 TEXT NOT NULL DEFAULT '',
      validated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (owner_email, provider)
    );

    -- Du an (khung cho M2+: 4-slot nguon, Blueprint, KHDH, NLS Map...).
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_email);

    -- M2: 4 nguon du lieu co dinh cho moi du an (PL1 bat buoc .docx, SGK bat
    -- buoc .pdf, KHDH cu / Form to tuy chon .docx hoac .pdf). Moi slot chi co
    -- toi da 1 file hien hanh -- upload lai se ghi de (Auto-Purge Cache, dung
    -- nguyen tac da ap dung o ban V11-2: khong tich luy ban cu gay nham lan).
    CREATE TABLE IF NOT EXISTS sources (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      slot TEXT NOT NULL CHECK (slot IN ('pl1','sgk','khdh_cu','form_to')),
      owner_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      stored_path TEXT NOT NULL,
      parsed_json TEXT,
      warnings_json TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (project_id, slot)
    );

    CREATE INDEX IF NOT EXISTS idx_sources_owner ON sources(owner_email);
  `);
}
