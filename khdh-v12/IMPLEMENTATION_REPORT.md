# Báo cáo triển khai — KHDH V12 RC2

Tài liệu này nói thật về những gì đã chạy được và những gì chưa, theo từng
milestone của đặc tả gốc (Section S). Mục tiêu là để người tiếp theo (hoặc
phiên làm việc sau) biết chính xác phải bắt đầu từ đâu, không cần đoán.

## Trạng thái tổng quan

| Milestone | Nội dung theo đặc tả | Trạng thái |
|---|---|---|
| M1 | Scaffold monorepo, Google OAuth, quản lý API key | ✅ **Hoàn thành** |
| M2 | Nạp 4 nguồn dữ liệu (PL1 docx, SGK pdf, KHDH cũ, Form tổ) | ✅ **Hoàn thành** |
| M3 | Lesson Catalog, Blueprint, sinh KHDH | ❌ Chưa làm |
| M4 | NLS Map, Period Map, Slide Prompts | ❌ Chưa làm |
| M5 | Worksheet ("Phiếu học tập") | ❌ Chưa làm |
| M6 | Game tương tác HTML5 (≥16 loại) | ❌ Chưa làm |
| M7 | AI Video prompt package | ❌ Chưa làm |
| M8 | Tinh chỉnh thủ công: khoá khối, lịch sử phiên bản, dependency graph | ❌ Chưa làm |
| M9 | Preferences (lưu quy tắc mặc định theo bài/môn/khối/tài khoản) | ❌ Chưa làm |
| M10 | Thống kê & QA scorecard | ❌ Chưa làm |
| M11 | Xuất file (tái dùng pipeline docx/OMML từ bản V11-2) | ❌ Chưa làm |
| M12 | typecheck/lint/build/test toàn bộ + 5 tài liệu bàn giao | 🟡 **Một phần** — build/typecheck M1 đã xanh; chưa có gì ở M2-M11 để test |

## Chi tiết M1 (đã làm)

**Server** (`server/src`):
- `index.ts` — entrypoint Express; từ chối khởi động nếu thiếu
  `SESSION_SECRET`/`API_KEY_ENCRYPTION_SECRET` (fail-safe, đã kiểm thử thực
  tế — xem `TEST_REPORT.md`).
- `routes/auth.ts` — `POST /api/auth/google` xác thực ID token bằng
  `google-auth-library`, tạo session cookie HttpOnly; `GET /api/auth/me`;
  `POST /api/auth/ui-mode` lưu chế độ giao diện đã chọn.
- `routes/apiKeys.ts` — CRUD API key theo `owner_email`, gọi thử API thật
  (`api.anthropic.com/v1/models`, `generativelanguage.googleapis.com`) để
  xác thực trước khi lưu; `resolveApiKey()` là hàm dùng chung cho các module
  sinh nội dung AI ở M3+ (ưu tiên key riêng của giáo viên, fallback về key
  server).
- `lib/crypto.ts` — mã hoá/giải mã AES-256-GCM.
- `lib/session.ts` — session token tự ký HMAC-SHA256 (xem giới hạn trong
  `SECURITY_NOTES.md` — đây là giải pháp tạm cho local dev, chưa phải
  session store production-grade).
- `db/schema.ts`, `db/client.ts` — SQLite (`better-sqlite3`), bảng `users`,
  `api_keys`, `projects` (bảng `projects` mới là khung, chưa có route dùng
  tới — sẽ dùng ở M2).

**Client** (`client/src`):
- `App.tsx` — điều phối trạng thái đăng nhập, sidebar chế độ, khu vực API key.
- `components/GoogleLoginButton.tsx` — tích hợp Google Identity Services
  (`accounts.google.com/gsi/client`).
- `components/ApiKeyManager.tsx` — form nhập/xem/xoá API key 2 nhà cung cấp.
- `components/ModeSidebar.tsx` — 3 nút chế độ (Cơ bản/Nâng cao/Chuyên gia),
  hiện tại chỉ đổi trạng thái đã lưu, **chưa có nội dung/module khác nhau
  thực sự theo từng chế độ** — đó là việc của M2+.

**Đã xác minh chạy thật** (không chỉ đọc code):
- `npm install`, `npm run typecheck`, `npm run build` chạy sạch cho cả 2
  workspace.
