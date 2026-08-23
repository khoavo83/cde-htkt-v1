'use client';

import { useState, useEffect } from 'react';
import { X, Save, DollarSign, FileText } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';
import DatePickerVN from '../common/DatePickerVN';
import { toInputDateFormat } from '@/lib/formatters';

export default function CapitalPlanModal({
  isOpen,
  onClose,
  mode = 'allocation', // 'plan' hoặc 'allocation'
  capitalPlans = [],
  projectId,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    type: mode,
    // Cho Plan
    planType: 'hang_nam',
    title: '',
    periodStartYear: new Date().getFullYear(),
    periodEndYear: new Date().getFullYear(),
    plannedAmount: '',
    fundingSource: 'Ngân sách Thành phố',
    priorityLevel: 'high',
    // Cho Allocation
    capitalPlanId: '',
    decisionNo: '',
    decisionDate: new Date().toISOString().split('T')[0],
    year: new Date().getFullYear(),
    allocationPhase: 'Giao vốn đợt 1 (Đầu năm)',
    sourceType: 'Ngân sách Thành phố',
    amount: '',
    documentPath: '',
    status: 'effective',
    extendedYear: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        type: mode,
        capitalPlanId: capitalPlans && capitalPlans.length > 0 ? capitalPlans[0].id : '',
        title: mode === 'plan' ? `Kế hoạch vốn năm ${new Date().getFullYear()}` : '',
        decisionNo: '',
        amount: '',
        documentPath: '',
        notes: ''
      }));
    }
  }, [isOpen, mode, capitalPlans]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.type === 'plan' && !formData.title.trim()) {
      return alert('Vui lòng nhập tên kế hoạch vốn');
    }
    if (formData.type === 'allocation' && (!formData.decisionNo.trim() || !formData.amount)) {
      return alert('Vui lòng nhập Số Quyết định giao vốn và Số tiền giao');
    }

    try {
      setSaving(true);
      const res = await fetch('/api/investment/capital-plans', {
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
        alert(data.error || 'Có lỗi xảy ra khi lưu');
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
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-400">
                {formData.type === 'plan' ? 'Tạo Kế Hoạch Vốn Mới' : 'Thêm Quyết Định Giao Vốn'}
              </h3>
              <p className="text-xs text-slate-500">
                {formData.type === 'plan' ? 'Quản lý khung vốn trung hạn 5 năm hoặc kế hoạch vốn hàng năm' : 'Giao vốn theo Quyết định của UBND / Sở Tài chính'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {formData.type === 'plan' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Loại Kế hoạch vốn <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.planType}
                  onChange={e => setFormData(prev => ({ ...prev, planType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="hang_nam">Kế hoạch vốn hàng năm</option>
                  <option value="trung_han">Kế hoạch vốn trung hạn (5 năm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên Kế hoạch vốn <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="VD: Kế hoạch vốn năm 2026 hoặc Trung hạn 2026-2030"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Năm bắt đầu
                  </label>
                  <input
                    type="number"
                    value={formData.periodStartYear}
                    onChange={e => setFormData(prev => ({ ...prev, periodStartYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Năm kết thúc
                  </label>
                  <input
                    type="number"
                    value={formData.periodEndYear}
                    onChange={e => setFormData(prev => ({ ...prev, periodEndYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tổng mức vốn dự kiến (VNĐ)
                </label>
                <input
                  type="number"
                  value={formData.plannedAmount}
                  onChange={e => setFormData(prev => ({ ...prev, plannedAmount: e.target.value }))}
                  placeholder="VD: 6000000000000"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs font-mono font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nguồn vốn
                </label>
                <select
                  value={formData.fundingSource}
                  onChange={e => setFormData(prev => ({ ...prev, fundingSource: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Ngân sách Thành phố">Ngân sách Thành phố (Vốn tập trung)</option>
                  <option value="Ngân sách Trung ương">Ngân sách Trung ương</option>
                  <option value="Vốn ODA / Vay lại">Vốn ODA / Vay lại</option>
                  <option value="Nguồn thu hợp pháp khác">Nguồn thu hợp pháp khác</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Thuộc Kế hoạch vốn
                </label>
                <select
                  value={formData.capitalPlanId}
                  onChange={e => setFormData(prev => ({ ...prev, capitalPlanId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- [Không liên kết kế hoạch] --</option>
                  {capitalPlans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.funding_source || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Số QĐ giao vốn <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.decisionNo}
                    onChange={e => setFormData(prev => ({ ...prev, decisionNo: e.target.value }))}
                    placeholder="VD: 450/QĐ-UBND"
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs font-mono font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ngày ban hành QĐ
                  </label>
                  <DatePickerVN
                    value={formData.decisionDate}
                    onChange={val => setFormData(prev => ({ ...prev, decisionDate: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Năm thực hiện <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nguồn vốn
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={e => setFormData(prev => ({ ...prev, sourceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Ngân sách Thành phố">Ngân sách Thành phố</option>
                    <option value="Ngân sách Trung ương">Ngân sách Trung ương</option>
                    <option value="Vốn ODA / Vay lại">Vốn ODA / Vay lại</option>
                    <option value="Nguồn thu hợp pháp khác">Nguồn thu hợp pháp khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Đợt giao vốn
                  </label>
                  <select
                    value={formData.allocationPhase}
                    onChange={e => setFormData(prev => ({ ...prev, allocationPhase: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Giao vốn đợt 1 (Đầu năm)">Giao vốn đợt 1 (Đầu năm)</option>
                    <option value="Bổ sung vốn đợt 2">Bổ sung vốn đợt 2</option>
                    <option value="Bổ sung vốn đợt 3">Bổ sung vốn đợt 3</option>
                    <option value="Điều chỉnh giảm vốn">Điều chỉnh giảm / Điều hòa vốn</option>
                    <option value="Kéo dài niên độ vốn">Kéo dài niên độ vốn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">
                    Số vốn được giao (VNĐ) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="VD: 4000000000000"
                    className="w-full px-3 py-2 border border-emerald-500/50 rounded-lg bg-slate-950 text-xs font-mono font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <LegalDocLinker
                documentPath={formData.documentPath || ''}
                documentNumber={formData.decisionNo}
                projectId={projectId}
                label="Văn bản Quyết định giao vốn (từ tab Pháp lý)"
                onDocumentChange={(path, num, doc) => {
                  setFormData(prev => ({
                    ...prev,
                    documentPath: path,
                    decisionNo: num || prev.decisionNo,
                    decisionDate: doc ? (toInputDateFormat(doc.date || doc.ngay_phat_hanh) || prev.decisionDate) : prev.decisionDate
                  }));
                }}
              />
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ghi chú chi tiết..."
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
              {saving ? 'Đang lưu...' : (formData.type === 'plan' ? 'Tạo Kế Hoạch' : 'Lưu QĐ Giao Vốn')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
