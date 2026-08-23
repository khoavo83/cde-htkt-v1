'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Layers, 
  Plus, 
  RefreshCw, 
  BarChart3, 
  ListOrdered, 
  Trash2, 
  FileText, 
  Building,
  CheckCircle2
} from 'lucide-react';
import { formatDateVN, formatMoneyVN } from '@/lib/formatters';
import CapitalMatrixView from './CapitalMatrixView';
import CapitalPlanModal from './CapitalPlanModal';

export default function CapitalPlanTab({ projectId, projectName }) {
  const [loading, setLoading] = useState(true);
  const [capitalPlans, setCapitalPlans] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [midTermPlan, setMidTermPlan] = useState(null);
  const [matrixYears, setMatrixYears] = useState([]);
  const [totalTMDT, setTotalTMDT] = useState(0);

  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' hoặc 'list'
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capitalModalMode, setCapitalModalMode] = useState('allocation'); // 'plan' | 'allocation'

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/investment/capital-plans?projectId=${projectId}&t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setCapitalPlans(data.plans || []);
        setAllocations(data.allocations || []);
        setMidTermPlan(data.midTermPlan || null);
        setMatrixYears(data.matrixYears || []);
        setTotalTMDT(data.totalTMDT || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu kế hoạch vốn:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Xóa allocation
  const handleDeleteAllocation = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa quyết định giao vốn này?')) return;
    try {
      const res = await fetch(`/api/investment/capital-plans?id=${id}&type=allocation`, { method: 'DELETE' });
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

  return (
    <div className="h-full flex flex-col overflow-hidden gap-3 font-sans text-slate-200">
      
      {/* ──── THANH CÔNG CỤ ĐIỀU HƯỚNG ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">Quản Lý Kế Hoạch Vốn & Quyết Định Giao Vốn</h3>
            <p className="text-[11px] text-slate-500">
              Kế hoạch trung hạn 2026-2030 & các quyết định giao vốn hàng năm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle chế độ xem Matrix / List */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'matrix' ? 'bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={13} /> Ma trận vốn đa chiều
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered size={13} /> Danh sách QĐ giao vốn ({allocations.length})
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>

          <button
            onClick={() => { setCapitalModalMode('plan'); setIsCapitalModalOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={13} /> Tạo Kế hoạch vốn
          </button>

          <button
            onClick={() => { setCapitalModalMode('allocation'); setIsCapitalModalOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Plus size={13} /> Thêm QĐ Giao Vốn
          </button>
        </div>
      </div>

      {/* ──── NỘI DUNG CHÍNH ──── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'matrix' ? (
          <div className="h-full overflow-y-auto pr-1">
            <CapitalMatrixView
              plans={capitalPlans}
              allocations={allocations}
              midTermPlan={midTermPlan}
              totalTMDT={totalTMDT}
              matrixYears={matrixYears}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            {/* Danh sách QĐ */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar size={14} /> Danh sách các Quyết định giao vốn (Chi tiết từng đợt & nguồn vốn)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Số Quyết định</th>
                      <th className="px-3 py-2.5">Ngày ban hành</th>
                      <th className="px-3 py-2.5">Năm</th>
                      <th className="px-3 py-2.5">Nguồn vốn</th>
                      <th className="px-3 py-2.5">Đợt giao vốn</th>
                      <th className="px-3 py-2.5 text-right">Số vốn được cấp (VNĐ)</th>
                      <th className="px-3 py-2.5">Văn bản đính kèm</th>
                      <th className="px-3 py-2.5">Ghi chú</th>
                      <th className="px-3 py-2.5 text-center w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {allocations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                          Chưa có quyết định giao vốn nào được ghi nhận.
                        </td>
                      </tr>
                    ) : (
                      allocations.map(a => (
                        <tr key={a.id} className="hover:bg-slate-800/40">
                          <td className="px-3 py-2.5 font-mono font-bold text-blue-400">{a.decision_no}</td>
                          <td className="px-3 py-2.5 text-slate-300 font-mono">{formatDateVN(a.decision_date)}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-200">{a.year}</td>
                          <td className="px-3 py-2.5 text-slate-300">{a.source_type || 'Ngân sách TP'}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded text-[11px]">
                              {a.allocation_phase}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-400">
                            {formatMoneyVN(a.amount)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400">
                            {a.document_path ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/documents/open', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ filePath: a.document_path })
                                    });
                                    const data = await res.json();
                                    if (!data.success) alert(data.error);
                                  } catch(e) { alert(e.message); }
                                }}
                                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] truncate max-w-[150px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 transition-colors"
                                title={`Bấm để mở file: ${a.document_path}`}
                              >
                                <FileText size={12} /> {a.document_path}
                              </button>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400">{a.notes || '-'}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => handleDeleteAllocation(a.id)}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Xóa"
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

            {/* Khung Kế hoạch vốn trung hạn / năm */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building size={14} /> Khung Kế hoạch vốn đăng ký
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {capitalPlans.map(plan => (
                  <div key={plan.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-200 text-xs">{plan.title}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">Nguồn: {plan.funding_source || 'Ngân sách TP'}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] uppercase font-bold">
                        {plan.plan_type === 'trung_han' ? 'Trung hạn 5 năm' : 'Hàng năm'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-500">Mức vốn dự kiến:</span>
                      <span className="font-mono font-bold text-emerald-400">{formatMoney(plan.planned_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isCapitalModalOpen && (
        <CapitalPlanModal
          isOpen={isCapitalModalOpen}
          onClose={() => setIsCapitalModalOpen(false)}
          mode={capitalModalMode}
          capitalPlans={capitalPlans}
          projectId={projectId}
          onSuccess={fetchData}
        />
      )}

    </div>
  );
}