- Server boot thật, `GET /api/health` trả 200, `GET /api/auth/me` khi chưa
  đăng nhập trả đúng 401.
- Server từ chối boot khi thiếu biến môi trường bắt buộc (test bằng cách
  unset và chạy trực tiếp `node dist/index.js`).

**Chưa xác minh được** (do sandbox không có Google OAuth Client ID thật để
thử):
- Luồng đăng nhập Google end-to-end (nhận ID token thật từ Google Identity
  Services, xác thực server-side, set cookie). Logic tuân theo đúng API
  chính thức của `google-auth-library`, nhưng chưa có bằng chứng chạy thật
  với 1 Client ID thật — người triển khai cần tự kiểm tra bước này theo
  `RUN_LOCAL.md`.
- Việc gọi API thật của Anthropic/Google AI để validate key (code có gọi
  thật, nhưng chưa có key thật hợp lệ trong sandbox để xác nhận nhánh
  "thành công"; đã xác nhận nhánh lỗi mạng được xử lý mềm — không chặn lưu key).

## Chi tiết M2 (đã làm)

**Server** (`server/src`):
- `db/schema.ts` — thêm bảng `sources` (khoá chính `project_id + slot`, mỗi
  dự án tối đa 1 file hiện hành cho mỗi trong 4 slot; upload lại sẽ ghi đè —
  Auto-Purge Cache, giống nguyên tắc đã dùng ở bản V11-2).
- `routes/projects.ts` — CRUD dự án (`name`, `subject`, `grade`), mọi truy
  vấn lọc theo `owner_email` của phiên đăng nhập.
- `routes/sources.ts` — `POST /api/sources/:projectId/:slot` nhận multipart
  upload (multer, bộ nhớ, giới hạn 8MB), kiểm tra:
  1. dự án có thuộc về người dùng hiện tại không;
  2. đuôi file + `mimetype` khai báo có khớp với slot không (PL1 chỉ nhận
     `.docx`, SGK chỉ nhận `.pdf`, 2 slot còn lại nhận cả hai);
  3. **chữ ký nhị phân thật của file** (`PK` cho .docx/OOXML, `%PDF` cho
     .pdf) — chặn file giả mạo đuôi/MIME, không chỉ tin theo tên file.
  Sau khi qua kiểm tra, file được ghi xuống `storage/uploads/<projectId>/`
  và nội dung được bóc tách ngay (xem dưới), lưu kết quả bóc tách dạng JSON
  trong cột `parsed_json`.
- `lib/parsing/ppctDocx.ts` — bóc tách bảng PPCT (Tuần/Tiết/Tên bài
  học/YCCĐ) từ `.docx` bằng `mammoth` (docx→HTML) + `cheerio` (dò cột theo
  tên tiêu đề bằng regex alias, không giả định thứ tự cột cố định — kế thừa
  đúng nguyên lý đã kiểm thử ở bản V11-2).
- `lib/parsing/pdfText.ts` — trích văn bản từ `.pdf` bằng `pdf-parse`.
- `lib/parsing/docxText.ts` — trích văn bản thô từ `.docx` (dùng cho KHDH
  cũ/Form tổ, chỉ cần nội dung tham khảo, chưa cần cấu trúc bảng).

**Client** (`client/src`):
- `components/ProjectPanel.tsx` — tạo/chọn/xoá dự án, hiển thị danh sách.
- `components/SourceSlotCard.tsx` — 1 thẻ cho mỗi slot trong 4 slot cố định,
  hiển thị trạng thái đã nạp/chưa nạp, xem trước kết quả bóc tách (số bài
  học đã nhận diện với PL1, số trang/ký tự với SGK...), thay file, xoá file.

**Đã sửa 1 lỗi thật phát hiện khi kiểm thử** (không chỉ đọc code): middleware
`requireAuth` trước đó chỉ xác thực chữ ký session token mà không kiểm tra
email trong token có còn tồn tại trong bảng `users` không. Dùng một session
token tự tạo thủ công để kiểm thử đã làm lộ ra: gọi tạo dự án với session đó
ném lỗi `SqliteError: FOREIGN KEY constraint failed` và Express trả về
trang HTML lỗi 500 mặc định (không phải JSON) — vừa xấu vừa không nhất quán
với `safeJson()` phía client. Đã sửa bằng cách kiểm tra `getUser(email)`
ngay trong `requireAuth`, đồng thời thêm 1 middleware bắt lỗi toàn cục ở
`index.ts` để mọi lỗi không lường trước từ nay đều trả JSON gọn gàng thay vì
trang lỗi mặc định của Express.

