# Webapp CDE-HTKT - Memory & Context

## 1. Giới thiệu
Đây là file lưu trữ ngữ cảnh (Context Memory) của dự án. 
Việc duy trì file này giúp AI Agent trong các phiên làm việc tiếp theo hiểu ngay lập tức kiến trúc, quy tắc, và trạng thái hiện tại của dự án mà **KHÔNG CẦN** phải đọc lại toàn bộ hàng nghìn dòng code.
**Lợi ích:** Tiết kiệm tối đa Token (tiết kiệm chi phí API), giảm thời gian phản hồi của AI và tránh lỗi logic do mất ngữ cảnh.

## 2. Kiến trúc & Công nghệ (Tech Stack)
- **Frontend**: Next.js 16.2 (App Router), React 19.
- **Styling**: Tailwind CSS v4, Lucide React (Icons).
- **Backend/API**: Next.js Route Handlers (`src/app/api/...`).
- **Database**: Supabase (PostgreSQL) + Local JSON Fallback (`src/data/db.json`).
- **Lưu trữ file**: Google Drive API (FolderTree).
- **Bản đồ**: Leaflet / React-Leaflet (GIS Map).

## 3. Cấu trúc thư mục cốt lõi
- `src/app/page.js`: Màn hình chính Dashboard (Quản lý văn bản, Tiến độ, GIS).
- `src/components/`: Các UI Component (FolderTree, DocumentAnalyzeModal, GisMap, ThemeProvider...).
- `src/app/api/`: Các API kết nối Supabase và Google Drive.
- `Lưu Trữ/`: Chứa các bản snapshot sao lưu định kỳ của dự án.

## 4. Trạng thái & Tính năng hiện tại
- Đã tích hợp Google Drive OAuth 2.0 (hiển thị cấu trúc cây thư mục).
- Đã liên kết Tiến độ công việc (Tasks) với Tài liệu (Documents).
- Tích hợp thành công **Theme Mode (Sáng/Tối)** thông qua `next-themes` và kỹ thuật **CSS Inversion** trong `globals.css`.
- **Xác thực & Phân quyền Người dùng (Supabase Auth & Roles):** Đã xây dựng hoàn chỉnh với 3 cấp độ: `Admin` (Quản trị viên), `Editor` (Chuyên viên), `Viewer` (Người xem), kèm màn hình đăng nhập modal, quản lý user trong Cài đặt, và kiểm soát quyền ở mọi thao tác.
- **Phân hệ Quản Lý Dự Án Toàn Diện (7 Tab Ngang Hàng):**
  1. *Thông tin dự án* (`ProjectOverviewTab`)
  2. *Tổng mức đầu tư* (`InvestmentTab`)
  3. *Kế hoạch vốn* (`CapitalPlanTab` - Ma trận vốn 2026-2030)
  4. *Gói thầu & HĐ* (`ContractManagementTab` - Quản lý Gói thầu, Hợp đồng & Phụ lục HĐ)
  5. *Tiến độ* (`ProjectProgressTab`)
  6. *Giải ngân* (`DisbursementTab` - So khớp 3 chiều, Tạm ứng, Nhật ký chi)
  7. *Pháp lý* (`FolderTree`)

## 5. Quy Chuẩn Bắt Buộc Vĩnh Viễn: Format Chuẩn Việt Nam (CRITICAL)
- **Ngày tháng:** Luôn hiển thị theo định dạng **`DD/MM/YYYY`** (ví dụ: `26/06/2026`, `01/01/2026`). TUYỆT ĐỐI KHÔNG hiển thị dạng `YYYY-MM-DD` hoặc chuỗi ISO `2026-06-26T00:00:00Z` trên giao diện người dùng. Bắt buộc dùng `formatDateVN()`.
- **Tiền tệ:** Dùng dấu chấm `.` phân cách hàng nghìn, dấu phẩy `,` cho thập phân, đơn vị `đ` hoặc `VNĐ` (ví dụ: `9.813.320.703.412 đ`, `5.574.573.235 đ`). Bắt buộc dùng `formatMoneyVN()`.
- **Số lượng & Diện tích:** Bắt buộc dùng `formatNumberVN()`.
- **Liên kết Pháp lý:** Mọi thực thể nghiệp vụ (TMĐT, Vốn, Gói thầu, Hợp đồng, Giải ngân) đều có khả năng chọn văn bản từ tab "Pháp lý" và có nút xem/mở file scan trực tiếp.

## 6. Các công việc/Giải pháp đề xuất tiếp theo (Next Steps)

### 5.1. Hoàn thiện Module Quản trị (Cài đặt)
1. **Nhật ký hoạt động (Audit Logs) & Cấu hình**: Phát triển tab "Hệ thống" để lưu vết ai đã tạo/sửa/xóa văn bản nào, đồng thời cung cấp giao diện quản lý ID thư mục Google Drive thay vì phải sửa trực tiếp trong code.

### 5.2. Nâng cấp Trải nghiệm Quản lý Văn bản (Core Features)
3. **Bộ lọc nâng cao (Advanced Filters)**: Bổ sung bộ lọc tại màn hình chính theo khoảng thời gian, trạng thái (còn hiệu lực, dự thảo), loại văn bản, và nơi phát hành.
4. **Thao tác hàng loạt (Batch Actions)**: Cho phép chọn nhiều văn bản để xóa, cập nhật trạng thái hoặc thao tác đồng loạt nhằm tiết kiệm thời gian.
5. **Dashboard Thống kê**: Bổ sung khu vực Dashboard tổng quan (biểu đồ số lượng văn bản, văn bản sắp hết hạn, v.v.).

### 5.3. Tối ưu hóa UI/UX & Hiệu suất
6. **Tích hợp PDF Viewer (Chế độ xem trước)**: Hiển thị file PDF trực tiếp trong Modal (thay vì mở tab mới) để người dùng dễ dàng vừa đọc vừa nhập liệu metadata.
7. **Export/Báo cáo**: Thêm tính năng xuất danh sách văn bản (đã lọc) ra file Excel/CSV để làm báo cáo nhanh.
8. **Phím tắt (Keyboard Shortcuts)**: Hỗ trợ các phím tắt như `Ctrl + S`, `Esc` để tăng tốc độ thao tác cho chuyên viên nhập liệu.
9. **Tối ưu Load Google Drive**: Bổ sung bộ nhớ đệm (Redis/Local Storage) hoặc Pagination cho cây thư mục Drive để cải thiện tốc độ khi dự án có hàng nghìn file.

### 5.4. Các hạng mục kỹ thuật khác
10. **Hoàn thiện Module Bản đồ GIS**: Đưa `GisMap.js` vào hoạt động thực tế trên tab GIS, đồng bộ tọa độ không gian với dự án.
11. **Cấu hình Remote Git (GitHub)**: Cần kết nối `git remote add origin <URL>` để lưu trữ an toàn mã nguồn lên Cloud (hiện tại mới chỉ lưu qua local Git).
