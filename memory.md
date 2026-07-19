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

## 5. Các công việc/Giải pháp đề xuất tiếp theo (Next Steps)
1. **Hoàn thiện Module Bản đồ GIS**: Hiện tại tab GIS trên `page.js` mới chỉ là placeholder. Cần đưa `GisMap.js` vào và đồng bộ tọa độ không gian với dự án.
2. **Cấu hình Remote Git (GitHub)**: Hiện tại dự án đã commit local nhưng chưa có remote repo. Cần kết nối `git remote add origin <URL>` để lưu trữ code lên Cloud an toàn.
3. **Phân quyền người dùng (Role-based Access)**: Cần tích hợp Supabase Auth để giới hạn quyền Xem/Sửa tài liệu, Tiến độ.
4. **Tối ưu Load Google Drive**: Bổ sung bộ nhớ đệm (Redis/Local Storage) hoặc Pagination cho cây thư mục Drive để cải thiện tốc độ khi dự án có hàng nghìn file.
