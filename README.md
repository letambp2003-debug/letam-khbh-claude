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

## Công thức Toán: chuẩn MATH_CANONICAL → KaTeX (preview) → OMML (Word)

AI luôn sinh công thức theo đúng 1 định dạng nguồn duy nhất — LaTeX bọc trong
`$...$` (trong dòng) hoặc `$$...$$` (tách dòng) — sau đó hệ thống tự dịch
sang 2 dạng hiển thị, dùng chung một bộ phân tích (`lib/khdh/content.ts`):

- **Xem trước trên web**: dịch sang **KaTeX** (`components/MathText.tsx`),
  hiển thị công thức đẹp ngay trong trình duyệt trước khi xuất file.
- **File Word xuất ra**: dịch sang **OMML native** — công thức Word "xịn",
  không phải ảnh, không còn ký tự `$`/LaTeX thô nào trong file `.docx`. Giáo
  viên bấm đúp vào công thức trong Word là mở được Equation Editor để sửa
  trực tiếp. Pipeline: LaTeX → MathML (MathJax) → OMML (`mathml2omml-plus`),
  tương đương transform `MML2OMML.XSL` chính thức của Microsoft.
- Hình vẽ Toán chính xác (TikZ) và ảnh minh hoạ (prompt tạo ảnh) được AI đặt
  theo đúng khuôn mẫu `Code TikZ / Overleaf:` /  `Prompt tạo ảnh:` kèm khối
  mã fenced, hiển thị thành khối riêng biệt (nền xám cho TikZ, nền xanh nhạt
  cho prompt ảnh) ở cả preview lẫn file Word — giáo viên copy mã TikZ sang
  Overleaf để biên dịch hình, hoặc dùng prompt để tạo ảnh minh hoạ bằng công
  cụ AI ảnh tuỳ chọn.
- Nếu 1 công thức LaTeX bị lỗi cú pháp, hệ thống không làm hỏng cả file —
  công thức lỗi được hiển thị màu đỏ kèm nguyên văn để giáo viên tự sửa lại.

## Thể thức & tiết kiệm giấy khi in

File Word xuất ra tuân theo thể thức văn bản chuyên môn: font Times New
Roman, cỡ 13pt thân bài / 12pt trong bảng, giãn dòng đơn, căn đều 2 lề, lề
trang chuẩn A4 (trái 3cm để đóng file, phải/trên/dưới 2cm), tiêu đề in đậm
màu đen (không dùng màu xanh mặc định của Word để tránh in ra bị xám), không
chèn ngắt trang thừa giữa các mục — tối ưu số trang khi in hai mặt.

## Độ ổn định khi chạy trên Vercel

- **Giới hạn cứng 4.5MB/request** áp dụng cho mọi Serverless Function của
  Vercel (kể cả gói Pro trả phí) — không thể nâng bằng cấu hình. App đã chặn
  ở giao diện với ngưỡng 4MB và báo lỗi rõ ràng, kèm gợi ý xử lý (bỏ ảnh nền
  trong Phụ lục I, hoặc tách file theo học kỳ) thay vì để giáo viên gặp lỗi
  máy chủ khó hiểu.
- **Thời gian chạy hàm**: mặc định 300 giây (5 phút) cho cả gói Free lẫn
  Pro — đủ dư cho việc gọi AI + dịch công thức Toán, không cần nâng cấp gói.
- **Lưu trữ là "best-effort"**: nếu Postgres chưa cấu hình hoặc lỗi tạm
  thời, tính năng bóc tách PPCT và soạn KHDH bằng AI **vẫn hoạt động bình
  thường** (giáo viên vẫn xem trước và tải file Word về được), chỉ mất khả
  năng lưu lại lịch sử để mở lại sau. Lỗi DB không làm sập toàn bộ luồng.
- Toàn bộ pipeline công thức Toán (LaTeX → OMML) đã được kiểm thử với hơn 25
  mẫu công thức (phân số, căn, tích phân, giới hạn, ma trận, vector, hệ
  phương trình, hoá học...) và cả input lỗi cú pháp cố ý — không có trường
  hợp nào làm hỏng file Word xuất ra.

## Giới hạn của bản MVP & hướng mở rộng

- Bóc tách PDF theo heuristic dòng văn bản (không giữ cấu trúc bảng như PDF
  gốc); khuyến nghị dùng file `.docx` để có độ chính xác cao nhất, đúng như
  lưu ý "Auto-Purge Cache" trong quy trình gốc. Nút **"Đặt lại, tải file PPCT
  khác"** trên giao diện tương ứng đúng thao tác "Reset Source" mô tả trong
  quy trình gốc khi PPCT bị lệch dòng.
- Công thức chứa dấu `$` không phải LaTeX (ví dụ lỡ ghi giá tiền kiểu
  `5$`) có thể bị hiểu nhầm là mở đầu công thức — trường hợp này rất hiếm khi
  soạn giáo án tiếng Việt (dùng đơn vị VNĐ) nên chưa xử lý riêng.
- Chưa có giao diện Tổ trưởng/BGH duyệt 2 lớp (Dual Audit) và bảng KPI —
  đây là hướng phát triển tiếp theo khi nhân rộng ra toàn trường/Phòng/Sở.
