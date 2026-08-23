'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calculator, HelpCircle } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';

export default function InvestmentItemModal({
  isOpen,
  onClose,
  item = null,
  parentItem = null,
  allItems = [],
  versionId,
  projectId,
  onSuccess
}) {
  const isEdit = !!item;

  const [formData, setFormData] = useState({
    parentId: '',
    itemCode: '',
    name: '',
    calcSymbol: '',
    calcRef: '',
    calcRate: '',
    calcAdjustRate: '',
    costBeforeTax: '',
    vatRate: 10,
    vatCost: '',
    costAfterTax: '',
    contractNo: '',
    notes: '',
    itemOrder: 0
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData({
          parentId: item.parent_id || '',
          itemCode: item.item_code || '',
          name: item.name || '',
          calcSymbol: item.calc_symbol || '',
          calcRef: item.calc_ref || '',
          calcRate: item.calc_rate !== null && item.calc_rate !== undefined ? item.calc_rate : '',
          calcAdjustRate: item.calc_adjust_rate !== null && item.calc_adjust_rate !== undefined ? item.calc_adjust_rate : '',
          costBeforeTax: item.cost_before_tax || '',
          vatRate: item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : 10,
          vatCost: item.vat_cost || '',
          costAfterTax: item.cost_after_tax || '',
          contractNo: item.contract_no || '',
          notes: item.notes || '',
          itemOrder: item.item_order || 0
        });
      } else {
        setFormData({
          parentId: parentItem ? parentItem.id : '',
          itemCode: '',
          name: '',
          calcSymbol: '',
          calcRef: '',
          calcRate: '',
          calcAdjustRate: '',
          costBeforeTax: '',
          vatRate: 10,
          vatCost: '',
          costAfterTax: '',
          contractNo: '',
          notes: '',
          itemOrder: (allItems || []).length + 1
        });
      }
    }
  }, [isOpen, item, parentItem, allItems]);

  if (!isOpen) return null;

  // Tự động tính VAT và Sau thuế khi thay đổi Trước thuế hoặc Thuế suất
  const handleBeforeTaxChange = (val) => {
    const num = Number(val) || 0;
    const rate = Number(formData.vatRate) || 0;
    const vat = Math.round((num * rate) / 100);
    const after = num + vat;
    setFormData(prev => ({
      ...prev,
      costBeforeTax: val,
      vatCost: vat,
      costAfterTax: after
    }));
  };

  const handleVatRateChange = (val) => {
    const rate = Number(val) || 0;
    const before = Number(formData.costBeforeTax) || 0;
    const vat = Math.round((before * rate) / 100);
    const after = before + vat;
    setFormData(prev => ({
      ...prev,
      vatRate: val,
      vatCost: vat,
      costAfterTax: after
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return alert('Vui lòng nhập tên khoản mục chi phí');
    }

    try {
      setSaving(true);
      const url = '/api/investment/items';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        id: item?.id,
        versionId,
        projectId
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi lưu');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Danh sách các mục cha khả dụng (loại trừ chính nó nếu đang edit)
  const availableParents = allItems.filter(i => !item || i.id !== item.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-emerald-400">
              {isEdit ? 'Chỉnh sửa Khoản mục Chi phí' : 'Thêm Khoản mục Chi phí TMĐT'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {parentItem ? `Thêm mục con cho: [${parentItem.item_code || ''}] ${parentItem.name}` : 'Khoản mục chi phí trong Bảng Tổng mức đầu tư'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Cấp độ & Mã mục */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Thuộc mục cha (Cấp độ phân nhánh)
              </label>
              <select
                value={formData.parentId}
                onChange={e => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- [Mục gốc cấp cao nhất: I, II, III...] --</option>
                {availableParents.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.item_code ? `[${p.item_code}] ` : ''}{p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                STT / Mã mục (VD: I, 1, 1.1, TV1...) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.itemCode}
                onChange={e => setFormData(prev => ({ ...prev, itemCode: e.target.value }))}
                placeholder="VD: 1.1 hoặc TV5"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Tên khoản mục */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nội dung Khoản mục Chi phí <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="VD: Tư vấn đo vẽ, lập bản đồ vị trí phục vụ công tác thu hồi đất..."
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Ký hiệu & Cách tính / Định mức */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Ký hiệu toán học</label>
              <input
                type="text"
                value={formData.calcSymbol}
                onChange={e => setFormData(prev => ({ ...prev, calcSymbol: e.target.value }))}
                placeholder="VD: Gbt,ht, TV1, K1"
                className="w-full px-2.5 py-1.5 border border-slate-700 rounded bg-slate-900 text-xs font-mono text-amber-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Tham chiếu công thức</label>
              <input
                type="text"
                value={formData.calcRef}
                onChange={e => setFormData(prev => ({ ...prev, calcRef: e.target.value }))}
                placeholder="VD: (TV1+..+TV6), V-Gdp"
                className="w-full px-2.5 py-1.5 border border-slate-700 rounded bg-slate-900 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Hệ số nội suy / %</label>
              <input
                type="number"
                step="0.0001"
                value={formData.calcRate}
                onChange={e => setFormData(prev => ({ ...prev, calcRate: e.target.value }))}
                placeholder="VD: 0.02 (2%)"
                className="w-full px-2.5 py-1.5 border border-slate-700 rounded bg-slate-900 text-xs text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Hệ số điều chỉnh</label>
              <input
                type="number"
                step="0.01"
                value={formData.calcAdjustRate}
                onChange={e => setFormData(prev => ({ ...prev, calcAdjustRate: e.target.value }))}
                placeholder="VD: 0.50"
                className="w-full px-2.5 py-1.5 border border-slate-700 rounded bg-slate-900 text-xs text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Các khoản chi phí (Trước thuế, VAT, Sau thuế) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/40">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chi phí trước thuế (VNĐ)
              </label>
              <input
                type="number"
                value={formData.costBeforeTax}
                onChange={e => handleBeforeTaxChange(e.target.value)}
                placeholder="VD: 1000000000"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs font-mono font-bold text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Thuế VAT ({formData.vatRate || 0}%)
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.vatRate}
                  onChange={e => handleVatRateChange(e.target.value)}
                  className="w-20 px-2 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value={10}>10%</option>
                  <option value={8}>8%</option>
                  <option value={0}>0%</option>
                </select>
                <input
                  type="number"
                  value={formData.vatCost}
                  onChange={e => setFormData(prev => ({ ...prev, vatCost: e.target.value }))}
                  placeholder="Tiền VAT"
                  className="flex-1 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                Chi phí sau thuế (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.costAfterTax}
                onChange={e => setFormData(prev => ({ ...prev, costAfterTax: e.target.value }))}
                placeholder="VD: 1100000000"
                className="w-full px-3 py-2 border border-emerald-500/50 rounded-lg bg-slate-950 text-xs font-mono font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Hợp đồng & Căn cứ pháp lý */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Số Hợp đồng liên quan (nếu có)
              </label>
              <input
                type="text"
                value={formData.contractNo}
                onChange={e => setFormData(prev => ({ ...prev, contractNo: e.target.value }))}
                placeholder="VD: HĐ số 1299/2026/HĐTV-BQLĐSĐT"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <LegalDocLinker
              documentPath={formData.notes || ''}
              documentNumber={formData.contractNo}
              projectId={projectId}
              label="Căn cứ pháp lý / Văn bản duyệt (từ tab Pháp lý)"
              onDocumentChange={(path, num, doc) => {
                setFormData(prev => ({
                  ...prev,
                  notes: path || prev.notes,
                  contractNo: num || prev.contractNo
                }));
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Đang lưu...' : (isEdit ? 'Cập nhật Khoản mục' : 'Thêm vào Bảng TMĐT')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
