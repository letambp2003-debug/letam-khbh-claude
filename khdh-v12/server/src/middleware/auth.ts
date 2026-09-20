import type { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../lib/session.js';
import { getUser } from '../db/client.js';

export interface AuthedRequest extends Request {
  userEmail?: string;
}

function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.split(';').map((p) => p.trim()).find((p) => p.startsWith('khdh_session='));
  if (!match) return undefined;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

/**
 * Bat buoc dang nhap - dung cho moi route can du lieu rieng cua giao vien.
 *
 * Ngoai xac thuc chu ky token, con kiem tra email trong token van con ton tai
 * trong bang users. Neu khong kiem tra buoc nay, mot session con "hop le ve
 * chu ky" nhung ung voi user da bi xoa (hoac chua tung duoc tao qua luong
 * dang nhap Google that) se lam cac insert/update o route khac (vi du tao
 * project) nem loi FOREIGN KEY constraint chua duoc bat -> tra ve HTML loi
 * 500 mac dinh cua Express thay vi JSON 401 ro rang. Phat hien duoc dieu nay
 * khi kiem thu M2 bang mot session token tu tao thu cong.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = readSessionCookie(req);
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Vui long dang nhap bang Google de tiep tuc.' });
  }
  if (!getUser(session.email)) {
    return res.status(401).json({ error: 'Phien dang nhap khong con hop le. Vui long dang nhap lai.' });
  }
  req.userEmail = session.email;
  next();
}
