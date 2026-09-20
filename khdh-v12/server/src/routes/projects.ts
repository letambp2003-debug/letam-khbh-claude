import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db/client.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(100).optional().default(''),
  grade: z.string().max(50).optional().default('')
});

router.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Tên dự án là bắt buộc.' });
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO projects (id, owner_email, name, subject, grade) VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.userEmail, parsed.data.name, parsed.data.subject, parsed.data.grade);

  res.json({ id });
});

// Moi truy van deu loc theo owner_email cua phien dang nhap hien tai --
// giao vien A khong bao gio thay hay sua duoc du an cua giao vien B.
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(`SELECT id, name, subject, grade, created_at, updated_at FROM projects WHERE owner_email = ? ORDER BY updated_at DESC`)
    .all(req.userEmail);
  res.json({ projects: rows });
});

router.get('/:id', requireAuth, (req: AuthedRequest, res) => {
  const project = db
    .prepare(`SELECT id, name, subject, grade, created_at, updated_at FROM projects WHERE id = ? AND owner_email = ?`)
    .get(req.params.id, req.userEmail);
  if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án.' });

  const sources = db
    .prepare(
      `SELECT slot, file_name, mime_type, size_bytes, parsed_json, warnings_json, uploaded_at
       FROM sources WHERE project_id = ? AND owner_email = ?`
    )
    .all(req.params.id, req.userEmail) as Array<{
    slot: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    parsed_json: string | null;
    warnings_json: string | null;
    uploaded_at: string;
  }>;

  res.json({
    project,
    sources: sources.map((s) => ({
      slot: s.slot,
      fileName: s.file_name,
      mimeType: s.mime_type,
      sizeBytes: s.size_bytes,
      uploadedAt: s.uploaded_at,
      parsed: s.parsed_json ? JSON.parse(s.parsed_json) : null,
      warnings: s.warnings_json ? JSON.parse(s.warnings_json) : []
    }))
  });
});

router.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
  const result = db.prepare(`DELETE FROM projects WHERE id = ? AND owner_email = ?`).run(req.params.id, req.userEmail);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy dự án.' });
  res.json({ ok: true });
});

export default router;
