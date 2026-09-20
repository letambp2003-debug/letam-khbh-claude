# Báo cáo kiểm thử — KHDH V12 RC2 (Milestone 1-2)

## Milestone 1 — Đã kiểm thử thực tế (chạy lệnh thật, xem kết quả thật)

| # | Kiểm thử | Cách làm | Kết quả |
|---|---|---|---|
| 1 | Cài đặt dependency | `npm install` ở thư mục gốc (workspaces) | ✅ Thành công, 239 packages |
| 2 | Kiểm tra kiểu dữ liệu | `npm run typecheck` (cả server + client) | ✅ Không lỗi |
| 3 | Build production | `npm run build` (tsc cho server, vite build cho client) | ✅ Thành công, client build ra `dist/` ~148KB JS |
| 4 | Server khởi động thật | `node dist/index.js` với đủ biến môi trường (secret sinh bằng `openssl rand`) | ✅ Log "server đang chạy", không lỗi |
| 5 | Health check | `curl http://localhost:8788/api/health` | ✅ `{"ok":true,"service":"khdh-v12-server"}` |
| 6 | Route yêu cầu đăng nhập | `curl http://localhost:8788/api/auth/me` (chưa có cookie session) | ✅ Trả đúng HTTP 401 |
| 7 | Fail-safe thiếu secret | Unset `SESSION_SECRET`/`API_KEY_ENCRYPTION_SECRET` rồi chạy `node dist/index.js` | ✅ Thoát ngay với thông báo lỗi rõ ràng, exit code 1 — không âm thầm chạy ở trạng thái không an toàn |
| 8 | Audit dependency | `npm audit` | 🟡 4 lỗ hổng transitive (chi tiết ở `SECURITY_NOTES.md`), không có lỗ hổng ở code tự viết |

## Milestone 2 — Đã kiểm thử thực tế

Toàn bộ kiểm thử dưới đây chạy trên server thật (`node dist/index.js`), gọi
qua `curl` thật, dùng file `.docx`/`.pdf` **sinh thật bằng LibreOffice**
(`soffice --headless --convert-to`) — không phải file giả lập hay JSON
dựng sẵn.

| # | Kiểm thử | Cách làm | Kết quả |
|---|---|---|---|
| 1 | Build + typecheck sau khi thêm parsing (`mammoth`, `cheerio`, `pdf-parse`) | `npm run typecheck && npm run build` | ✅ Không lỗi |
| 2 | Tạo dự án | `POST /api/projects` với session hợp lệ | ✅ Trả về `id`, đọc lại được bằng `GET /api/projects/:id` |
| 3 | Bóc tách bảng PPCT thật | Upload file `.docx` có bảng 3 dòng (tiêu đề tiếng Việt "Tuần/Tiết PPCT/Tên bài học/Yêu cầu cần đạt") vào slot `pl1` | ✅ Bóc tách đúng cả 3 dòng, đúng nội dung từng cột |
| 4 | Trích văn bản PDF thật | Upload file `.pdf` (2 đoạn văn tiếng Việt có dấu) vào slot `sgk` | ✅ Trích đúng nguyên văn, đúng số trang (1) |
| 5 | Từ chối sai định dạng theo slot | Upload `.pdf` vào slot `pl1` (chỉ nhận `.docx`) | ✅ Trả lỗi 400 rõ ràng, không parse |
| 6 | Từ chối file giả mạo đuôi | Đổi tên file `.txt` thành `.docx` rồi upload | ✅ Trả lỗi 400 "File .docx không hợp lệ" — phát hiện qua kiểm tra chữ ký nhị phân `PK`, không chỉ tin đuôi file |
| 7 | Từ chối slot không tồn tại | Upload vào `/api/sources/<id>/unknown_slot` | ✅ Trả lỗi 400 |
| 8 | Từ chối request chưa đăng nhập | Upload không kèm cookie session | ✅ Trả lỗi 401 |
| 9 | Giới hạn kích thước file | Upload file `.pdf` giả 9MB (> giới hạn 8MB) | ✅ Trả lỗi 413 rõ ràng qua middleware bắt lỗi multer riêng |
| 10 | Cách ly dữ liệu giữa 2 tài khoản | Tạo tài khoản thứ 2, gọi `GET /api/projects/:id` (của tài khoản 1) và `GET /api/projects` bằng session tài khoản 2 | ✅ Tài khoản 2 nhận lỗi 404 cho dự án của người khác, danh sách dự án rỗng |
| 11 | Đọc lại dự án sau khi upload | `GET /api/projects/:id` sau khi đã nạp 2 nguồn | ✅ Trả đúng danh sách 2 nguồn đã nạp kèm tên file |
| 12 | Cảnh báo PDF dạng scan (không có lớp văn bản) | Tạo PDF chỉ chứa 1 ảnh trống (`img2pdf`, xác nhận bằng `pdftotext` cho ra 0 ký tự) rồi upload vào slot `sgk` | ✅ Vẫn nhận file thành công, nhưng trả về cảnh báo rõ ràng "gần như không có văn bản đọc được... có thể đây là bản scan" thay vì im lặng lưu `charCount` gần 0 |

