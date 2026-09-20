import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { db } from '../db/client.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { parsePpctDocx } from '../lib/parsing/ppctDocx.js';
import { extractPdfText } from '../lib/parsing/pdfText.js';
import { extractDocxText } from '../lib/parsing/docxText.js';

const router = Router();

const SLOTS = ['pl1', 'sgk', 'khdh_cu', 'form_to'] as const;
type Slot = (typeof SLOTS)[number];

// Dinh dang chap nhan theo tung slot, dung yeu cau dac ta: PL1 bat buoc
// .docx, SGK bat buoc .pdf, 2 slot con lai chap nhan ca hai. Kiem tra ca
// duoi file lan MIME type khai bao, khong tin rieng mot phia (Section R:
// validate MIME/type/size).
const SLOT_ACCEPT: Record<Slot, { extensions: string[]; mimes: string[]; required: boolean; label: string }> = {
  pl1: {
    extensions: ['.docx'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    required: true,
    label: 'Phụ lục I / PPCT'
  },
  sgk: {
    extensions: ['.pdf'],
    mimes: ['application/pdf'],
    required: true,
    label: 'Sách giáo khoa (SGK)'
  },
  khdh_cu: {
    extensions: ['.docx', '.pdf'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'],
    required: false,
    label: 'KHDH cũ (tham khảo)'
  },
  form_to: {
    extensions: ['.docx', '.pdf'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'],
    required: false,
    label: 'Form mẫu của tổ chuyên môn'
  }
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB - server Node rieng, khong bi gioi han 4.5MB kieu serverless.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

const STORAGE_ROOT = process.env.SOURCE_STORAGE_DIR || './storage/uploads';

// pdf-parse chi doc duoc lop van ban that (text layer), khong OCR. Neu file
// PDF la anh scan (khong co lop van ban), ket qua tra ve gan nhu rong ma
// khong nem loi gi -- giao vien co the tuong nham la da nap thanh cong. Canh
// bao som khi so ky tu trung binh/trang qua thap thay vi de loi am tham.
const MIN_CHARS_PER_PAGE_HEURISTIC = 20;

function warnIfLikelyScanned(pageCount: number, charCount: number): string[] {
  if (pageCount <= 0) return [];
  const avgCharsPerPage = charCount / pageCount;
  if (avgCharsPerPage < MIN_CHARS_PER_PAGE_HEURISTIC) {
    return [
      `File PDF này gần như không có văn bản đọc được (chỉ ~${Math.round(avgCharsPerPage)} ký tự/trang) — ` +
        'có thể đây là bản scan dạng ảnh chưa qua OCR. Hệ thống chưa hỗ trợ OCR, nên AI sẽ không dùng được nội dung này làm ngữ liệu tham khảo. ' +
        'Vui lòng dùng bản PDF có lớp văn bản (ví dụ xuất trực tiếp từ file gốc thay vì scan giấy).'
    ];
  }
  return [];
}

function ownsProject(projectId: string, ownerEmail: string): boolean {
  const row = db.prepare(`SELECT 1 FROM projects WHERE id = ? AND owner_email = ?`).get(projectId, ownerEmail);
  return !!row;
}

const SlotParamSchema = z.enum(SLOTS);

router.get('/accept', (_req, res) => {
  res.json({ slots: SLOT_ACCEPT });
});

router.post('/:projectId/:slot', requireAuth, upload.single('file'), async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  const slotParsed = SlotParamSchema.safeParse(req.params.slot);
  if (!slotParsed.success) {
    return res.status(400).json({ error: 'Slot nguồn dữ liệu không hợp lệ.' });
  }
  const slot = slotParsed.data;

  if (!ownsProject(projectId, req.userEmail!)) {
    return res.status(404).json({ error: 'Không tìm thấy dự án.' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Không tìm thấy file tải lên.' });
  }

  const accept = SLOT_ACCEPT[slot];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!accept.extensions.includes(ext) || !accept.mimes.includes(file.mimetype)) {
    return res.status(400).json({
      error: `Slot "${accept.label}" chỉ chấp nhận file ${accept.extensions.join('/')}. Vui lòng kiểm tra lại định dạng file (đuôi file lẫn loại nội dung phải khớp).`
    });
  }

  // Tu choi file .docm/.dotm gia mao duoi .docx (chua macro thuc thi) - kiem
  // tra chu ky ZIP that su thay vi chi tin duoi file, dung tinh than Section R
  // "no executable macros".
  if (ext === '.docx') {
    const zipMagic = file.buffer.subarray(0, 2).toString('ascii');
    if (zipMagic !== 'PK') {
      return res.status(400).json({ error: 'File .docx không hợp lệ (không đúng định dạng OOXML/ZIP).' });
    }
  }
  if (ext === '.pdf') {
    const pdfMagic = file.buffer.subarray(0, 4).toString('ascii');
    if (pdfMagic !== '%PDF') {
      return res.status(400).json({ error: 'File .pdf không hợp lệ (thiếu chữ ký %PDF).' });
    }
  }

  let parsed: unknown = null;
  let warnings: string[] = [];

  try {
    if (slot === 'pl1') {
      const result = await parsePpctDocx(file.buffer);
      parsed = { lessons: result.lessons };
      warnings = result.warnings;
    } else if (slot === 'sgk') {
      const result = await extractPdfText(file.buffer);
      parsed = { pageCount: result.pageCount, preview: result.preview, charCount: result.text.length };
      warnings = warnIfLikelyScanned(result.pageCount, result.text.length);
    } else if (ext === '.pdf') {
      const result = await extractPdfText(file.buffer);
      parsed = { preview: result.preview, charCount: result.text.length };
      warnings = warnIfLikelyScanned(result.pageCount, result.text.length);
    } else {
      const result = await extractDocxText(file.buffer);
      parsed = { preview: result.preview, charCount: result.text.length };
    }
  } catch (err: any) {
    console.error(`Lỗi bóc tách file cho slot ${slot}:`, err?.message ?? err);
    return res.status(422).json({
      error: `Không đọc được nội dung file "${file.originalname}". File có thể bị hỏng hoặc mã hoá — vui lòng thử xuất lại file rồi tải lên lại.`
    });
  }

  const projectDir = path.join(STORAGE_ROOT, projectId);
  fs.mkdirSync(projectDir, { recursive: true });
  const storedPath = path.join(projectDir, `${slot}${ext}`);
  fs.writeFileSync(storedPath, file.buffer);

  db.prepare(
    `INSERT INTO sources (project_id, slot, owner_email, file_name, mime_type, size_bytes, stored_path, parsed_json, warnings_json, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(project_id, slot) DO UPDATE SET
       file_name = excluded.file_name,
       mime_type = excluded.mime_type,
       size_bytes = excluded.size_bytes,
       stored_path = excluded.stored_path,
       parsed_json = excluded.parsed_json,
       warnings_json = excluded.warnings_json,
       uploaded_at = datetime('now')`
  ).run(
    projectId,
    slot,
    req.userEmail,
    file.originalname,
    file.mimetype,
    file.size,
    storedPath,
    JSON.stringify(parsed),
    JSON.stringify(warnings)
  );

  db.prepare(`UPDATE projects SET updated_at = datetime('now') WHERE id = ?`).run(projectId);

  res.json({ ok: true, slot, fileName: file.originalname, sizeBytes: file.size, parsed, warnings });
});

router.delete('/:projectId/:slot', requireAuth, (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  const slotParsed = SlotParamSchema.safeParse(req.params.slot);
  if (!slotParsed.success) return res.status(400).json({ error: 'Slot không hợp lệ.' });
  if (!ownsProject(projectId, req.userEmail!)) return res.status(404).json({ error: 'Không tìm thấy dự án.' });

  const row = db
    .prepare(`SELECT stored_path FROM sources WHERE project_id = ? AND slot = ? AND owner_email = ?`)
    .get(projectId, slotParsed.data, req.userEmail) as { stored_path: string } | undefined;

  db.prepare(`DELETE FROM sources WHERE project_id = ? AND slot = ? AND owner_email = ?`).run(
    projectId,
    slotParsed.data,
    req.userEmail
  );

  if (row?.stored_path && fs.existsSync(row.stored_path)) {
    try {
      fs.unlinkSync(row.stored_path);
    } catch {
      /* best-effort don dep file tren dia */
    }
  }

  res.json({ ok: true });
});

// Bat loi rieng cho multer (vi du file qua ngu ap dung MAX_UPLOAD_BYTES) de
// tra JSON ro rang thay vi de Express nem loi HTML mac dinh.
router.use((err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File vượt quá giới hạn ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB cho phép.`
      });
    }
    return res.status(400).json({ error: `Lỗi tải file: ${err.message}` });
  }
  next(err);
});

export default router;
