# Trợ lý số soạn Kế hoạch dạy học (KHDH) — Chuẩn Công văn 5512, Form V11-2

Webapp giúp giáo viên: tải lên Phụ lục I / PPCT (.docx hoặc .pdf) → hệ thống tự
động bóc tách bảng Tuần - Tiết - Tên bài học - Yêu cầu cần đạt (YCCĐ) → chọn 1
bài học → dùng AI (Anthropic Claude) soạn KHDH đầy đủ 4 hoạt động (Khởi động -
Hình thành kiến thức - Luyện tập - Vận dụng) đúng **FORM V11-2 FINAL** → xuất
file Word (.docx) để nộp duyệt.

Đăng nhập bằng **Google OAuth 2.0**. Dữ liệu (PPCT đã tải lên, KHDH đã tạo)
được lưu trong Postgres và luôn lọc theo email người dùng đăng nhập —
**User Data Isolation**: giáo viên A không bao giờ thấy hay ghi đè dữ liệu của
giáo viên B / trường khác.

## Công nghệ sử dụng

- **Next.js 14** (App Router) + TypeScript, deploy trên Vercel.
- **NextAuth.js** (Auth.js v4) với Google Provider.
- **Vercel Postgres** (`@vercel/postgres`) lưu PPCT đã upload và KHDH đã tạo.
- **Anthropic Claude API** (`@anthropic-ai/sdk`) sinh nội dung KHDH.
- **mammoth** + **cheerio** bóc tách bảng từ file `.docx`; **pdf-parse** xử lý `.pdf`.
- **docx** (npm package) xuất file Word `.docx` đúng cấu trúc Form V11-2.

## 1. Chạy thử ở máy local

```bash
npm install
cp .env.example .env.local   # rồi điền các biến bên dưới
npm run dev
```

Mở http://localhost:3000

### Các biến môi trường cần điền trong `.env.local`

| Biến | Lấy ở đâu |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth client ID (Web application). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (và sau này thêm URL Vercel thật) |
| `NEXTAUTH_SECRET` | Chạy `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` khi chạy local |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `POSTGRES_URL` | Xem mục 3 bên dưới (Vercel Postgres) |

Nếu chưa muốn cấu hình Postgres ngay, app vẫn chạy được luồng bóc tách + sinh
KHDH + xuất Word — chỉ có phần lưu lịch sử/DB sẽ báo lỗi cho tới khi có DB.

## 2. Đưa code lên GitHub

```bash
git add -A
git commit -m "Khởi tạo webapp KHDH chuẩn 5512 - Form V11-2"
git branch -M main
git remote add origin https://github.com/<ten-cua-ban>/<ten-repo>.git
git push -u origin main
```

## 3. Tạo Vercel Postgres (Neon) và lấy biến kết nối

1. Vào [vercel.com](https://vercel.com) → tạo Project mới bằng cách **Import**
   repo GitHub vừa tạo ở bước 2.
2. Trong Project vừa tạo → tab **Storage** → **Create Database** → chọn
   **Postgres** (Neon) → tạo.
3. Sau khi tạo xong, bấm **Connect Project** để gắn database vào đúng Project
   web app này. Vercel sẽ tự động thêm các biến `POSTGRES_URL`,
   `POSTGRES_URL_NON_POOLING`,... vào **Environment Variables** của project.

## 4. Cấu hình Google OAuth cho domain thật

1. Vào lại Google Cloud Console → OAuth client vừa tạo.
2. Thêm **Authorized redirect URI**: `https://<ten-app>.vercel.app/api/auth/callback/google`
   (thay bằng domain Vercel thật của bạn, hoặc domain riêng nếu có).
3. Nếu trường dùng Google Workspace for Education, khuyến nghị giới hạn OAuth
   consent screen ở chế độ **Internal** để chỉ giáo viên trong domain
   `@ten-truong.edu.vn` đăng nhập được (đúng tinh thần "Isolation Workspace"
   trong quy trình).

## 5. Khai báo Environment Variables trên Vercel

Vào Project → **Settings → Environment Variables**, thêm (cho cả 3 môi trường
Production/Preview/Development nếu cần):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` = `https://<ten-app>.vercel.app`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (tuỳ chọn, mặc định `claude-sonnet-4-5-20250929`)
- Các biến `POSTGRES_URL*` đã được Vercel tự điền ở bước 3.

## 6. Deploy

Sau khi khai báo đủ biến môi trường, vào tab **Deployments** → **Redeploy**
(hoặc chỉ cần push commit mới lên GitHub, Vercel sẽ tự build & deploy).

Lần đầu chạy, ứng dụng tự động tạo bảng trong Postgres (`ensureSchema()`
trong `lib/db/client.ts`) — không cần chạy migration thủ công.

## Luồng sử dụng cho giáo viên (đúng SOP 3 bước trong quy trình)

1. **Đăng nhập Google** → chọn Môn học & Khối lớp → kéo thả file Phụ lục
   I/PPCT (.docx/.pdf).
2. Hệ thống bóc tách bảng Tuần/Tiết/Tên bài học/YCCĐ → giáo viên rà soát,
   sửa trực tiếp trên bảng nếu cần → chọn 1 bài học cần soạn.
3. Bấm **"Tạo KHDH (Form V11-2)"** → AI soạn đủ 4 hoạt động theo Công văn
   5512 → xem trước → bấm **"Xuất File Word (.docx)"** để tải về nộp duyệt.

## Giới hạn của bản MVP & hướng mở rộng

- Bóc tách PDF theo heuristic dòng văn bản (không giữ cấu trúc bảng như PDF
  gốc); khuyến nghị dùng file `.docx` để có độ chính xác cao nhất, đúng như
  lưu ý "Auto-Purge Cache" trong quy trình gốc.
- Chưa có giao diện Tổ trưởng/BGH duyệt 2 lớp (Dual Audit) và bảng KPI —
  đây là hướng phát triển tiếp theo khi nhân rộng ra toàn trường/Phòng/Sở.
- Công thức Toán được AI trả về theo chuẩn LaTeX (`$...$`, `$$...$$`) và mã
  hình vẽ TikZ được giữ nguyên dạng text trong file Word (do Word không tự
  render LaTeX/TikZ); giáo viên copy đoạn mã này sang Overleaf để xuất hình,
  hoặc dùng Equation Editor của Word để nhập lại công thức.
