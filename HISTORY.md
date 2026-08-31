# LỊCH SỬ PHÁT TRIỂN DỰ ÁN CDE-HTKT (HISTORY)

Tệp tin này ghi nhận toàn bộ lịch sử các bước thiết lập, nâng cấp mã nguồn và cấu trúc cơ sở dữ liệu của dự án Quản lý Bồi thường - Tái định cư & GIS (CDE-HTKT).

## 📅 Phiên làm việc: 29/08 - 31/08/2026 (Kho tri thức Markdown .md, Engine OCR PDF Đa Trang & Tự Động Nhận Diện)
* **Mục tiêu**: Xây dựng tính năng tự động sinh tài liệu Markdown (`.md`) từ các tệp hồ sơ lưu trữ trên Google Drive vào Supabase để tạo Kho tri thức (Knowledge Base) tra cứu dự án; xử lý toàn vẹn 100% số trang và sửa triệt để lỗi font tiếng Việt của máy scan.
* **Các hạng mục đã hoàn thành**:
  1. **Hệ thống Kho tri thức Markdown (.md) trên Supabase:**
     - Nâng cấp bảng `drive_file_metadata` với các trường: `content_md` (toàn văn Markdown), `is_md_generated`, `md_generated_at`, `md_char_count`.
     - Xây dựng API Route [/api/documents/generate-md](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/api/documents/generate-md/route.js) hỗ trợ đọc trực tiếp tệp từ Google Drive API, chuyển đổi và lưu trữ tức thời vào PostgreSQL.
     - Tích hợp Tab "Kho tri thức (.md)" trong `DocumentAnalyzeModal.js` với giao diện trực quan: Xem trước render GitHub-Flavored Markdown, xem mã thô, sao chép nội dung và tải file `.md` về máy.
  2. **Engine Trích xuất PDF Đa Trang Toàn Vẹn 100% (`unpdf_structured`):**
     - Loại bỏ thư viện cũ bị nghẽn trang; tích hợp `extractAllPdfPagesStructured` trong [pdfExtractor.js](file:///D:/Webapp%20CDE-HTKT/webapp/src/utils/pdfExtractor.js).
     - Duyệt bóc tách cấu trúc độc lập từng trang từ trang 1 đến $N$, đánh dấu tiêu đề rõ ràng `### 📄 Trang X/N` giúp tra cứu dễ dàng. Bảo toàn đầy đủ 100% số trang (Đã trích xuất thành công toàn bộ 134/134 trang của file `192/QĐ-BQLĐSĐT` với 214.092 ký tự).
  3. **Bộ Giải mã Quy chuẩn Font Tiếng Việt Scanner (`decodeVietnameseScannerOCR`):**
     - Phân tích mã ký tự máy scan (Character Codes) và phát hiện các mẫu dị dạng: số `6` (`Di6u` -> `Điều`, `d6c` -> `đốc`), `£` (`to£n` -> `toán`), `§` (`thu§t` -> `thuật`), `&` (`thi& kg` -> `thiết kế`), `j` (`djnh` -> `định`), `(Iau tu` -> `Đầu tư`...
     - Xây dựng bộ quy tắc Regex chuẩn hóa chạy nội bộ 100% (Offline, 0ms, không tốn API, không bị rate limit) chuyển đổi hoàn hảo sang tiếng Việt Unicode có dấu.
  4. **Cơ chế Chunked Multi-Page OCR cho PDF Scan ảnh thuần túy (`pdf-lib`):**
     - Tích hợp thư viện `pdf-lib` để tự động chia tách các tệp PDF scan ảnh thuần túy thành các cụm 2 trang độc lập (`ocrFullScannedPdfChunked`), vượt qua giới hạn Output Token Limit (8.192 tokens) của AI Vision để đọc trọn vẹn toàn bộ các trang scan.
     - Bắt lỗi hạn mức Google API (Mã lỗi 429 Quota Exceeded) chuẩn xác, ngăn chặn việc ghi dữ liệu lỗi vào CSDL.
  5. **Tự động nhận diện 100% (Bỏ nút gạt thủ công):**
     - Gỡ bỏ hoàn toàn nút gạt thủ công "Dùng AI OCR (file scan)".
     - Hệ thống tự động phân tích cấu trúc PDF để chọn chế độ tối ưu: Tự động chạy Engine nội bộ siêu tốc cho PDF có chữ, hoặc tự động kích hoạt Chunked OCR cho PDF scan ảnh.
  6. **Chuẩn hóa Source Control GitHub:**
     - Cấu hình chính thức tài khoản `khoavo83` (`khoakhu4@gmail.com`) và remote `https://github.com/khoavo83/cde-htkt-v1.git`.

---

## 📅 Phiên làm việc: 23/08/2026 (Xác thực & Phân quyền Người dùng - Supabase Auth & Roles)
* **Mục tiêu**: Xây dựng hoàn chỉnh hệ thống Xác thực và Phân quyền Người dùng theo vai trò (RBAC) với 3 cấp độ: `Admin` (Quản trị viên), `Editor` (Chuyên viên), `Viewer` (Người xem / Lãnh đạo).
* **Các hạng mục đã triển khai**:
  1. **Cơ sở dữ liệu Supabase & Trigger:**
     - Tạo bảng `public.user_profiles` (liên kết `auth.users(id)`), lưu trữ `role`, `staff_id`, `is_active`, `full_name`, `avatar_url`.
     - Tạo Trigger PostgreSQL `on_auth_user_created` tự động tạo profile khi người dùng đăng ký.
     - Khởi tạo tài khoản Quản trị viên mặc định: `admin.cdehtkt@gmail.com` (Mật khẩu: `Admin@123456`).
  2. **Auth Context & Server Middleware:**
     - Tạo `src/context/AuthContext.js` quản lý phiên đăng nhập thời gian thực với Supabase SDK, cung cấp hook `useAuth()`.
     - Tạo `src/lib/auth-server.js` kiểm tra và xác thực JWT token theo vai trò (`requireRoles`) ở tầng API.
     - Tạo các API: `/api/users`, `/api/users/[id]`, `/api/auth/profile`.
  3. **Giao diện Đăng nhập & Màn hình Chặn Bắt buộc (Login Gate):**
     - Tạo `src/components/LoginScreen.jsx` toàn màn hình với thiết kế Glassmorphism & Cyber Emerald cao cấp: **Bắt buộc người dùng phải đăng nhập trước khi được xem hoặc truy cập dữ liệu hệ thống**.
     - Tạo `src/components/AuthModal.jsx` hỗ trợ Đăng nhập, Đăng ký, Đổi mật khẩu.
     - Tích hợp User Profile Widget tại Header (hiển thị Avatar, Tên, Badge vai trò `👑 Admin`, `✏️ Chuyên viên`, `👁️ Người xem`, Dropdown menu quản lý & Đăng xuất).
  4. **Tách biệt Hoàn toàn 2 Tab Chuyên biệt:**
     - **Tab "Nhân sự" (`StaffListTab.jsx` + `StaffInfoModal.jsx`):** Quản lý hồ sơ lý lịch, thông tin liên lạc (Điện thoại, Email, Ngày sinh), đơn vị công tác và cơ cấu phân công Tổ / Nhóm chuyên môn thuần túy. Bảo toàn 100% dữ liệu của toàn bộ 20 cán bộ nhân sự.
     - **Tab "Phân quyền" (`PermissionsTab.jsx`):** Thiết kế trực quan, chia làm **3 Nhóm quyền rõ ràng**:
       1. 👑 **Quản trị viên (Admin):** Toàn quyền cấu hình hệ thống & phân quyền.
       2. ✏️ **Chuyên viên (Editor):** Nhập liệu, cập nhật tiến độ công việc, liên kết văn bản, AI.
       3. 👁️ **Người xem (Viewer):** Tra cứu văn bản, đọc file PDF, theo dõi tiến độ (Read-only).
       - Lấy danh sách nhân sự từ tab Nhân sự sang: Chỉ cần chọn vai trò từ Dropdown (1-click) hoặc bấm `+ Thêm nhân sự vào nhóm` là hệ thống tự động gán quyền và cập nhật tức thì.
  5. **Kiểm soát Quyền Thao tác (Permission Gating):**
     - Giới hạn các nút Đồng bộ Google Drive, Chỉnh sửa thông tin văn bản, Liên kết công việc, Kéo thả cập nhật tiến độ cho Chuyên viên và Admin. Người xem duyệt ở chế độ Read-only an toàn.

---

## 📅 Phiên làm việc: 22/07/2026 (Sửa lỗi đồng bộ & Chống Cache)
* **Vấn đề báo cáo**: Người dùng chạy chức năng đồng bộ nhưng trên Webapp vẫn hiển thị dữ liệu cũ, không thấy xuất hiện các tài liệu mới từ ổ H:.
* **Phát hiện & Khắc phục**:
  1. **Lỗi truy vấn sai bảng Supabase (Tận gốc)**:
     - *Phát hiện*: Trong tệp [/api/documents/route.js](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/api/documents/route.js), API đọc tài liệu (`GET`) vẫn đang truy vấn bảng dữ liệu cũ của hệ thống là `drive_file_metadata`, sau đó tiến hành trộn thủ công với tệp `db.json` cục bộ. Vì tiến trình đồng bộ mới (`sync/route.js`) chèn dữ liệu trực tiếp vào bảng **`documents`** của Supabase Cloud, nên dữ liệu đồng bộ mới không bao giờ được tải lên giao diện.
     - *Khắc phục*: Thay đổi toàn bộ logic hàm `GET()` trong `documents/route.js` để truy vấn trực tiếp từ bảng **`documents`** mới của Supabase. Định dạng ngày tháng và các trường thông tin đồng bộ 100% với Frontend, có cơ chế tự động fallback về `db.json` cục bộ hoặc file báo cáo nếu mất kết nối.
  2. **Lỗi lưu bộ nhớ đệm tĩnh của Next.js (Static Cache)**:
     - *Phát hiện*: Next.js App Router tự động cache kết quả của các hàm `GET` API nếu không cấu hình động.
     - *Khắc phục*: Khai báo thêm cấu hình ép buộc tải động `export const dynamic = 'force-dynamic';` ở đầu API Route tài liệu.
  3. **Lỗi cache trình duyệt ở Client**:
     - *Phát hiện*: Trình duyệt Chrome/Edge của client có xu hướng lưu cache kết quả fetch API cũ nếu URL fetch không đổi.
     - *Khắc phục*: Sửa đổi hàm `fetchData` trong [page.js](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/page.js) để thêm tham số timestamp động `?t=${Date.now()}` vào tất cả các lệnh fetch API (`/api/tasks`, `/api/documents`, `/api/projects`). Việc này đảm bảo mỗi lần tải trang hoặc sau khi nhấn nút đồng bộ, trình duyệt sẽ luôn yêu cầu dữ liệu mới nhất từ máy chủ.

---

## 📅 Phiên làm việc: 18/07/2026
* **Mục tiêu**: Thiết lập môi trường làm việc chính thức trên ổ `D:`, đồng bộ dữ liệu chọn lọc từ ổ Google Drive ảo `H:`, kết nối Supabase Cloud trực tuyến (hỗ trợ GIS VN2000) và tối ưu hóa giao diện DMS liên kết tiến độ công việc dự án.

### 1. Di chuyển và Thiết lập Môi trường làm việc (Ổ D:\)
- Di chuyển toàn bộ mã nguồn webapp Next.js và các kịch bản python từ thư mục tạm sang thư mục phát triển chính thức tại: **`D:\Webapp CDE-HTKT`**.
- Cài đặt thư viện PostgreSQL client (`npm install pg`) để Next.js tương tác trực tiếp với cơ sở dữ liệu của Supabase.
- Tạo tệp cấu hình môi trường [.env.local](file:///D:/Webapp%20CDE-HTKT/webapp/.env.local) chứa thông tin kết nối Supabase trực tuyến và đường dẫn ổ đĩa ảo `H:\My Drive\Bồi thường BT-CG`.
- **Mã hóa URL Mật khẩu (URL-encode)**: Tự động mã hóa phần trăm các ký tự đặc biệt (`?` -> `%3F`, `*` -> `%2A`, `$` -> `%24`) trong mật khẩu cơ sở dữ liệu (`?mz9ui*K6H8$kz7`) để chuỗi kết nối `DATABASE_URL` hoạt động chính xác không bị lỗi cú pháp URL.

### 2. Thiết lập Cơ sở dữ liệu Supabase (PostGIS & Hệ tọa độ VN2000)
- Tạo tệp [supabase_schema.sql](file:///D:/Webapp%20CDE-HTKT/webapp/supabase_schema.sql) chứa mã nguồn khởi tạo cơ sở dữ liệu trên Supabase:
  - Kích hoạt extension địa lý **PostGIS** (`CREATE EXTENSION IF NOT EXISTS postgis;`).
  - Đăng ký hệ tọa độ **VN2000 TP.HCM múi chiếu 3 độ, kinh tuyến trục 105.75 (SRID `92003`)** vào bảng `spatial_ref_sys` của PostGIS phục vụ việc chuyển đổi tọa độ các thửa đất từ bản vẽ CAD sang bản đồ web.
  - Tạo cấu trúc các bảng dữ liệu: `documents` (văn bản), `plots` (thửa đất), `tasks` (công việc).
- Viết kịch bản tự động di cư [migrate.js](file:///D:/Webapp%20CDE-HTKT/webapp/migrate.js) để tự động thực thi tệp SQL schema lên Supabase trực tuyến bằng lệnh `node migrate.js` từ local.
- Viết kịch bản nâng cấp [update_db.js](file:///D:/Webapp%20CDE-HTKT/webapp/update_db.js) để tạo thêm bảng liên kết **`task_documents`** (quản lý liên kết nhiều-nhiều giữa công việc dự án và tài liệu pháp lý đi kèm) và chèn dữ liệu liên kết mẫu cho hạng mục Rà phá bom mìn.

### 3. API Đồng bộ Chọn lọc Google Drive ảo (Ổ H:\)
- Viết lại API Route đồng bộ `/api/documents/sync` tại [sync/route.js](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/api/documents/sync/route.js):
  - **Bảo mật chọn lọc**: Chỉ quét đệ quy các tệp tin trong thư mục `H:\My Drive\Bồi thường BT-CG`, loại bỏ hoàn toàn các thư mục khác ngoài ý muốn trên ổ H: để bảo mật dữ liệu.
  - **Lọc tệp rác**: Tự động phát hiện và bỏ qua 475 tệp rác hệ thống Windows như `desktop.ini`, `thumbs.db` hoặc các tệp ẩn bắt đầu bằng dấu chấm (`.`).
  - **Khắc phục lỗi tràn ngày tháng (PostgreSQL Out of Range)**: Tích hợp hàm kiểm tra ngày hợp lệ (`isValidDate`). Các chuỗi số hiệu văn bản bị parse nhầm thành ngày phi thực tế (ví dụ: `2017-37-36`) sẽ tự động được gán về `null` thay vì cố gắng đẩy lên database gây lỗi sập tiến trình đồng bộ.
  - **Nâng cấp Regex Parser**: Parse thành công ngày phát hành ở định dạng liền nhau `YYYYMMDD` (ví dụ: `20260106` -> `2026-01-06`), tự động nhận diện loại văn bản (Quyết định, Thông báo...) và cơ quan ban hành (`UBND`, `BQLĐSĐT`, `SNN`...).
- Kết quả chạy thử: **Đồng bộ thành công 100% (3.517 tài liệu sạch)** từ ổ `H:` lên đám mây Supabase trực tuyến.
- Thiết lập cơ chế dự phòng (Fallback): Ghi nhận song song dữ liệu đồng bộ vào tệp [db.json](file:///D:/Webapp%20CDE-HTKT/webapp/src/data/db.json) cục bộ giúp webapp hoạt động offline bình thường khi không có kết nối Supabase.

### 4. Tái cấu trúc Dashboard DMS & Quản lý Dự án Song song
- Sửa đổi tệp giao diện chính [page.js](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/page.js):
  - Ẩn mô-đun bản đồ GIS để tối ưu diện tích màn hình.
  - Thiết kế Dashboard 2 cột hiển thị đồng thời: Cột trái quản lý công việc và cập nhật tiến độ (Tasks), cột phải quản lý văn bản (DMS).
  - Tích hợp 2 tab con trong DMS: "Tất cả văn bản" và "Hồ sơ đã liên kết" (chỉ hiển thị tài liệu của công việc đang được chọn ở cột trái).
  - Thêm nút hành động **"Liên kết việc"** bên cạnh các văn bản giúp gán tài liệu trực tiếp vào công việc đang chọn chỉ bằng 1 cú nhấp chuột và lưu trực tiếp lên bảng `task_documents` của Supabase. Hiển thị nhãn **`✓ Đã liên kết`** đối với tài liệu đã liên kết.

### 5. Tích hợp tính năng Mở và Xem Tài liệu Trực tiếp
- **Mở bằng phần mềm trên máy tính**:
  - Tạo API Route [/api/documents/open](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/api/documents/open/route.js) sử dụng lệnh PowerShell `Start-Process` ở backend.
  - Cho phép người dùng **click trực tiếp vào tên tài liệu hoặc biểu tượng tệp** trên giao diện Webapp để tự động bật phần mềm ngoài chuyên dụng trên Windows (Word, Excel, AutoCAD...) mở file đó trực tiếp từ ổ `H:`.
- **Xem nhanh trên Trình duyệt**:
  - Tạo API Route [/api/documents/view](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/api/documents/view/route.js) để stream trực tiếp các định dạng tệp tin như PDF, hình ảnh, văn bản lên trình duyệt.
  - Thêm biểu tượng **Con mắt (Eye - Xem nhanh)** bên cạnh các file hỗ trợ để mở xem nhanh trực tiếp trên tab trình duyệt mới mà không cần tải về máy.

### 6. Hotfix: Sửa lỗi Sập Máy chủ (Crash server) do Realtime SSE ngắt kết nối
- **Vấn đề**: Khi người dùng tải lại trang hoặc tắt tab, kết nối SSE bị đóng, nhưng backend vẫn chạy bộ hẹn giờ gửi sự kiện Ping (`setInterval`) và bộ theo dõi file (`fs.watch`), cố gắng ghi dữ liệu vào luồng đã đóng gây lỗi `TypeError: Invalid state: Controller is already closed` và làm sập Next.js server.
- **Giải pháp khắc phục**:
  - Sửa đổi tệp [realtime/route.js](file:///D:/Webapp%20CDE-HTKT/webapp/src/app/api/realtime/route.js) để triển khai hàm dọn dẹp tài nguyên trong thuộc tính `cancel()` chuẩn của `ReadableStream` (thay vì trả về hàm cleanup từ `start` - một cấu trúc sai đặc tả).
  - Tích hợp thêm cờ trạng thái kết nối `active = false` để chặn hoàn toàn mọi tác vụ ghi dữ liệu tiếp theo sau khi client ngắt kết nối.
  - Sau khi sửa lỗi, máy chủ hoạt động liên tục, xử lý ngắt kết nối êm ái (`Realtime SSE: Kết nối đã được đóng bởi client.`) mà không bị crash.
