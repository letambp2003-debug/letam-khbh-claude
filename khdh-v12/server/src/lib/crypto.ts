import crypto from 'node:crypto';

/**
 * Ma hoa/giai ma API key cua giao vien bang AES-256-GCM truoc khi luu SQLite.
 * Khoa lay tu bien moi truong API_KEY_ENCRYPTION_SECRET (32 byte hex, sinh
 * bang `openssl rand -hex 32`). Neu thieu bien nay, server tu choi khoi dong
 * thay vi am tham luu API key duoi dang khong an toan (xem index.ts).
 *
 * Theo dung Section E/R cua dac ta: khong bao gio log plaintext API key,
 * khong bao gio hard-code khoa ma hoa trong code.
 */
function getKey(): Buffer {
  const hex = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET phai la chuoi hex 64 ky tu (32 byte). Sinh bang: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plaintext: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64')
  };
}

export function decryptSecret(ciphertext: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

/** Chi de hien thi vi du "sk-ant-...ab12" tren giao dien, khong bao gio tra plaintext day du. */
export function last4(plaintext: string): string {
  return plaintext.slice(-4);
}
