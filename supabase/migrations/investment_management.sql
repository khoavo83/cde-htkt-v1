-- =====================================================================
-- KỊCH BẢN MIGRATION: PHÂN HỆ QUẢN LÝ TMĐT, KẾ HOẠCH VỐN & GIẢI NGÂN
-- Hỗ trợ N lần điều chỉnh TMĐT, cây mục con đa cấp, theo dõi theo ProjectID
-- =====================================================================

-- 1. BẢNG PHIÊN BẢN TMĐT (Quản lý N lần phê duyệt điều chỉnh)
CREATE TABLE IF NOT EXISTS investment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_code TEXT NOT NULL,          -- 'V0' (Ban đầu), 'V1' (Đ/c Lần 1), 'V2'...
    version_name TEXT NOT NULL,          -- 'TMĐT phê duyệt lần đầu', 'Điều chỉnh lần 1'...
    decision_no TEXT,                   -- Số Quyết định phê duyệt (vd: 235/BCTT...)
    decision_date DATE,                 -- Ngày ban hành quyết định
    approved_by TEXT,                   -- Cơ quan / Đơn vị phê duyệt
    total_before_tax NUMERIC(20, 2) DEFAULT 0,  -- Tổng chi phí trước thuế
    total_vat NUMERIC(20, 2) DEFAULT 0,         -- Tổng tiền thuế VAT
    total_after_tax NUMERIC(20, 2) DEFAULT 0,   -- Tổng mức đầu tư sau thuế
    is_active BOOLEAN DEFAULT TRUE,     -- Đang là phiên bản áp dụng chính
    notes TEXT,                         -- Lý do điều chỉnh / Ghi chú
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG CÂY KHOẢN MỤC CHI PHÍ TMĐT ĐA CẤP
CREATE TABLE IF NOT EXISTS investment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES investment_versions(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES investment_items(id) ON DELETE CASCADE,
    item_order INTEGER DEFAULT 0,
    item_code TEXT,                     -- 'I', 'II', '1', '1.1', 'A', 'TV1', 'K1'...
    name TEXT NOT NULL,                 -- Nội dung khoản mục chi phí
    calc_symbol TEXT,                   -- Ký hiệu (Ggpmb, Gbt,ht, Gqlda, TV1...)
    calc_ref TEXT,                      -- Tham chiếu công thức: '(TV1+...+TV6)', '10%x(Ggpmb+Gtc)'...
    calc_rate NUMERIC(10, 4),           -- Hệ số nội suy / tỷ lệ % (2%, 10%, 0.001%...)
    calc_adjust_rate NUMERIC(10, 4),    -- Hệ số điều chỉnh (0.50...)
    cost_before_tax NUMERIC(20, 2) DEFAULT 0,
    vat_rate NUMERIC(10, 2) DEFAULT 0,  -- 10%, 8%, 0%
    vat_cost NUMERIC(20, 2) DEFAULT 0,
    cost_after_tax NUMERIC(20, 2) DEFAULT 0,
    contract_no TEXT,                   -- Số HĐ kinh tế (HĐ số 1299/2026/HĐTV...)
    notes TEXT,                         -- Ghi chú, căn cứ Thông tư/Nghị định
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG KẾ HOẠCH VỐN (Trung hạn 5 năm & Hàng năm)
CREATE TABLE IF NOT EXISTS capital_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,            -- 'trung_han', 'hang_nam'
    title TEXT NOT NULL,                -- 'Kế hoạch vốn trung hạn 2026-2030', 'Kế hoạch vốn năm 2026'
    period_start_year INTEGER,
    period_end_year INTEGER,
    planned_amount NUMERIC(20, 2) DEFAULT 0,
    funding_source TEXT,                -- 'Ngân sách Thành phố', 'Ngân sách TW', 'ODA'...
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG CÁC QUYẾT ĐỊNH GIAO VỐN CỤ THỂ
CREATE TABLE IF NOT EXISTS capital_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capital_plan_id UUID REFERENCES capital_plans(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    decision_no TEXT NOT NULL,          -- 'QĐ số 123/QĐ-UBND'
    decision_date DATE,
    year INTEGER NOT NULL,              -- 2026
    allocation_phase TEXT,              -- 'Giao đầu năm', 'Bổ sung đợt 1', 'Kéo dài niên độ'...
    amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG THEO DÕI GIẢI NGÂN THỰC TẾ
CREATE TABLE IF NOT EXISTS disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    investment_item_id UUID REFERENCES investment_items(id) ON DELETE SET NULL,
    capital_allocation_id UUID REFERENCES capital_allocations(id) ON DELETE SET NULL,
    voucher_no TEXT,                    -- Số chứng từ / UNC Kho bạc
    disbursement_date DATE NOT NULL,
    amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    disbursement_type TEXT NOT NULL,    -- 'tam_ung', 'thanh_toan_kl', 'thu_hoi_tam_ung'
    recipient TEXT,                     -- Đơn vị thụ hưởng
    contract_no TEXT,                   -- Số HĐ
    description TEXT,                   -- Diễn giải nội dung chi
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHỈ MỤC TĂNG TỐC TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_inv_versions_project ON investment_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_version ON investment_items(version_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_parent ON investment_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_capital_plans_project ON capital_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_capital_alloc_project ON capital_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_project ON disbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_item ON disbursements(investment_item_id);
