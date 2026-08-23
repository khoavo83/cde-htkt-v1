'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Briefcase, 
  Package, 
  FileText, 
  Plus, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Percent, 
  Building,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { formatDateVN, formatMoneyVN, formatPercentVN } from '@/lib/formatters';
import PackageModal from './PackageModal';
import ContractModal from './ContractModal';
import ContractAppendixModal from './ContractAppendixModal';

export default function ContractManagementTab({ projectId, projectName }) {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [investmentItems, setInvestmentItems] = useState([]);
  const [expandedPackages, setExpandedPackages] = useState({});

  // Modals
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [targetPackageIdForContract, setTargetPackageIdForContract] = useState(null);

  const [isAppendixModalOpen, setIsAppendixModalOpen] = useState(false);
  const [targetContractForAppendix, setTargetContractForAppendix] = useState(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [pkgRes, verRes] = await Promise.all([
        fetch(`/api/procurement/packages?projectId=${projectId}&t=${Date.now()}`),
        fetch(`/api/investment/versions?projectId=${projectId}&t=${Date.now()}`)
      ]);

      const [pkgData, verData] = await Promise.all([pkgRes.json(), verRes.json()]);

      if (pkgData.success) {
        setPackages(pkgData.packages || []);
        // Tự động mở rộng tất cả các gói thầu
        const exp = {};
        (pkgData.packages || []).forEach(p => { exp[p.id] = true; });
        setExpandedPackages(exp);
      }

      if (verData.success && verData.versions && verData.versions.length > 0) {
        const activeVer = verData.versions.find(v => v.is_active) || verData.versions[0];
        const itemsRes = await fetch(`/api/investment/items?versionId=${activeVer.id}&t=${Date.now()}`);
        const itemsData = await itemsRes.json();
        if (itemsData.success) setInvestmentItems(itemsData.items || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu gói thầu & hợp đồng:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (pkgId) => {
    setExpandedPackages(prev => ({ ...prev, [pkgId]: !prev[pkgId] }));
  };

  // Xóa gói thầu
  const handleDeletePackage = async (id, name) => {
    if (!confirm(`Bạn có chắc muốn xóa gói thầu "${name}" cùng tất cả hợp đồng liên quan?`)) return;
    try {
      const res = await fetch(`/api/procurement/packages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Xóa hợp đồng
  const handleDeleteContract = async (id, contractNo) => {
    if (!confirm(`Bạn có chắc muốn xóa hợp đồng "${contractNo}"?`)) return;
    try {
      const res = await fetch(`/api/procurement/contracts?id=${id}&type=contract`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Xóa phụ lục
  const handleDeleteAppendix = async (id, appNo) => {
    if (!confirm(`Bạn có chắc muốn xóa phụ lục "${appNo}"?`)) return;
    try {
      const res = await fetch(`/api/procurement/contracts?id=${id}&type=appendix`, { method: 'DELETE' });
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
  const { totalEstimated, totalContractValue, totalSaving, savingPercent, expiringGuaranteesCount } = useMemo(() => {
    let est = 0;
    let contracted = 0;
    let expiringCount = 0;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    packages.forEach(pkg => {
      est += Number(pkg.estimated_price || 0);
      (pkg.contracts || []).forEach(c => {
        contracted += Number(c.adjusted_contract_value || c.contract_value || 0);

        // Kiểm tra hạn bảo lãnh
        if (c.advance_guarantee_expiry) {
          const advDate = new Date(c.advance_guarantee_expiry);
          if (advDate <= thirtyDaysLater && advDate >= now) expiringCount++;
        }
        if (c.performance_guarantee_expiry) {
          const perfDate = new Date(c.performance_guarantee_expiry);
          if (perfDate <= thirtyDaysLater && perfDate >= now) expiringCount++;
        }
      });
    });

    const saving = Math.max(0, est - contracted);
    const sPercent = est > 0 ? ((saving / est) * 100).toFixed(2) : 0;

    return {
      totalEstimated: est,
      totalContractValue: contracted,
      totalSaving: saving,
      savingPercent: sPercent,
      expiringGuaranteesCount: expiringCount
    };
  }, [packages]);

  return (
    <div className="h-full flex flex-col overflow-hidden gap-3 font-sans text-slate-200">
      
      {/* ──── THANH CÔNG CỤ ĐIỀU HƯỚNG ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Briefcase size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">Quản Lý Gói Thầu & Hợp Đồng Kinh Tế</h3>
            <p className="text-[11px] text-slate-500">
              Kế hoạch lựa chọn nhà thầu, hợp đồng kinh tế và phụ lục điều chỉnh tiến độ / giá trị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-purple-400' : ''} />
          </button>

          <button
            onClick={() => { setSelectedPackage(null); setIsPackageModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-500/20"
          >
            <Plus size={14} /> Thêm Gói Thầu Mới
          </button>
        </div>
      </div>

      {/* ──── THẺ KPI ĐẤU THẦU & HỢP ĐỒNG ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Tổng Giá Gói Thầu Đã Duyệt
          </span>
          <span className="text-base font-black text-slate-200 font-mono mt-0.5 block">
            {formatMoney(totalEstimated)}
          </span>
          <span className="text-[10px] text-slate-500">
            Tổng số: <b>{packages.length} gói thầu</b>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Tổng Giá Trị Hợp Đồng Đã Ký
          </span>
          <span className="text-base font-black text-blue-400 font-mono mt-0.5 block">
            {formatMoney(totalContractValue)}
          </span>
          <span className="text-[10px] text-blue-400/80 font-medium">
            Bao gồm các phụ lục phát sinh
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Tiết Kiệm Qua Đấu Thầu
          </span>
          <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
            {formatMoney(totalSaving)}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold font-mono">
            Tỷ lệ tiết kiệm: {savingPercent}%
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Cảnh Báo Hạn Bảo Lãnh (30 ngày)
          </span>
          <span className={`text-base font-black font-mono mt-0.5 block ${expiringGuaranteesCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {expiringGuaranteesCount} bảo lãnh
          </span>
          <span className="text-[10px] text-slate-500">
            {expiringGuaranteesCount > 0 ? 'Cần yêu cầu nhà thầu gia hạn' : 'Tất cả bảo lãnh an toàn'}
          </span>
        </div>

      </div>

      {/* ──── DANH SÁCH GÓI THẦU & HỢP ĐỒNG (MASTER-DETAIL ACCORDION) ──── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {packages.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
            Chưa có gói thầu nào được tạo. Hãy bấm <b>"Thêm Gói Thầu Mới"</b> để lập KHLCNT.
          </div>
        ) : (
          packages.map(pkg => {
            const isExpanded = !!expandedPackages[pkg.id];
            const contracts = pkg.contracts || [];
            const pkgContractVal = contracts.reduce((sum, c) => sum + Number(c.adjusted_contract_value || c.contract_value || 0), 0);
            const pkgSaving = Math.max(0, Number(pkg.estimated_price || 0) - pkgContractVal);

            return (
              <div key={pkg.id} className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all">
                
                {/* Header Gói thầu */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[320px]">
                    <button
                      onClick={() => toggleExpand(pkg.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 bg-slate-900 rounded-lg border border-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[11px] font-mono font-bold">
                          [{pkg.package_code}]
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
                          {pkg.package_type}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px]">
                          {pkg.procurement_method}
                        </span>
                        {pkg.khlcnt_decision_no && (
                          <span className="text-[10px] text-slate-500">
                            KHLCNT: {pkg.khlcnt_decision_no}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                        {pkg.package_name}
                      </h4>

                      {pkg.investment_items && (
                        <p className="text-[11px] text-emerald-400/80 mt-0.5">
                          Khoản mục TMĐT: [{pkg.investment_items.item_code}] {pkg.investment_items.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Giá gói & Thao tác */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase">Giá gói thầu duyệt:</span>
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {formatMoney(pkg.estimated_price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedContract(null);
                          setTargetPackageIdForContract(pkg.id);
                          setIsContractModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors"
                        title="Ký hợp đồng"
                      >
                        <Plus size={12} /> Ký HĐ
                      </button>

                      <button
                        onClick={() => { setSelectedPackage(pkg); setIsPackageModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Sửa gói thầu"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeletePackage(pkg.id, pkg.package_name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Xóa gói thầu"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danh sách Hợp đồng con (Accordion Body) */}
                {isExpanded && (
                  <div className="p-3 bg-slate-900/40 space-y-2.5">
                    {contracts.length === 0 ? (
                      <div className="py-4 text-center text-slate-500 text-xs italic">
                        Chưa có hợp đồng nào được ký cho gói thầu này. Bấm <b>"+ Ký HĐ"</b> để nhập thông tin nhà thầu trúng thầu.
                      </div>
                    ) : (
                      contracts.map(c => {
                        const appendices = c.contract_appendices || [];
                        return (
                          <div key={c.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                            
                            {/* Hợp đồng chính */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex-1 min-w-[260px]">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-mono font-bold">
                                    {c.contract_no}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-200">
                                    {c.contractor_name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    c.status === 'da_thanh_ly' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {c.status === 'da_thanh_ly' ? 'Đã quyết toán' : 'Đang thực hiện'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                  <span>Ký ngày: <b className="text-slate-300 font-mono">{formatDateVN(c.sign_date)}</b></span>
                                  <span>Hạn cam kết: <b className="text-slate-300 font-mono">{formatDateVN(c.end_date)}</b></span>
                                  {c.advance_guarantee_expiry && (
                                    <span className="text-purple-400 flex items-center gap-1 font-mono">
                                      <ShieldCheck size={11} /> Hạn BL Tạm ứng: <b>{formatDateVN(c.advance_guarantee_expiry)}</b>
                                    </span>
                                  )}
                                  {c.performance_guarantee_expiry && (
                                    <span className="text-purple-400 flex items-center gap-1 font-mono">
                                      <ShieldCheck size={11} /> Hạn BL Thực hiện: <b>{formatDateVN(c.performance_guarantee_expiry)}</b>
                                    </span>
                                  )}
                                  {c.document_path && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch('/api/documents/open', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ filePath: c.document_path })
                                          });
                                          const data = await res.json();
                                          if (!data.success) alert(data.error);
                                        } catch(e) { alert(e.message); }
                                      }}
                                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 transition-colors"
                                      title={`Mở file HĐ: ${c.document_path}`}
                                    >
                                      <FileText size={11} /> Xem HĐ scan
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Giá trị hợp đồng & Thao tác */}
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-500 block uppercase">Giá trị HĐ sau thuế:</span>
                                  <span className="text-xs font-black font-mono text-blue-400">
                                    {formatMoneyVN(c.adjusted_contract_value || c.contract_value)}
                                  </span>
                                </div>

                                <button
                                  onClick={() => {
                                    setTargetContractForAppendix(c);
                                    setIsAppendixModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-semibold transition-colors"
                                  title="Thêm phụ lục hợp đồng"
                                >
                                  <Plus size={11} /> Phụ lục HĐ
                                </button>

                                <button
                                  onClick={() => handleDeleteContract(c.id, c.contract_no)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Xóa hợp đồng"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Danh sách Phụ lục hợp đồng */}
                            {appendices.length > 0 && (
                              <div className="pl-4 border-l-2 border-purple-500/40 mt-2 space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-purple-400 block">
                                  Các Phụ Lục Hợp Đồng Đã Ký ({appendices.length}):
                                </span>
                                {appendices.map(app => (
                                  <div key={app.id} className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-purple-300">{app.appendix_no}</span>
                                      <span className="text-slate-400 font-mono">({formatDateVN(app.sign_date)})</span>
                                      <span className="text-slate-300">{app.notes || app.appendix_type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {Number(app.delta_amount) !== 0 && (
                                        <span className={`font-mono font-bold ${Number(app.delta_amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {Number(app.delta_amount) > 0 ? '+' : ''}{formatMoneyVN(app.delta_amount)}
                                        </span>
                                      )}
                                      {app.new_end_date && (
                                        <span className="text-amber-400 text-[11px] font-mono">
                                          Gia hạn đến: <b>{formatDateVN(app.new_end_date)}</b>
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleDeleteAppendix(app.id, app.appendix_no)}
                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                        title="Xóa phụ lục"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* ──── CÁC MODAL ──── */}
      {isPackageModalOpen && (
        <PackageModal
          isOpen={isPackageModalOpen}
          onClose={() => setIsPackageModalOpen(false)}
          packageData={selectedPackage}
          investmentItems={investmentItems}
          projectId={projectId}
          onSuccess={fetchData}
        />
      )}

      {isContractModalOpen && (
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          contractData={selectedContract}
          packages={packages}
          selectedPackageId={targetPackageIdForContract}
          projectId={projectId}
          onSuccess={fetchData}
        />
      )}

      {isAppendixModalOpen && (
        <ContractAppendixModal
          isOpen={isAppendixModalOpen}
          onClose={() => setIsAppendixModalOpen(false)}
          contract={targetContractForAppendix}
          projectId={projectId}
          onSuccess={fetchData}
        />
      )}

    </div>
  );
}
