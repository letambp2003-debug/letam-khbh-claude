# KHDH V12 RC2 — Nền tảng soạn giáo án mở rộng

> **Tình trạng dự án: Milestone 2/12 hoàn thành.** Đây là bản khởi tạo
> nghiêm túc cho một hệ thống có phạm vi rất lớn (12 milestone theo đặc tả
> gốc). Tài liệu này nói thật những gì đã chạy được và những gì còn chưa làm
> — xem chi tiết đầy đủ trong [`IMPLEMENTATION_REPORT.md`](./IMPLEMENTATION_REPORT.md).

## Đây là gì

Phiên bản kế tiếp của webapp KHDH (bản V11-2 đơn giản hơn nằm ở
`../khdh-webapp`), mở rộng thành một nền tảng nhiều module theo đặc tả V12
RC2: 4 nguồn dữ liệu đầu vào, Lesson Catalog, Blueprint, KHDH, NLS Map,
Period Map, Slide Prompts, Worksheet, Game tương tác, Video AI, tinh chỉnh
thủ công có khoá khối/lịch sử phiên bản, thống kê & QA, 3 chế độ giao diện.

## Kiến trúc

```
khdh-v12/
├── client/    Vite + React + TypeScript (SPA)
├── server/    Node + TypeScript + Express + SQLite (better-sqlite3)
├── agents/    (chỗ đặt logic gọi AI theo từng module — sẽ bổ sung từ M3+)
├── schemas/   (định nghĩa schema dữ liệu dùng chung — sẽ bổ sung từ M2+)
├── tests/     (kịch bản kiểm thử tích hợp — sẽ bổ sung dần)
├── storage/   dữ liệu cục bộ: SQLite file + file upload
└── docs/      tài liệu kỹ thuật bổ sung
```

## Đã hoàn thành (Milestone 1-2)

- Scaffold monorepo npm workspaces (`client` + `server`), build/typecheck sạch.
- Đăng nhập **Google Identity Services** (client) + xác thực ID token bằng
  `google-auth-library` (server) — không tin bất kỳ thông tin người dùng nào
  từ client mà chưa xác thực lại chữ ký/audience.
- Giới hạn đăng nhập theo domain email trường (tuỳ chọn, qua
  `ALLOWED_EMAIL_DOMAINS`), đúng tinh thần "Isolation Workspace".
- Quản lý **API key theo từng giáo viên** cho cả hai nhà cung cấp AI —
  **Anthropic Claude** và **Google AI (Gemini)** — nhập trên giao diện, xác
  thực với API thật trước khi lưu, mã hoá AES-256-GCM khi lưu SQLite, không
  bao giờ ghi log plaintext, có fallback về key mặc định của server
  (biến môi trường) nếu giáo viên chưa tự nhập.
- Khung giao diện 3 chế độ (Cơ bản / Nâng cao / Chuyên gia) — sidebar chọn
  chế độ, lưu lựa chọn theo tài khoản; **các module bên trong từng chế độ
  chưa được xây** (xem Implementation Report).
- **Nạp 4 nguồn dữ liệu cố định cho mỗi dự án**: Phụ lục I/PPCT (`.docx`,
  bắt buộc) — tự động bóc tách bảng Tuần/Tiết/Tên bài học/YCCĐ; Sách giáo
  khoa (`.pdf`, bắt buộc) — trích văn bản làm ngữ liệu tham khảo; KHDH cũ và
  Form mẫu của tổ (tuỳ chọn, `.docx` hoặc `.pdf`). Upload có kiểm tra đuôi
  file, MIME khai báo lẫn chữ ký nhị phân thật (chặn file giả mạo định
  dạng), giới hạn 8MB, cách ly hoàn toàn theo từng giáo viên/dự án.

## Chưa làm / còn giới hạn

Các module nghiệp vụ còn lại (Lesson Catalog rà soát/sửa bảng PPCT,
Blueprint, sinh KHDH, NLS/Period/Slide Map, Worksheet, Game, Video AI, tinh
chỉnh thủ công, thống kê/QA, export) **chưa được triển khai** — đây là các
milestone 3-11, được theo dõi ở task tracker và liệt kê rõ trong
`IMPLEMENTATION_REPORT.md`. Không có phần nào trong số này được giả lập để
trông như đã xong; những gì chưa làm được ghi rõ là **BLOCKED** hoặc
**CHƯA LÀM**.

## Bắt đầu nhanh

Xem [`RUN_LOCAL.md`](./RUN_LOCAL.md) để chạy ở máy local (cần tạo Google
OAuth Client ID và sinh 2 khoá bí mật).

## Bảo mật

Xem [`SECURITY_NOTES.md`](./SECURITY_NOTES.md) cho các quyết định và giới
hạn bảo mật hiện tại (mã hoá API key, xác thực OAuth, session tạm thời cho
bản local, các lỗ hổng transitive-dependency đã biết).

## Kiểm thử

Xem [`TEST_REPORT.md`](./TEST_REPORT.md) cho những gì đã được kiểm thử thực
tế (build, typecheck, boot server, các luồng auth/api-key) và những gì chưa
có kiểm thử tự động.