**Lỗi thật phát hiện và đã sửa trong lúc kiểm thử** (không phải giả định lý
thuyết): dùng một session token tự tạo thủ công (mô phỏng một phiên đăng
nhập hợp lệ nhưng ứng với user không còn tồn tại) để gọi tạo dự án đã làm lộ
ra `requireAuth` không kiểm tra sự tồn tại của user trước khi cho qua, khiến
insert vào bảng `projects` ném `SqliteError: FOREIGN KEY constraint failed`
và Express trả nguyên trang HTML lỗi 500 mặc định. Đã sửa `requireAuth` để
kiểm tra `getUser()` và thêm middleware bắt lỗi toàn cục — xem chi tiết ở
`IMPLEMENTATION_REPORT.md`.

## Chưa kiểm thử được (và vì sao)

| Việc chưa kiểm thử | Lý do | Rủi ro nếu có lỗi |
|---|---|---|
| Đăng nhập Google end-to-end thật (nhận ID token thật từ Google, xác thực server-side) | Sandbox không có Google OAuth Client ID thật đã cấu hình domain/origin | Trung bình — logic dùng đúng API chính thức của `google-auth-library`, nhưng chưa có bằng chứng chạy thật |
| Nhánh "xác thực API key thành công" (Anthropic/Google AI trả 200) | Không có API key thật hợp lệ trong sandbox | Thấp — code đường dẫn lỗi (401/403/network) đã được test; đường dẫn thành công chỉ khác ở việc đọc `res.ok` |
| Mã hoá/giải mã API key round-trip trong DB thật (lưu rồi đọc lại đúng giá trị) | Chưa viết test tự động cho phần này ở M1 (chỉ test thủ công logic mã hoá độc lập) | Trung bình — nên bổ sung 1 unit test nhỏ cho `lib/crypto.ts` trước khi dùng ở M2+ |
| UI trên trình duyệt thật (chụp màn hình, click thật) | Phiên làm việc này không có trình duyệt tương tác với server đang chạy kèm Google Client ID thật | Thấp — component đơn giản, đã qua typecheck + build |
| Bóc tách PPCT với các cách trình bày Phụ lục I khác thường (bảng lồng bảng, cột gộp/merge cell, tiêu đề viết tắt lạ) | Chỉ có 1 fixture mẫu "sạch" được tạo để test | Trung bình — logic dò cột theo alias regex khá bền, nhưng chưa thử với file PPCT thật đa dạng của nhiều trường |

## Không có kiểm thử tự động (unit/integration test) cho M1-M2

`server/package.json` có khai báo script `test` (`tsx --test tests-unit/*.test.ts`)
nhưng **chưa có file test nào được viết** — thư mục `tests-unit/` chưa tồn
tại. Đây là thiếu sót cần bổ sung trước khi mở rộng thêm M2+, đặc biệt cho:
- `lib/crypto.ts` (round-trip mã hoá/giải mã, và trường hợp sai khoá phải
  ném lỗi rõ ràng thay vì trả dữ liệu rác).
- `lib/session.ts` (token hết hạn, token bị sửa chữ ký phải bị từ chối).

## Kết luận

M1 chạy được thật ở mức "khởi động server + API cơ bản", không chỉ dừng ở
mức biên dịch. Phần đăng nhập Google thật và các nhánh thành công gọi API AI
ngoài cần người có Google OAuth Client ID / API key thật tự xác nhận theo
`RUN_LOCAL.md`. Không có milestone nào từ M2 trở đi được kiểm thử vì chưa
được triển khai (xem `IMPLEMENTATION_REPORT.md`).
