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
- Tích hợp thành công **Theme Mode (Sáng/Tối)** thông qua `next-themes` và kỹ thuật **CSS Inversion** trong `globals.css` (bảo toàn 100% giao diện dark mode cũ, ghi đè màu sắc linh hoạt qua biến CSS khi sang light mode).

## 5. Các công việc/Giải pháp đề xuất tiếp theo (Next Steps - Cập nhật 21/07/2026)

### 5.1. Hoàn thiện Module Quản trị (Cài đặt)
1. **Người dùng & Phân quyền (Role-based Access)**: Tích hợp Supabase Auth vào tab "Người dùng" trong Cài đặt để quản lý tài khoản, giới hạn quyền (Admin, Chuyên viên, Người xem) và gán (Assign) văn bản cho người phụ trách.
2. **Nhật ký hoạt động (Audit Logs) & Cấu hình**: Phát triển tab "Hệ thống" để lưu vết ai đã tạo/sửa/xóa văn bản nào, đồng thời cung cấp giao diện quản lý ID thư mục Google Drive thay vì phải sửa trực tiếp trong code.

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
