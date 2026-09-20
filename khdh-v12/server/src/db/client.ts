import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { ensureSchema } from './schema.js';

const SQLITE_PATH = process.env.SQLITE_PATH || './storage/khdh-v12.sqlite';

const dir = path.dirname(SQLITE_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(SQLITE_PATH);
ensureSchema(db);

export function upsertUser(email: string, name: string, picture: string) {
  db.prepare(
    `INSERT INTO users (email, name, picture, last_login_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       picture = excluded.picture,
       last_login_at = datetime('now')`
  ).run(email, name, picture);
}

export function getUser(email: string) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as
    | { email: string; name: string; picture: string; ui_mode: string }
    | undefined;
}

export function setUiMode(email: string, mode: 'co_ban' | 'nang_cao' | 'chuyen_gia') {
  db.prepare(`UPDATE users SET ui_mode = ? WHERE email = ?`).run(mode, email);
}
