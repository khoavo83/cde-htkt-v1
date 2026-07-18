-- =====================================================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU CDE-HTKT TRÊN SUPABASE (POSTGRESQL)
-- Hỗ trợ GIS địa lý (PostGIS) và Hệ tọa độ VN2000 TP. Hồ Chí Minh
-- =====================================================================

-- 1. Kích hoạt tiện ích mở rộng PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Đăng ký hệ tọa độ VN2000 TP.HCM múi chiếu 3 độ, kinh tuyến trục 105.75 (SRID: 92003)
-- Cho phép chuyển đổi ngược/xuôi giữa bản vẽ CAD (tọa độ mét VN2000) và bản đồ Web (kinh/vĩ WGS84)
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext)
VALUES (
    92003, 
    'VN2000_HCM_3DEG', 
    92003, 
    '+proj=tmerc +lat_0=0 +lon_0=105.75 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.87,-39.3,-111.45,-0.008856,-0.014761,-0.03102,9.6738 +units=m +no_defs',
    'PROJCS["VN-2000 / TM 3 HCM",GEOGCS["VN-2000",DATUM["Vietnam_2000",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",105.75],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1]]'
) ON CONFLICT (srid) DO NOTHING;

-- 3. Tạo bảng documents (Lưu trữ thông tin văn bản pháp lý đã đồng bộ)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT UNIQUE NOT NULL, -- Đường dẫn duy nhất trên ổ H: để làm khóa đồng bộ
    document_type TEXT,            -- Loại văn bản: Quyết định, Thông báo, Tờ trình...
    document_date DATE,            -- Ngày phát hành
    issuing_agency TEXT,           -- Nơi phát hành (Cơ quan ban hành)
    receiving_agency TEXT,          -- Nơi nhận / Nơi gửi
    summary TEXT,                  -- Trích yếu nội dung
    category TEXT,                 -- Thư mục phân loại (Quy hoạch, Rà phá bom mìn...)
    file_size TEXT,                -- Dung lượng file
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng plots (Lưu trữ thông tin thửa đất bồi thường giải phóng mặt bằng)
CREATE TABLE IF NOT EXISTS plots (
    id TEXT PRIMARY KEY,           -- Mã thửa đất (ví dụ: plot-01, plot-02...)
    code TEXT NOT NULL,            -- Kí hiệu số hiệu thửa (TĐ-102, MX-PMH-01...)
    owner_name TEXT,               -- Chủ sở hữu / Chủ sử dụng đất bị ảnh hưởng
    address TEXT,                  -- Địa chỉ thửa đất
    area_m2 DOUBLE PRECISION,      -- Diện tích bị ảnh hưởng (m2)
    compensation_rate NUMERIC,     -- Đơn giá bồi thường (VNĐ/m2)
    status TEXT NOT NULL,          -- Trạng thái: completed, pending, disputed, processing
    status_text TEXT,              -- Diễn giải trạng thái bằng tiếng Việt
    progress_percent INTEGER DEFAULT 0, -- Tiến độ bàn giao (%)
    geom GEOMETRY(Polygon, 4326),  -- Tọa độ địa lý WGS84 (để vẽ trực tiếp lên bản đồ)
    geom_vn2000 GEOMETRY(Polygon, 92003), -- Tọa độ mét VN2000 gốc (để đo đạc chính xác)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tạo bảng tasks (Quản lý tiến độ/công việc dự án)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,           -- Mã công việc (task-01, task-02...)
    title TEXT NOT NULL,           -- Tiêu đề công việc
    category TEXT,                 -- Phân loại: Rà phá bom mìn, Giải phóng mặt bằng...
    assigned_to TEXT,              -- Đơn vị/Cá nhân thực hiện
    start_date DATE,               -- Ngày bắt đầu
    end_date DATE,                 -- Ngày kết thúc
    progress_percent INTEGER DEFAULT 0, -- Tiến độ thực hiện (%)
    status TEXT NOT NULL,          -- Trạng thái: completed, processing, pending
    priority TEXT,                 -- Độ ưu tiên: high, medium, low
    description TEXT,              -- Mô tả chi tiết công việc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tạo bảng liên kết nhiều-nhiều giữa thửa đất và tài liệu liên quan
CREATE TABLE IF NOT EXISTS plot_documents (
    plot_id TEXT REFERENCES plots(id) ON DELETE CASCADE,
    document_path TEXT, -- Tham chiếu đến file_path của documents
    PRIMARY KEY (plot_id, document_path)
);

-- 6.1 Tạo bảng liên kết giữa Công việc (Tasks) và Tài liệu (Documents)
CREATE TABLE IF NOT EXISTS task_documents (
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    document_path TEXT REFERENCES documents(file_path) ON DELETE CASCADE,
    PRIMARY KEY (task_id, document_path)
);

-- 7. Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_plots_modtime BEFORE UPDATE ON plots FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================================
-- CHÈN DỮ LIỆU THỬA ĐẤT MẪU VỚI TỌA ĐỘ BẢN ĐỒ WGS84 (ST_GeomFromText)
-- =====================================================================

INSERT INTO plots (id, code, owner_name, address, area_m2, compensation_rate, status, status_text, progress_percent, geom)
VALUES 
(
    'plot-01', 'TĐ-102', 'Nguyễn Văn Hùng', '120 Nguyễn Lương Bằng, Tân Phú, Quận 7', 450.5, 45000000, 
    'completed', 'Đã bàn giao mặt bằng', 100,
    ST_GeomFromText('POLYGON((106.7215 10.7285, 106.7218 10.7288, 106.7222 10.7284, 106.7219 10.7281, 106.7215 10.7285))', 4326)
),
(
    'plot-02', 'TĐ-103', 'Trần Thị Mai', '124 Nguyễn Lương Bằng, Tân Phú, Quận 7', 320.2, 48000000, 
    'pending', 'Đang thương thảo phương án', 60,
    ST_GeomFromText('POLYGON((106.7219 10.7281, 106.7222 10.7288, 106.7226 10.7280, 106.7223 10.7277, 106.7219 10.7281))', 4326)
),
(
    'plot-03', 'TĐ-104', 'Lê Hoàng Nam', '128 Nguyễn Lương Bằng, Tân Phú, Quận 7', 180.0, 42000000, 
    'disputed', 'Đang giải quyết tranh chấp ranh đất', 30,
    ST_GeomFromText('POLYGON((106.7223 10.7277, 106.7226 10.7280, 106.7230 10.7276, 106.7227 10.7273, 106.7223 10.7277))', 4326)
),
(
    'plot-04', 'MX-PMH-01', 'Công ty TNHH Phát triển Phú Mỹ Hưng (Mảng xanh ảnh hưởng)', 'Dải phân cách trục Nguyễn Lương Bằng & Nguyễn Văn Linh', 1250.0, 15000000, 
    'processing', 'Đang triển khai di dời', 45,
    ST_GeomFromText('POLYGON((106.7205 10.7295, 106.7208 10.7298, 106.7218 10.7288, 106.7215 10.7285, 106.7205 10.7295))', 4326)
),
(
    'plot-05', 'HT-PMH-02', 'Hệ thống hạ tầng kỹ thuật Phú Mỹ Hưng', 'Nút giao Nguyễn Lương Bằng - Nguyễn Văn Linh', 850.0, 22000000, 
    'pending', 'Chưa bàn giao', 10,
    ST_GeomFromText('POLYGON((106.7208 10.7298, 106.7212 10.7302, 106.7222 10.7292, 106.7218 10.7288, 106.7208 10.7298))', 4326)
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- CHÈN DỮ LIỆU CÔNG VIỆC MẪU (TASKS)
-- =====================================================================

INSERT INTO tasks (id, title, category, assigned_to, start_date, end_date, progress_percent, status, priority, description)
VALUES
(
    'task-01', 'Khảo sát và rà phá bom mìn vật nổ đoạn nút giao', 'Rà phá bom mìn', 'Tổng Công ty Lũng Lô', 
    '2026-04-01', '2026-05-15', 100, 'completed', 'high', 'Thực hiện rà phá bom mìn vật nổ để bàn giao mặt bằng thi công mố trụ cầu Metro.'
),
(
    'task-02', 'Kiểm đếm và đo đạc ranh thửa khu vực Tân Phú', 'Giải phóng mặt bằng', 'Văn phòng Đăng ký Đất đai TP', 
    '2026-04-20', '2026-06-30', 75, 'processing', 'high', 'Xác định ranh giới thu hồi đất của các hộ gia đình dọc tuyến Nguyễn Lương Bằng.'
),
(
    'task-03', 'Di dời mảng xanh và đốn hạ cây xanh ảnh hưởng', 'Hạ tầng kỹ thuật', 'Công ty TNHH Phát triển Phú Mỹ Hưng', 
    '2026-05-10', '2026-07-20', 45, 'processing', 'medium', 'Bứng dưỡng các loại cây xanh bóng mát, di dời thảm cỏ tại dải phân cách.'
),
(
    'task-04', 'Di dời hệ thống chiếu sáng và tín hiệu giao thông', 'Hạ tầng kỹ thuật', 'Ban Quản lý Đường sắt Đô thị', 
    '2026-06-01', '2026-08-15', 15, 'processing', 'medium', 'Phối hợp với Phú Mỹ Hưng tháo dỡ trụ đèn, luồn cáp viễn thông và tín hiệu tạm.'
),
(
    'task-05', 'Chi trả tiền bồi thường đợt 2 cho các hộ dân', 'Bồi thường', 'Ban Bồi thường Giải phóng mặt bằng Q7', 
    '2026-07-01', '2026-08-30', 0, 'pending', 'high', 'Chi trả tiền đền bù đợt 2 theo phương án áp giá đã được UBND Quận 7 duyệt.'
)
ON CONFLICT (id) DO NOTHING;