**Đã xác minh chạy thật** (không chỉ đọc code) — xem chi tiết trong
`TEST_REPORT.md`: sinh file `.docx` (có bảng PPCT thật) và `.pdf` bằng
LibreOffice, chạy toàn bộ luồng qua `curl` thật (tạo dự án → upload PL1 →
upload SGK → đọc lại dự án), xác nhận bóc tách đúng 3 bài học từ bảng mẫu và
đúng nội dung văn bản từ PDF mẫu; test các nhánh lỗi (sai định dạng theo
slot, file giả mạo đuôi `.docx` nhưng không phải OOXML thật, file quá
8MB, slot không tồn tại, chưa đăng nhập) đều trả lỗi đúng như thiết kế; test
cách ly dữ liệu — tài khoản khác không đọc được dự án/danh sách dự án của
tài khoản đầu tiên.

**Chưa làm ở M2** (để dành cho M3+, không giả vờ đã xong):
- Chưa có UI hiển thị toàn bộ bảng PPCT đã bóc tách cho giáo viên rà
  soát/sửa trực tiếp (như bản V11-2 có `LessonTable`) — hiện chỉ hiện số
  lượng bài học đã nhận diện được. Đây là việc cần làm ngay đầu M3 (Lesson
  Catalog) vì M3 cần đúng chức năng rà soát/sửa này trước khi chọn bài để
  soạn KHDH.
- Nội dung trích xuất từ SGK/KHDH cũ/Form tổ mới dừng ở "văn bản thô + xem
  trước 2000 ký tự", chưa có bước phân đoạn theo bài/chương để AI ở M3+
  trích đúng phần liên quan khi ngữ cảnh dài — cần cân nhắc chunking khi
  ghép vào prompt sinh KHDH.
- Chưa hỗ trợ OCR cho PDF dạng scan ảnh — khi phát hiện file gần như không
  có lớp văn bản (`lib/parsing/pdfText.ts` qua ngưỡng heuristic trong
  `routes/sources.ts`), hệ thống **báo cảnh báo rõ ràng cho giáo viên** thay
  vì âm thầm lưu nội dung rỗng; đã kiểm thử thật với 1 file PDF chỉ chứa
  ảnh trống.

## Vì sao dừng ở M2 thay vì cố làm hết 12 milestone

Đặc tả V12 RC2 mô tả một hệ thống ở quy mô sản phẩm nhiều tháng công sức
(sinh video AI có cấu trúc scene, ≥16 loại game tương tác HTML5 mỗi loại có
logic riêng, dependency graph đầy đủ với UI đồ hoạ, version history có diff,
QA scorecard...). Viết code chưa kiểm thử cho toàn bộ 10 milestone còn lại
trong một phiên sẽ tạo ra khối lượng lớn chức năng **trông như hoàn thiện
nhưng chưa được chạy thử một lần nào** — vi phạm đúng nguyên tắc mà tài liệu
này đang cố giữ: không báo cáo cái chưa chạy là đã xong.

## Đề xuất thứ tự làm tiếp

1. **M3** (Lesson Catalog + Blueprint + KHDH) là bước tiếp theo hợp lý —
   nguồn dữ liệu đã có (M2). Nên bắt đầu bằng UI rà soát/sửa bảng PPCT đã
   bóc tách (như `LessonTable` ở bản V11-2), rồi tái dùng phần lớn logic
   sinh nội dung/prompt đã có ở bản V11-2, chuyển sang gọi qua
   `resolveApiKey()` để hỗ trợ cả Anthropic lẫn Google AI.
2. **M11** (Export) nên làm sớm song song M3, vì hầu như tái dùng nguyên
   pipeline OMML/docx đã kiểm thử kỹ ở bản V11-2 — chi phí thấp, giá trị cao.
3. M4-M10 làm sau, theo đúng độ ưu tiên nghiệp vụ mà giáo viên/nhà trường
   xác nhận là cần dùng trước.
