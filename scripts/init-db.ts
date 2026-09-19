/**
 * Script tuỳ chọn để khởi tạo schema DB thủ công (thường không cần vì app
 * tự gọi ensureSchema() ở mỗi request). Chạy: npm run db:init
 * Yêu cầu biến môi trường POSTGRES_URL đã được nạp (vd: qua `vercel env pull`).
 */
import { ensureSchema } from '../lib/db/client';

async function main() {
  await ensureSchema();
  console.log('✅ Đã khởi tạo/kiểm tra schema Postgres thành công.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Lỗi khởi tạo schema:', err);
  process.exit(1);
});
