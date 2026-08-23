'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2, Package, Layers, Calendar, DollarSign } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';
import DatePickerVN from '../common/DatePickerVN';
import { toInputDateFormat } from '@/lib/formatters';

export default function PackageModal({
  isOpen,
  onClose,
  packageData = null,
  investmentItems = [],
  projectId,
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    package_code: '',
    package_name: '',
    package_type: 'Tư vấn',
    investment_item_id: '',
    khlcnt_decision_no: '',
    khlcnt_decision_date: '',
    estimated_price: '',
    procurement_method: 'Chỉ định thầu rút gọn',
    contract_type: 'Trọn gói',
    bidding_quarter: 'Quý I/2026',
    execution_duration: '60 ngày',
    status: 'da_ky_hop_dong',
    notes: ''
  });

  useEffect(() => {
    if (packageData) {
      setFormData({
        package_code: packageData.package_code || '',
        package_name: packageData.package_name || '',
        package_type: packageData.package_type || 'Tư vấn',
        investment_item_id: packageData.investment_item_id || '',
        khlcnt_decision_no: packageData.khlcnt_decision_no || '',
        khlcnt_decision_date: packageData.khlcnt_decision_date || '',
        estimated_price: packageData.estimated_price || '',
        procurement_method: packageData.procurement_method || 'Chỉ định thầu rút gọn',
        contract_type: packageData.contract_type || 'Trọn gói',
        bidding_quarter: packageData.bidding_quarter || 'Quý I/2026',
        execution_duration: packageData.execution_duration || '60 ngày',
        status: packageData.status || 'da_ky_hop_dong',
        notes: packageData.notes || ''
      });
    } else {
      setFormData({
        package_code: '',
        package_name: '',
        package_type: 'Tư vấn',
        investment_item_id: investmentItems[0]?.id || '',
        khlcnt_decision_no: '560/QĐ-BQLĐSĐT',
        khlcnt_decision_date: '2026-01-15',
        estimated_price: '',
        procurement_method: 'Chỉ định thầu rút gọn',
        contract_type: 'Trọn gói',
        bidding_quarter: 'Quý I/2026',
        execution_duration: '60 ngày',
        status: 'da_ky_hop_dong',
        notes: ''
      });
    }
  }, [packageData, investmentItems]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.package_code.trim() || !formData.package_name.trim()) {
      return alert('Vui lòng nhập Mã và Tên gói thầu');
    }

    try {
      setLoading(true);
      const url = '/api/procurement/packages';
      const method = packageData ? 'PUT' : 'POST';
      const payload = packageData 
        ? { id: packageData.id, ...formData }
        : { project_id: projectId, ...formData };

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
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Package size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {packageData ? 'Chỉnh Sửa Gói Thầu' : 'Thêm Mới Gói Thầu (KHLCNT)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Kế hoạch lựa chọn nhà thầu theo Luật Đấu thầu số 22/2023/QH15
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Mã gói thầu <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={formData.package_code}
                onChange={e => setFormData({ ...formData, package_code: e.target.value })}
                placeholder="VD: TV1, XL-01"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Loại gói thầu</label>
              <select
                value={formData.package_type}
                onChange={e => setFormData({ ...formData, package_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="Tư vấn">Tư vấn</option>
                <option value="Xây lắp">Xây lắp</option>
                <option value="Mua sắm thiết bị">Mua sắm thiết bị</option>
                <option value="Phi tư vấn">Phi tư vấn</option>
                <option value="Hỗn hợp">Hỗn hợp</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Trạng thái</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="dang_lap_hsmt">Đang lập HSMT / HSYC</option>
                <option value="dang_dau_thau">Đang tổ chức đấu thầu</option>
                <option value="da_duyet_kqlcnt">Đã duyệt KQLCNT</option>
                <option value="da_ky_hop_dong">Đã ký Hợp đồng</option>
                <option value="hoan_thanh">Hoàn thành</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Tên gói thầu <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={formData.package_name}
              onChange={e => setFormData({ ...formData, package_name: e.target.value })}
              placeholder="Nhập tên gói thầu đầy đủ theo Quyết định duyệt KHLCNT"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Khoản mục TMĐT liên kết</label>
              <select
                value={formData.investment_item_id}
                onChange={e => setFormData({ ...formData, investment_item_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Không gắn khoản mục cụ thể --</option>
                {investmentItems.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.item_code || '-'}] {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Giá gói thầu được duyệt (VNĐ) <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={formData.estimated_price}
                onChange={e => setFormData({ ...formData, estimated_price: e.target.value })}
                placeholder="VD: 5574573235"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Số QĐ phê duyệt KHLCNT</label>
              <input
                type="text"
                value={formData.khlcnt_decision_no}
                onChange={e => setFormData({ ...formData, khlcnt_decision_no: e.target.value })}
                placeholder="VD: 560/QĐ-BQLĐSĐT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Ngày ban hành QĐ KHLCNT</label>
              <DatePickerVN
                value={formData.khlcnt_decision_date}
                onChange={val => setFormData({ ...formData, khlcnt_decision_date: val })}
              />
            </div>
          </div>

          {/* Liên kết QĐ KHLCNT từ tab Pháp lý */}
          <LegalDocLinker
            documentPath={formData.document_path || ''}
            documentNumber={formData.khlcnt_decision_no}
            projectId={projectId}
            label="Văn bản Quyết định duyệt KHLCNT (từ tab Pháp lý)"
            onDocumentChange={(path, num, doc) => {
              setFormData(prev => ({
                ...prev,
                document_path: path,
                khlcnt_decision_no: num || prev.khlcnt_decision_no,
                khlcnt_decision_date: doc ? (toInputDateFormat(doc.date || doc.ngay_phat_hanh) || prev.khlcnt_decision_date) : prev.khlcnt_decision_date
              }));
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Hình thức lựa chọn</label>
              <select
                value={formData.procurement_method}
                onChange={e => setFormData({ ...formData, procurement_method: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="Đấu thầu rộng rãi qua mạng">Đấu thầu rộng rãi qua mạng</option>
                <option value="Chỉ định thầu rút gọn">Chỉ định thầu rút gọn</option>
                <option value="Chỉ định thầu thông thường">Chỉ định thầu thông thường</option>
                <option value="Chào hàng cạnh tranh">Chào hàng cạnh tranh</option>
                <option value="Tự thực hiện">Tự thực hiện</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Loại hợp đồng</label>
              <select
                value={formData.contract_type}
                onChange={e => setFormData({ ...formData, contract_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="Trọn gói">Trọn gói</option>
                <option value="Đơn giá cố định">Đơn giá cố định</option>
                <option value="Đơn giá điều chỉnh">Đơn giá điều chỉnh</option>
                <option value="Theo thời gian">Theo thời gian</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Thời gian thực hiện</label>
              <input
                type="text"
                value={formData.execution_duration}
                onChange={e => setFormData({ ...formData, execution_duration: e.target.value })}
                placeholder="VD: 60 ngày, 180 ngày"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Ghi chú</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Ghi chú thêm về gói thầu..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {packageData ? 'Lưu Thay Đổi' : 'Tạo Gói Thầu'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
