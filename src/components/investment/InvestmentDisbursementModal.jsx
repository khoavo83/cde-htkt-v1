'use client';

import { useState, useEffect } from 'react';
import { X, Save, Receipt, CreditCard } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';
import DatePickerVN from '../common/DatePickerVN';
import { toInputDateFormat, formatMoneyVN } from '@/lib/formatters';

export default function InvestmentDisbursementModal({
  isOpen,
  onClose,
  allItems = [],
  allocations = [],
  projectId,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    investmentItemId: '',
    capitalAllocationId: '',
    voucherNo: '',
    disbursementDate: new Date().toISOString().split('T')[0],
    amount: '',
    disbursementType: 'thanh_toan_kl',
    recipient: '',
    contractNo: '',
    description: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        investmentItemId: allItems && allItems.length > 0 ? allItems[0].id : '',
        capitalAllocationId: allocations && allocations.length > 0 ? allocations[0].id : '',
        voucherNo: '',
        disbursementDate: new Date().toISOString().split('T')[0],
        amount: '',
        disbursementType: 'thanh_toan_kl',
        recipient: '',
        contractNo: '',
        description: ''
      });
    }
  }, [isOpen, allItems, allocations]);

  if (!isOpen) return null;

  // Khi chọn item -> tự động điền contractNo nếu có
  const handleItemChange = (itemId) => {
    const selected = allItems.find(i => i.id === itemId);
    setFormData(prev => ({
      ...prev,
      investmentItemId: itemId,
      contractNo: selected?.contract_no || prev.contractNo
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.disbursementDate || !formData.amount) {
      return alert('Vui lòng nhập Ngày giải ngân và Số tiền');
    }

    try {
      setSaving(true);
      const res = await fetch('/api/investment/disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi lưu giải ngân');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-400">
                Nhập Chứng Từ Giải Ngân Thực Tế
              </h3>
              <p className="text-xs text-slate-500">
                Ghi nhận số tiền giải ngân qua Kho bạc / Ngân hàng
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Khoản mục chi phí TMĐT <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.investmentItemId}
              onChange={e => handleItemChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- [Chọn mục chi phí giải ngân] --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_code ? `[${item.item_code}] ` : ''}{item.name} {item.cost_after_tax ? `(${formatMoneyVN(item.cost_after_tax)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nguồn vốn / Quyết định giao vốn
            </label>
            <select
              value={formData.capitalAllocationId}
              onChange={e => setFormData(prev => ({ ...prev, capitalAllocationId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- [Chưa gắn nguồn vốn cụ thể] --</option>
              {allocations.map(a => (
                <option key={a.id} value={a.id}>
                  {a.decision_no} - {a.allocation_phase} ({formatMoneyVN(a.amount)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Số chứng từ / Ủy nhiệm chi
              </label>
              <input
                type="text"
                value={formData.voucherNo}
                onChange={e => setFormData(prev => ({ ...prev, voucherNo: e.target.value }))}
                placeholder="VD: UNC-085/2026"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs font-mono text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ngày giải ngân <span className="text-red-400">*</span>
              </label>
              <DatePickerVN
                value={formData.disbursementDate}
                onChange={val => setFormData(prev => ({ ...prev, disbursementDate: val }))}
              />
            </div>
          </div>

          {/* Liên kết file chứng từ scan từ tab Pháp lý */}
          <LegalDocLinker
            documentPath={formData.documentPath || ''}
            documentNumber={formData.voucherNo}
            projectId={projectId}
            label="File Chứng từ / UNC scan (từ tab Pháp lý)"
            onDocumentChange={(path, num, doc) => {
              setFormData(prev => ({
                ...prev,
                documentPath: path,
                voucherNo: num || prev.voucherNo,
                disbursementDate: doc ? (toInputDateFormat(doc.date || doc.ngay_phat_hanh) || prev.disbursementDate) : prev.disbursementDate,
                description: prev.description || doc?.title || doc?.name || ''
              }));
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                Số tiền giải ngân (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="VD: 5574573235"
                className="w-full px-3 py-2 border border-emerald-500/50 rounded-lg bg-slate-950 text-xs font-mono font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Loại giải ngân
              </label>
              <select
                value={formData.disbursementType}
                onChange={e => setFormData(prev => ({ ...prev, disbursementType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="thanh_toan_kl">Thanh toán khối lượng A-B</option>
                <option value="tam_ung">Tạm ứng hợp đồng</option>
                <option value="thu_hoi_tam_ung">Thu hồi tạm ứng</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Đơn vị thụ hưởng
              </label>
              <input
                type="text"
                value={formData.recipient}
                onChange={e => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                placeholder="VD: Công ty VTCO..."
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Số Hợp đồng
              </label>
              <input
                type="text"
                value={formData.contractNo}
                onChange={e => setFormData(prev => ({ ...prev, contractNo: e.target.value }))}
                placeholder="VD: HĐ số 1395/2026/HĐTV..."
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Diễn giải nội dung chi
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="VD: Thanh toán đợt 1 hợp đồng đo vẽ phục vụ thu hồi đất..."
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
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
              {saving ? 'Đang lưu...' : 'Ghi nhận Giải Ngân'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
