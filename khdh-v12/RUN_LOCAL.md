# Chạy KHDH V12 ở máy local

## 1. Cài đặt

```bash
cd khdh-v12
npm install
```

## 2. Tạo Google OAuth Client ID

1. Vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: thêm `http://localhost:5173`.
4. Không cần khai báo "Authorized redirect URIs" — luồng đăng nhập dùng
   Google Identity Services phía client (trả ID token trực tiếp về trình
   duyệt), server chỉ xác thực lại token bằng Client ID này.
5. Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`).
6. (Khuyến nghị cho trường dùng Google Workspace for Education) ở màn hình
   **OAuth consent screen**, chọn **Internal** để chỉ tài khoản trong domain
   trường đăng nhập được.

## 3. Sinh 2 khoá bí mật bắt buộc

```bash
openssl rand -base64 32   # dùng cho SESSION_SECRET
openssl rand -hex 32      # dùng cho API_KEY_ENCRYPTION_SECRET (đúng 64 ký tự hex)
```

Server **từ chối khởi động** nếu thiếu 1 trong 2 biến này — đây là chủ đích,
để tránh lưu session/API key ở trạng thái không an toàn.

## 4. Điền file môi trường

```bash
cp .env.example server/.env
cp client/.env.example client/.env
```

Trong `server/.env`, điền tối thiểu:
- `GOOGLE_CLIENT_ID` (bước 2)
- `SESSION_SECRET`, `API_KEY_ENCRYPTION_SECRET` (bước 3)

Trong `client/.env`, điền:
- `VITE_GOOGLE_CLIENT_ID` = **cùng giá trị** Client ID ở bước 2.

`ANTHROPIC_API_KEY` / `GOOGLE_AI_API_KEY` trong `server/.env` là tuỳ chọn —
đây là key mặc định của trường/quản trị dùng khi giáo viên chưa tự nhập key
riêng trên giao diện (mục "API Key của bạn" sau khi đăng nhập).

## 5. Chạy

```bash
npm run dev
```

- Server: http://localhost:8787 (kiểm tra nhanh: `curl http://localhost:8787/api/health`)
- Client: http://localhost:5173

Mở trình duyệt tới http://localhost:5173, đăng nhập bằng nút Google, sau đó
vào mục "API Key của bạn" để nhập key Anthropic và/hoặc Google AI.

Tiếp theo, ở mục "Dự án của bạn": tạo 1 dự án mới (chọn môn học/khối lớp,
đặt tên), sau đó ở mục "Nguồn dữ liệu" nạp đủ 2 file bắt buộc — Phụ lục
I/PPCT dạng `.docx` và Sách giáo khoa dạng `.pdf`. Hệ thống tự bóc tách
bảng Tuần/Tiết/Tên bài học/YCCĐ từ Phụ lục I ngay khi tải lên. KHDH cũ và
Form mẫu của tổ là tuỳ chọn.

## Build production

```bash
npm run build      # build cả server (tsc) và client (vite build)
npm run typecheck  # kiểm tra kiểu dữ liệu, không build
```

`server/dist/index.js` là entrypoint chạy production (`node dist/index.js`),
`client/dist/` là các file tĩnh sẵn sàng deploy lên bất kỳ static host nào
(Vercel, Netlify, Nginx...); server cần chạy trên một Node host hỗ trợ file
hệ thống ghi được (cho SQLite) — ví dụ Render, Fly.io, một VPS, hoặc
container tự quản lý (chưa cấu hình sẵn cho nền tảng serverless như Vercel
Functions vì SQLite cần đĩa bền vững, thường không phù hợp môi trường
serverless không trạng thái).

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Server thoát ngay với `[FATAL] Thieu bien moi truong...` | Chưa điền `SESSION_SECRET`/`API_KEY_ENCRYPTION_SECRET` | Xem bước 3-4 |
| Nút đăng nhập Google không hiện | Thiếu `VITE_GOOGLE_CLIENT_ID` trong `client/.env` | Điền đúng bước 4, khởi động lại `npm run dev` |
| Đăng nhập báo "Xác thực Google thất bại" | Client ID ở `server/.env` và `client/.env` không khớp, hoặc domain chưa nằm trong Authorized JavaScript origins | Kiểm tra lại bước 2 và bước 4 |
| Lưu API key báo "chưa xác thực được" | Sandbox/mạng chặn outbound tới `api.anthropic.com`/`generativelanguage.googleapis.com`, hoặc key sai | Key vẫn được lưu; kiểm tra lại key hoặc thử lại khi có mạng |
