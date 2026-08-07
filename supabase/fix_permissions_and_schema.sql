-- =====================================================================
-- FIX SCRIPT: Sửa lỗi permissions và schema không khớp
-- Chạy script này trong Supabase Studio (http://127.0.0.1:54323)
-- Tab: SQL Editor → New Query → Paste → Run
-- =====================================================================

-- ─── PHẦN 1: CẤP QUYỀN TRUY CẬP CHO CÁC ROLE ─────────────────────
-- Lý do lỗi: Các bảng được tạo nhưng KHÔNG có lệnh GRANT quyền cho
-- role anon/authenticated nên PostgREST trả về "permission denied"
-- ─────────────────────────────────────────────────────────────────────

-- Cấp quyền cho anon (user chưa đăng nhập)
GRANT SELECT ON public.documents         TO anon;
GRANT SELECT ON public.tasks             TO anon;
GRANT SELECT ON public.plots             TO anon;
GRANT SELECT ON public.plot_documents    TO anon;
GRANT SELECT ON public.task_documents    TO anon;
GRANT SELECT ON public.drive_folders_flat TO anon;
GRANT SELECT ON public.drive_file_metadata TO anon;

-- Cấp quyền đầy đủ cho authenticated (user đã đăng nhập)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plots             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plot_documents    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_documents    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_folders_flat TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_file_metadata TO authenticated;

-- Cấp quyền cho service_role (dùng trong server-side code)
GRANT ALL ON public.documents         TO service_role;
GRANT ALL ON public.tasks             TO service_role;
GRANT ALL ON public.plots             TO service_role;
GRANT ALL ON public.plot_documents    TO service_role;
GRANT ALL ON public.task_documents    TO service_role;
GRANT ALL ON public.drive_folders_flat TO service_role;
GRANT ALL ON public.drive_file_metadata TO service_role;


-- ─── PHẦN 2: THÊM CÁC CỘT THIẾU TRONG BẢNG documents ───────────────
-- Lý do: Code trong documents/route.js SELECT cột "name" và "folder"
-- nhưng bảng thực tế chỉ có "file_name" và không có "folder"
-- ─────────────────────────────────────────────────────────────────────

-- Thêm cột "name" alias (hoặc đổi tên) - thêm cột folder và name nếu chưa có
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS size TEXT;

-- Đồng bộ giá trị: Nếu cột name trống thì copy từ file_name
UPDATE public.documents SET name = file_name WHERE name IS NULL;

-- Tạo view để tương thích ngược (tùy chọn - không bắt buộc nếu đã add column)
-- CREATE OR REPLACE VIEW public.documents_view AS
-- SELECT id, file_name as name, file_path, folder, category, ...


-- ─── PHẦN 3: TẠO BẢNG issuing_agencies NẾU CHƯA CÓ ────────────────
-- Lý do: API /api/settings/agencies dùng bảng này nhưng không được tạo
-- trong migration script ban đầu
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.issuing_agencies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chèn dữ liệu mẫu các cơ quan ban hành thường gặp
INSERT INTO public.issuing_agencies (name, abbreviation, notes) VALUES
('Ban Quản lý Đường sắt Đô thị TP.HCM', 'BQLĐSĐT', 'Chủ đầu tư dự án Metro'),
('Văn phòng Đăng ký Đất đai TP.HCM', 'VPĐKĐĐ', 'Cơ quan quản lý đất đai TP'),
('Sở Nông nghiệp & Phát triển Nông thôn TP.HCM', 'SNN-PTNT', 'Quản lý mảng xanh, cây xanh'),
('Công ty TNHH Phát triển Phú Mỹ Hưng', 'PMH', 'Hạ tầng khu đô thị Phú Mỹ Hưng'),
('Tổng Công ty Xây dựng Lũng Lô - Bộ Quốc phòng', 'TCT Lũng Lô', 'RPBM - Bộ Quốc phòng'),
('Tổng Công ty Thành An - Binh đoàn 11', 'TCT Thành An', 'RPBM - Binh đoàn 11'),
('Lữ đoàn Công binh 239 - Binh chủng Công binh', 'LĐ 239', 'RPBM'),
('Lữ đoàn Công binh 299 - Quân đoàn 12', 'LĐ 299', 'RPBM'),
('Trung tâm Xử lý Bom mìn Quốc gia', 'TBMNT', 'RPBM - Trung ương'),
('UBND TP.HCM', 'UBND TP', 'Ủy ban Nhân dân Thành phố'),
('UBND Quận 7, TP.HCM', 'UBND Q7', 'Ủy ban Nhân dân Quận 7'),
('Chi nhánh Văn phòng Đăng ký Đất đai - CN1', 'CN1-VPĐKĐĐ', 'Chi nhánh 1'),
('Xí nghiệp Truyền dẫn Nước sạch', 'TDNS', 'Hạ tầng cấp nước')
ON CONFLICT (name) DO NOTHING;

-- Cấp quyền bảng mới
GRANT SELECT ON public.issuing_agencies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issuing_agencies TO authenticated;
GRANT ALL ON public.issuing_agencies TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.issuing_agencies_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.issuing_agencies_id_seq TO service_role;


-- ─── PHẦN 4: KÍCH HOẠT ROW LEVEL SECURITY (RLS) ─────────────────────
-- Hiện tại tắt RLS để mọi query đều chạy được (môi trường dev local)
-- Khi deploy production, bật RLS và thêm policy xác thực
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.documents          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plot_documents     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_documents     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_folders_flat DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_file_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issuing_agencies   DISABLE ROW LEVEL SECURITY;


-- ─── PHẦN 5: VERIFY - Kiểm tra kết quả ──────────────────────────────
SELECT 'documents' as table_name, COUNT(*) as row_count FROM public.documents
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'plots', COUNT(*) FROM public.plots
UNION ALL
SELECT 'drive_file_metadata', COUNT(*) FROM public.drive_file_metadata
UNION ALL
SELECT 'drive_folders_flat', COUNT(*) FROM public.drive_folders_flat
UNION ALL
SELECT 'issuing_agencies', COUNT(*) FROM public.issuing_agencies;
