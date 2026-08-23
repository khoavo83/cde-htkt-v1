'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Layers, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  FileSpreadsheet, 
  Building,
  Edit3,
  TrendingUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { formatMoneyVN, formatDateVN } from '@/lib/formatters';
import InvestmentTreeGrid from './InvestmentTreeGrid';
import InvestmentItemModal from './InvestmentItemModal';
import InvestmentVersionModal from './InvestmentVersionModal';

export default function InvestmentTab({ projectId, projectName }) {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [items, setItems] = useState([]);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [parentItemForAdd, setParentItemForAdd] = useState(null);

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedVersionForEdit, setSelectedVersionForEdit] = useState(null);

  // 1. Tải danh sách các phiên bản TMĐT
  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/investment/versions?projectId=${projectId}&t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.versions || []);
        if (data.versions && data.versions.length > 0) {
          const active = data.versions.find(v => v.is_active) || data.versions[data.versions.length - 1];
          setCurrentVersion(active);
        } else {
          setCurrentVersion(null);
          setItems([]);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải phiên bản TMĐT:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 2. Tải cây khoản mục theo currentVersion
  const fetchItems = useCallback(async () => {
    if (!currentVersion) return;
    try {
      const res = await fetch(`/api/investment/items?versionId=${currentVersion.id}&t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải khoản mục TMĐT:', err);
    }
  }, [currentVersion]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  useEffect(() => {
    if (currentVersion) {
      fetchItems();
    }
  }, [currentVersion, fetchItems]);

  // Chuyển đổi phiên bản
  const handleSelectVersion = (versionId) => {
    const found = versions.find(v => v.id === versionId);
    if (found) setCurrentVersion(found);
  };

  // Thao tác với Item
  const handleAddItem = () => {
    setSelectedItem(null);
    setParentItemForAdd(null);
    setIsItemModalOpen(true);
  };

  const handleAddSubItem = (parent) => {
    setSelectedItem(null);
    setParentItemForAdd(parent);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setParentItemForAdd(null);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Bạn có chắc muốn xóa khoản mục [${item.item_code || ''}] ${item.name}? Tất cả các mục con (nếu có) cũng sẽ bị xóa.`)) return;
    try {
      const res = await fetch(`/api/investment/items?id=${item.id}&versionId=${currentVersion.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchItems();
        fetchVersions();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi xóa');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    }
  };

  // Thao tác với Version
  const handleCreateVersion = () => {
    setSelectedVersionForEdit(null);
    setIsVersionModalOpen(true);
  };

  const handleEditVersion = () => {
    setSelectedVersionForEdit(currentVersion);
    setIsVersionModalOpen(true);
  };

  // Format tiền tệ
  const formatMoney = (val) => {
    if (!val) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  // Tính tổng hàng Root
  const rootItems = items.filter(i => !i.parent_id);
  const totalInvestment = rootItems.reduce((sum, i) => sum + Number(i.cost_after_tax || 0), 0);
  const totalBeforeTax = rootItems.reduce((sum, i) => sum + Number(i.cost_before_tax || 0), 0);
  const totalVat = rootItems.reduce((sum, i) => sum + Number(i.vat_cost || 0), 0);
  const totalDisbursed = items.reduce((sum, i) => sum + Number(i.disbursed_amount || 0), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden gap-3 font-sans text-slate-200">
      
      {/* ──── THANH ĐIỀU HƯỚNG PHIÊN BẢN & CÔNG CỤ ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-lg shrink-0">
        
        {/* Chọn phiên bản TMĐT */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Layers size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phiên bản TMĐT:</label>
              {currentVersion?.is_active && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                  <CheckCircle2 size={10} /> Hiện hành
                </span>
              )}
            </div>
            <select
              value={currentVersion?.id || ''}
              onChange={e => handleSelectVersion(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 outline-none mt-0.5 min-w-[260px]"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  [{v.version_code}] {v.version_name} {v.decision_no ? `- QĐ ${v.decision_no}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchVersions(); }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>

          {currentVersion && (
            <button
              onClick={handleEditVersion}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Edit3 size={13} /> Sửa thông tin QĐ
            </button>
          )}

          <button
            onClick={handleCreateVersion}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
          >
            <Plus size={14} /> Tạo bản điều chỉnh mới (V1, V2...)
          </button>
        </div>
      </div>

      {/* ──── 4 THẺ KPI CHỈ SỐ TMĐT ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tổng mức đầu tư (Sau thuế)
            </span>
            <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
              {formatMoney(totalInvestment || currentVersion?.total_after_tax)}
            </span>
            <span className="text-[10px] text-slate-500">
              QĐ {currentVersion?.decision_no || 'Chưa cập nhật'}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Chi phí trước thuế
            </span>
            <span className="text-base font-black text-slate-200 font-mono mt-0.5 block">
              {formatMoney(totalBeforeTax)}
            </span>
            <span className="text-[10px] text-slate-500">
              Tiền thuế VAT (10%): <b>{formatMoney(totalVat)}</b>
            </span>
          </div>
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <FileSpreadsheet size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Lũy kế Đã Giải Ngân
            </span>
            <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
              {formatMoney(totalDisbursed)}
            </span>
            <span className="text-[10px] text-amber-400/80 font-medium">
              Đạt {totalInvestment > 0 ? ((totalDisbursed / totalInvestment) * 100).toFixed(1) : 0}% so với TMĐT
            </span>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Phê duyệt / Thẩm tra
            </span>
            <span className="text-xs font-bold text-slate-200 truncate block mt-0.5" title={currentVersion?.approved_by}>
              {currentVersion?.approved_by || 'Tam Kiệt / VTCO'}
            </span>
            <span className="text-[10px] text-slate-500">
              Ngày ký: {formatDateVN(currentVersion?.decision_date)}
            </span>
          </div>
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
            <Building size={20} />
          </div>
        </div>

      </div>

      {/* ──── BẢNG CÂY KHOẢN MỤC TMĐT (TREEGRID) ──── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <InvestmentTreeGrid
          items={items}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onAddSubItem={handleAddSubItem}
        />
      </div>

      {/* ──── RENDER CÁC MODAL ──── */}
      {isItemModalOpen && (
        <InvestmentItemModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          item={selectedItem}
          parentItem={parentItemForAdd}
          allItems={items}
          versionId={currentVersion?.id}
          projectId={projectId}
          onSuccess={() => { fetchItems(); fetchVersions(); }}
        />
      )}

      {isVersionModalOpen && (
        <InvestmentVersionModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          version={selectedVersionForEdit}
          allVersions={versions}
          projectId={projectId}
          onSuccess={(newVer) => {
            fetchVersions();
            if (newVer) setCurrentVersion(newVer);
          }}
        />
      )}

    </div>
  );
}
