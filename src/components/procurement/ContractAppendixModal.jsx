'use client';

import { useState } from 'react';
import { X, CheckCircle2, Loader2, Plus, Calendar, DollarSign, FileText } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';
import DatePickerVN from '../common/DatePickerVN';
import { toInputDateFormat } from '@/lib/formatters';

export default function ContractAppendixModal({
  isOpen,
  onClose,
  contract,
  projectId,
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    appendix_no: 'PLHĐ số 01/2026',
    appendix_type: 'BO_SUNG_KHOI_LUONG',
    sign_date: new Date().toISOString().split('T')[0],
    delta_amount: '',
    new_end_date: '',
    notes: '',
    document_path: ''
  });

  if (!isOpen || !contract) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appendix_no.trim()) {
      return alert('Vui lòng nhập Số phụ lục hợp đồng');
    }

    try {
      setLoading(true);
      const res = await fetch('/api/procurement/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'appendix',
          contract_id: contract.id,
          ...formData
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi thêm phụ lục');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Thêm Phụ Lục Hợp Đồng</h3>
              <p className="text-[11px] text-slate-400">
                Hợp đồng: <b className="text-blue-400 font-mono">{contract.contract_no}</b>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Số Phụ lục <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={formData.appendix_no}
                onChange={e => setFormData({ ...formData, appendix_no: e.target.value })}
                placeholder="VD: PLHĐ số 01/2026"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-purple-400 font-mono font-bold focus:ring-1 focus:ring-purple-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Loại phụ lục</label>
              <select
                value={formData.appendix_type}
                onChange={e => setFormData({ ...formData, appendix_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="BO_SUNG_KHOI_LUONG">Bổ sung khối lượng (+/- giá trị)</option>
                <option value="GIA_HAN_TIEN_DO">Gia hạn tiến độ hoàn thành</option>
                <option value="DIEU_CHINH_DON_GIA">Điều chỉnh đơn giá hợp đồng</option>
                <option value="THAY_DOI_NHAN_SU">Thay đổi nhân sự / Chủ trì</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Ngày ký phụ lục</label>
              <DatePickerVN
                value={formData.sign_date}
                onChange={val => setFormData({ ...formData, sign_date: val })}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Giá trị tăng / giảm (VNĐ)</label>
              <input
                type="number"
                value={formData.delta_amount}
                onChange={e => setFormData({ ...formData, delta_amount: e.target.value })}
                placeholder="VD: 150000000 hoặc -50000000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {formData.appendix_type === 'GIA_HAN_TIEN_DO' && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Thời hạn hoàn thành mới</label>
              <input
                type="date"
                value={formData.new_end_date}
                onChange={e => setFormData({ ...formData, new_end_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Lý do điều chỉnh / Nội dung</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="VD: Bổ sung khảo sát đo vẽ chi tiết nút giao Cần Giờ..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>

          <LegalDocLinker
            documentPath={formData.document_path || ''}
            documentNumber={formData.appendix_no}
            projectId={projectId}
            label="File Phụ lục hợp đồng scan (từ tab Pháp lý)"
            onDocumentChange={(path, num, doc) => {
              setFormData(prev => ({
                ...prev,
                document_path: path,
                appendix_no: num || prev.appendix_no,
                sign_date: doc ? (toInputDateFormat(doc.date || doc.ngay_phat_hanh) || prev.sign_date) : prev.sign_date
              }));
            }}
          />

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Lưu Phụ Lục HĐ
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
