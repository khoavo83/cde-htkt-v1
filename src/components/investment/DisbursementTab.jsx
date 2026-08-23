'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Building,
  BarChart3,
  CreditCard,
  ListOrdered,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { formatDateVN, formatMoneyVN } from '@/lib/formatters';
import InvestmentDisbursementModal from './InvestmentDisbursementModal';
import DisbursementReconciliationView from './DisbursementReconciliationView';
import DisbursementAdvanceTracker from './DisbursementAdvanceTracker';

export default function DisbursementTab({ projectId, projectName }) {
  const [loading, setLoading] = useState(true);
  const [disbursements, setDisbursements] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [items, setItems] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);

  // Chế độ xem: 'reconciliation' (So khớp 3 chiều), 'journal' (Nhật ký chứng từ), 'advances' (Tạm ứng)
  const [viewMode, setViewMode] = useState('reconciliation');

  // Bộ lọc
  const [filterYear, setFilterYear] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [isDisbModalOpen, setIsDisbModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [disbRes, capRes, verRes] = await Promise.all([
        fetch(`/api/investment/disbursements?projectId=${projectId}&t=${Date.now()}`),
        fetch(`/api/investment/capital-plans?projectId=${projectId}&t=${Date.now()}`),
        fetch(`/api/investment/versions?projectId=${projectId}&t=${Date.now()}`)
      ]);

      const [disbData, capData, verData] = await Promise.all([
        disbRes.json(),
        capRes.json(),
        verRes.json()
      ]);

      if (disbData.success) setDisbursements(disbData.disbursements || []);
      if (capData.success) setAllocations(capData.allocations || []);
      
      if (verData.success && verData.versions && verData.versions.length > 0) {
        const activeVer = verData.versions.find(v => v.is_active) || verData.versions[0];
        setCurrentVersion(activeVer);

        // Lấy items của active version
        const itemsRes = await fetch(`/api/investment/items?versionId=${activeVer.id}&t=${Date.now()}`);
        const itemsData = await itemsRes.json();
        if (itemsData.success) setItems(itemsData.items || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu giải ngân:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Xóa disbursement
  const handleDeleteDisb = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa chứng từ giải ngân này?')) return;
    try {
      const res = await fetch(`/api/investment/disbursements?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const formatMoney = (val) => {
    if (!val) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  // Tính toán KPI
  const totalTMDT = Number(currentVersion?.total_after_tax || 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  
  let totalDisbursed = 0;
  let totalAdvance = 0;
  let totalRecovered = 0;

  disbursements.forEach(d => {
    const amt = Number(d.amount || 0);
    if (d.disbursement_type === 'tam_ung') {
      totalAdvance += amt;
      totalDisbursed += amt;
    } else if (d.disbursement_type === 'thu_hoi_tam_ung') {
      totalRecovered += amt;
      totalDisbursed -= amt;
    } else {
      totalDisbursed += amt;
    }
  });

  const disbPercentOfAllocated = totalAllocated > 0 ? ((totalDisbursed / totalAllocated) * 100).toFixed(1) : 0;
  const disbPercentOfTMDT = totalTMDT > 0 ? ((totalDisbursed / totalTMDT) * 100).toFixed(1) : 0;

  // Lọc danh sách chứng từ
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      // Lọc theo năm
      if (filterYear !== 'all') {
        const year = d.disbursement_date ? d.disbursement_date.split('-')[0] : '';
        if (year !== filterYear) return false;
      }
      // Lọc theo loại chi
      if (filterType !== 'all' && d.disbursement_type !== filterType) {
        return false;
      }
      // Lọc theo từ khóa tìm kiếm
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchVoucher = d.voucher_no?.toLowerCase().includes(kw);
        const matchRecipient = d.recipient?.toLowerCase().includes(kw);
        const matchContract = d.contract_no?.toLowerCase().includes(kw);
        const matchDesc = d.description?.toLowerCase().includes(kw);
        const matchItem = d.investment_items?.name?.toLowerCase().includes(kw);
        if (!matchVoucher && !matchRecipient && !matchContract && !matchDesc && !matchItem) return false;
      }
      return true;
    });
  }, [disbursements, filterYear, filterType, searchKeyword]);

  // Xuất file Excel báo cáo giải ngân
  const handleExportExcel = () => {
    try {
      const headers = ['STT', 'Số chứng từ/UNC', 'Ngày giải ngân', 'Mã mục TMĐT', 'Khoản mục chi phí', 'Loại giải ngân', 'Đơn vị thụ hưởng', 'Số Hợp đồng', 'Số tiền (VNĐ)', 'Diễn giải nội dung chi'];
      
      const rows = filteredDisbursements.map((d, idx) => [
        idx + 1,
        `"${d.voucher_no || ''}"`,
        d.disbursement_date || '',
        `"${d.investment_items?.item_code || ''}"`,
        `"${(d.investment_items?.name || '').replace(/"/g, '""')}"`,
        d.disbursement_type === 'tam_ung' ? 'Tạm ứng' : d.disbursement_type === 'thu_hoi_tam_ung' ? 'Thu hồi tạm ứng' : 'Thanh toán KL hoàn thành',
        `"${(d.recipient || '').replace(/"/g, '""')}"`,
        `"${(d.contract_no || '').replace(/"/g, '""')}"`,
        d.amount || 0,
        `"${(d.description || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bao_cao_giai_ngan_${projectName || 'du_an'}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Lỗi xuất báo cáo: ' + err.message);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden gap-3 font-sans text-slate-200">
      
      {/* ──── THANH CÔNG CỤ & ĐIỀU HƯỚNG CHẾ ĐỘ XEM ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-lg shrink-0">
        
        <div className="flex items-center gap-2">
          {/* 3 Nút chuyển đổi View Mode */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('reconciliation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'reconciliation' ? 'bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={13} /> Bảng so khớp 3 chiều
            </button>
            <button
              onClick={() => setViewMode('journal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'journal' ? 'bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered size={13} /> Nhật ký chứng từ chi ({disbursements.length})
            </button>
            <button
              onClick={() => setViewMode('advances')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'advances' ? 'bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard size={13} /> Dư nợ tạm ứng
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Download size={13} className="text-emerald-400" /> Xuất Excel Giao Ban
          </button>

          <button
            onClick={() => setIsDisbModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-500/20"
          >
            <Plus size={14} /> Nhập Chứng Từ Giải Ngân
          </button>
        </div>
      </div>

      {/* ──── NỘI DUNG CHÍNH THEO CHẾ ĐỘ XEM ──── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        
        {/* 1. View: So khớp 3 chiều */}
        {viewMode === 'reconciliation' && (
          <div className="h-full overflow-y-auto pr-1">
            <DisbursementReconciliationView
              items={items}
              disbursements={disbursements}
              allocations={allocations}
              totalTMDT={totalTMDT}
              totalAllocated={totalAllocated}
            />
          </div>
        )}

        {/* 2. View: Dư nợ tạm ứng */}
        {viewMode === 'advances' && (
          <div className="h-full overflow-y-auto pr-1">
            <DisbursementAdvanceTracker disbursements={disbursements} />
          </div>
        )}

        {/* 3. View: Nhật ký chứng từ chi có bộ lọc */}
        {viewMode === 'journal' && (
          <div className="h-full flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            
            {/* Thanh bộ lọc */}
            <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    placeholder="Tìm theo số UNC, nhà thầu, số HĐ..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* Filter Loại chi */}
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="all">Tất cả loại chi</option>
                  <option value="thanh_toan_kl">Thanh toán khối lượng A-B</option>
                  <option value="tam_ung">Tạm ứng hợp đồng</option>
                  <option value="thu_hoi_tam_ung">Thu hồi tạm ứng</option>
                </select>

                {/* Filter Năm */}
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="all">Tất cả các năm</option>
                  <option value="2026">Năm 2026</option>
                  <option value="2027">Năm 2027</option>
                  <option value="2028">Năm 2028</option>
                </select>
              </div>

              <span className="text-xs text-slate-400">
                Hiển thị: <b>{filteredDisbursements.length}</b> / {disbursements.length} chứng từ
              </span>
            </div>

            {/* Bảng chứng từ */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Số chứng từ / UNC</th>
                    <th className="px-3 py-3">Ngày giải ngân</th>
                    <th className="px-3 py-3">Khoản mục TMĐT</th>
                    <th className="px-3 py-3">Nguồn / QĐ Giao vốn</th>
                    <th className="px-3 py-3">Loại giải ngân</th>
                    <th className="px-3 py-3">Đơn vị thụ hưởng</th>
                    <th className="px-3 py-3 text-right">Số tiền giải ngân (VNĐ)</th>
                    <th className="px-3 py-3">Nội dung chi</th>
                    <th className="px-3 py-3 text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDisbursements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        Không tìm thấy chứng từ giải ngân nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredDisbursements.map(d => (
                      <tr key={d.id} className="hover:bg-slate-800/40">
                        <td className="px-3 py-2.5 font-mono font-bold text-amber-400">{d.voucher_no || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-300 font-mono">{formatDateVN(d.disbursement_date)}</td>
                        <td className="px-3 py-2.5">
                          {d.investment_items ? (
                            <span className="text-slate-200">
                              <b className="text-emerald-400 mr-1">[{d.investment_items.item_code}]</b>
                              {d.investment_items.name}
                            </span>
                          ) : (
                            <span className="text-slate-500">Chung</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          {d.capital_allocations?.decision_no || 'Vốn năm'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            d.disbursement_type === 'tam_ung'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : d.disbursement_type === 'thu_hoi_tam_ung'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {d.disbursement_type === 'tam_ung' ? 'Tạm ứng' : d.disbursement_type === 'thu_hoi_tam_ung' ? 'Thu hồi tạm ứng' : 'Thanh toán KL A-B'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">{d.recipient || '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-amber-400">
                          {formatMoneyVN(d.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 line-clamp-1" title={d.description || ''}>
                          {d.description || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleDeleteDisb(d.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Xóa chứng từ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal */}
      {isDisbModalOpen && (
        <InvestmentDisbursementModal
          isOpen={isDisbModalOpen}
          onClose={() => setIsDisbModalOpen(false)}
          allItems={items}
          allocations={allocations}
          projectId={projectId}
          onSuccess={fetchData}
        />
      )}

    </div>
  );
}
