# Ghi chú bảo mật — KHDH V12 RC2 (Milestone 1)

## Nguyên tắc đã áp dụng (theo Section E/R của đặc tả gốc)

- **API key không bao giờ hard-code**: đọc từ biến môi trường (fallback
  server) hoặc do giáo viên tự nhập qua UI; không có key nào nằm trong code.
- **API key không bao giờ log**: `apiKeys.ts` chỉ log `err.message` của lỗi
  hệ thống, không bao giờ log biến `apiKey`/`plaintext`. Khi hiển thị lại
  trên UI chỉ hiện 4 ký tự cuối (`last4`).
- **Mã hoá tại chỗ (at rest)**: API key được mã hoá AES-256-GCM
  (`lib/crypto.ts`) trước khi ghi SQLite — kể cả nếu file `.sqlite` bị lộ,
  key vẫn không đọc được nếu không có `API_KEY_ENCRYPTION_SECRET`.
- **Xác thực OAuth đúng cách**: server xác thực chữ ký + audience của Google
  ID token bằng `google-auth-library` (`OAuth2Client.verifyIdToken`), không
  tin thông tin người dùng do client tự khai báo.
- **User Data Isolation**: mọi bảng dữ liệu của giáo viên có cột
  `owner_email`; mọi route đọc/ghi bắt buộc đi qua `requireAuth` và lọc theo
  `req.userEmail` lấy từ session đã xác thực — không có endpoint nào nhận
  `email` từ body/query của client.
- **Giới hạn domain đăng nhập (tuỳ chọn)**: `ALLOWED_EMAIL_DOMAINS` giới hạn
  tài khoản Google được phép, phù hợp mô hình Google Workspace for
  Education của một trường cụ thể.
- **Fail-safe cấu hình thiếu**: server từ chối khởi động nếu thiếu
  `SESSION_SECRET`/`API_KEY_ENCRYPTION_SECRET` thay vì chạy với giá trị mặc
  định không an toàn (đã kiểm thử — xem `TEST_REPORT.md`).

## Giới hạn đã biết — cần xử lý trước khi đưa ra domain công khai/production

1. **Session token tự ký (`lib/session.ts`) là giải pháp tạm cho local
   dev.** Nó dùng HMAC-SHA256 tự triển khai, không có cơ chế thu hồi
   (revoke) phiên trước khi hết hạn 7 ngày, không có rotate secret an toàn
   (đổi `SESSION_SECRET` sẽ làm mọi phiên đang đăng nhập bị đăng xuất ngay
   lập tức — chấp nhận được, nhưng cần biết trước). Khi triển khai thật lên
   domain công khai, nên thay bằng thư viện session trưởng thành hơn (ví dụ
   `iron-session`) hoặc session lưu ở DB có thể thu hồi.
2. **SQLite không phù hợp môi trường serverless/nhiều instance.** File
   `.sqlite` nằm trên đĩa cục bộ của 1 tiến trình — nếu deploy nhiều instance
   (ví dụ auto-scale) sẽ không chia sẻ dữ liệu đúng. Phù hợp cho 1 server
   node duy nhất (VPS, container 1 instance) ở giai đoạn hiện tại; đặc tả
   gốc cũng ghi nhận cần "adapter layer" cho DB production sau này.
3. **`npm audit` còn 4 lỗ hổng transitive dependency** (không nằm trong code
   tự viết):
   - `esbuild` (qua `vite`, dev-only): cho phép website bất kỳ gửi request
     tới dev server và đọc phản hồi khi đang chạy `npm run dev` — không ảnh
     hưởng bản build production, chỉ ảnh hưởng máy đang chạy `vite dev`
     cục bộ. Rủi ro thấp cho môi trường phát triển thông thường; muốn vá
     triệt để cần nâng Vite lên major mới (breaking change, chưa làm ở M1
     để tránh phá vỡ scaffold vừa dựng).
   - `uuid` <11.1.1 (qua `gaxios` ← `google-auth-library`): lỗi bounds-check
     khi tự truyền buffer vào hàm sinh UUID — thư viện `google-auth-library`
     không dùng theo cách bị ảnh hưởng trong luồng xác thực ID token mà ta
     dùng. Rủi ro thấp trong phạm vi sử dụng hiện tại.
   - Sẽ theo dõi và nâng cấp khi `google-auth-library`/`vite` phát hành bản
     vá cập nhật dependency.
4. **Chưa có rate-limiting** trên `/api/auth/google` hay `/api/api-keys` —
   nên thêm trước khi public (ví dụ `express-rate-limit`) để chống brute
   force / lạm dụng gọi validate key liên tục.
5. **CORS hiện cho phép đúng 1 origin** (`CLIENT_ORIGIN`), mặc định
   `http://localhost:5173` — cần cập nhật biến này thành domain thật khi
   deploy, nếu không mọi request từ domain production sẽ bị CORS chặn (lỗi
   an toàn — chặn nhầm còn hơn cho qua nhầm).
6. **Chưa có kiểm thử tự động cho `lib/crypto.ts`/`lib/session.ts`** (xem
   `TEST_REPORT.md`) — đây là 2 file nhạy cảm nhất về bảo mật trong M1, nên
   là ưu tiên viết test đầu tiên trước khi thêm tính năng mới.
7. **Upload nguồn dữ liệu (M2) đã áp dụng các kiểm tra theo Section R**:
   - Giới hạn kích thước 8MB/file (`multer`, `limits.fileSize`), trả lỗi 413
     rõ ràng khi vượt — đã kiểm thử thật với file 9MB.
   - Đối chiếu đuôi file khai báo + `mimetype` khai báo với danh sách cho
     phép theo từng slot (PL1 chỉ `.docx`, SGK chỉ `.pdf`).
   - **Kiểm tra chữ ký nhị phân thật** của file (`PK` cho OOXML/.docx,
     `%PDF` cho .pdf) — chặn file đổi tên đuôi để giả mạo định dạng; đây là
     lớp phòng vệ độc lập với bước kiểm tra đuôi/MIME ở trên (không tin một
     phía duy nhất).
   - Chưa quét nội dung `.docx` để phát hiện macro (VBA) nhúng bên trong —
     hiện chỉ chặn được macro-enabled format qua đuôi file (`.docm`/`.dotm`
     bị từ chối vì không nằm trong danh sách đuôi cho phép), nhưng **chưa
     kiểm tra macro nhúng trái phép bên trong 1 file mang đuôi `.docx`
     "sạch"** (về lý thuyết OOXML `.docx` chuẩn không chứa macro, khác với
     `.docm`, nên rủi ro thấp nhưng chưa được xác minh bằng công cụ quét
     chuyên dụng). Nên bổ sung khi có yêu cầu bảo mật cao hơn.
   - File được lưu trên đĩa tại `storage/uploads/<projectId>/<slot><ext>`
     — tên file trên đĩa do server đặt (không dùng trực tiếp tên file gốc
     người dùng tải lên), tránh path traversal qua tên file độc hại.
8. **`multer@2.x`** được dùng thay vì `1.x` (bản `1.x` đã cũ, không còn bảo
   trì và có các lỗ hổng đã biết theo cảnh báo deprecation của chính npm).
