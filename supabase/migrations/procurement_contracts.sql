-- Migration: Phân hệ Quản lý Gói thầu & Hợp đồng (Procurement & Contracts)
-- Tạo 3 bảng: packages, contracts, contract_appendices

CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    investment_item_id UUID REFERENCES investment_items(id) ON DELETE SET NULL,
    khlcnt_decision_no TEXT,
    khlcnt_decision_date DATE,
    package_code TEXT NOT NULL,
    package_name TEXT NOT NULL,
    package_type TEXT DEFAULT 'Tư vấn', -- 'Tư vấn', 'Xây lắp', 'Mua sắm thiết bị', 'Phi tư vấn', 'Hỗn hợp'
    estimated_price NUMERIC(18,2) DEFAULT 0,
    procurement_method TEXT DEFAULT 'Chỉ định thầu rút gọn', -- 'Đấu thầu rộng rãi qua mạng', 'Chỉ định thầu', 'Chào hàng cạnh tranh', 'Tự thực hiện'
    contract_type TEXT DEFAULT 'Trọn gói', -- 'Trọn gói', 'Đơn giá cố định', 'Đơn giá điều chỉnh', 'Theo thời gian'
    bidding_quarter TEXT DEFAULT 'Quý I/2026',
    execution_duration TEXT DEFAULT '60 ngày',
    status TEXT DEFAULT 'da_ky_hop_dong', -- 'dang_lap_hsmt', 'dang_dau_thau', 'da_duyet_kqlcnt', 'da_ky_hop_dong', 'hoan_thanh'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    contract_no TEXT NOT NULL,
    contract_name TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    contractor_tax_code TEXT,
    contractor_leader TEXT,
    sign_date DATE,
    effective_date DATE,
    end_date DATE,
    contract_value NUMERIC(18,2) DEFAULT 0,
    adjusted_contract_value NUMERIC(18,2) DEFAULT 0,
    advance_guarantee_expiry DATE,
    performance_guarantee_expiry DATE,
    document_path TEXT,
    status TEXT DEFAULT 'dang_thuc_hien', -- 'dang_thuc_hien', 'da_nghiem_thu', 'da_thanh_ly'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_appendices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    appendix_no TEXT NOT NULL,
    appendix_type TEXT DEFAULT 'BO_SUNG_KHOI_LUONG', -- 'GIA_HAN_TIEN_DO', 'BO_SUNG_KHOI_LUONG', 'DIEU_CHINH_DON_GIA', 'THAY_DOI_NHAN_SU'
    sign_date DATE,
    delta_amount NUMERIC(18,2) DEFAULT 0,
    new_end_date DATE,
    notes TEXT,
    document_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chỉ mục tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_packages_project_id ON packages(project_id);
CREATE INDEX IF NOT EXISTS idx_packages_item_id ON packages(investment_item_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_package_id ON contracts(package_id);
CREATE INDEX IF NOT EXISTS idx_contract_appendices_contract_id ON contract_appendices(contract_id);
