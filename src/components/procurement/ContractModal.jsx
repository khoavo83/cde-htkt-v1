'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2, FileText, Calendar, DollarSign, Building, ShieldCheck } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';
import DatePickerVN from '../common/DatePickerVN';
import { toInputDateFormat, formatMoneyVN } from '@/lib/formatters';

export default function ContractModal({
  isOpen,
  onClose,
  contractData = null,
  packages = [],
  selectedPackageId = null,
  projectId,
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    package_id: '',
    contract_no: '',
    contract_name: '',
    contractor_name: '',
    contractor_tax_code: '',
    contractor_leader: '',
    sign_date: '',
    effective_date: '',
    end_date: '',
    contract_value: '',
    advance_guarantee_expiry: '',
    performance_guarantee_expiry: '',
    document_path: '',
    status: 'dang_thuc_hien',
    notes: ''
  });

  useEffect(() => {
    if (contractData) {
      setFormData({
        package_id: contractData.package_id || '',
        contract_no: contractData.contract_no || '',
        contract_name: contractData.contract_name || '',
        contractor_name: contractData.contractor_name || '',
        contractor_tax_code: contractData.contractor_tax_code || '',
        contractor_leader: contractData.contractor_leader || '',
        sign_date: contractData.sign_date || '',
        effective_date: contractData.effective_date || '',
        end_date: contractData.end_date || '',
        contract_value: contractData.contract_value || '',
        advance_guarantee_expiry: contractData.advance_guarantee_expiry || '',
        performance_guarantee_expiry: contractData.performance_guarantee_expiry || '',
        document_path: contractData.document_path || '',
        status: contractData.status || 'dang_thuc_hien',
        notes: contractData.notes || ''
      });
    } else {
      const defaultPkg = selectedPackageId || (packages[0]?.id || '');
      setFormData({
        package_id: defaultPkg,
        contract_no: '',
        contract_name: '',
        contractor_name: '',
        contractor_tax_code: '',
        contractor_leader: '',
        sign_date: new Date().toISOString().split('T')[0],
        effective_date: new Date().toISOString().split('T')[0],
        end_date: '',
        contract_value: '',
        advance_guarantee_expiry: '',
        performance_guarantee_expiry: '',
        document_path: '',
        status: 'dang_thuc_hien',
        notes: ''
      });
    }
  }, [contractData, packages, selectedPackageId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.package_id || !formData.contract_no.trim() || !formData.contractor_name.trim()) {
      return alert('Vui lòng nhập đầy đủ Gói thầu, Số hợp đồng và Nhà thầu thực hiện');
    }

    try {
      setLoading(true);
      const url = '/api/procurement/contracts';
      const method = contractData ? 'PUT' : 'POST';
      const payload = contractData
        ? { id: contractData.id, ...formData }
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
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {contractData ? 'Chỉnh Sửa Hợp Đồng Kinh Tế' : 'Thêm Mới Hợp Đồng Kinh Tế'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Quản lý điều khoản hợp đồng, giá trị cam kết và bảo lãnh ngân hàng
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Thuộc Gói thầu <span className="text-red-400">*</span></label>
            <select
              value={formData.package_id}
              onChange={e => setFormData({ ...formData, package_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
              required
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.package_code}] {p.package_name} (Giá gói: {formatMoneyVN(p.estimated_price || 0)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Số Hợp đồng <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={formData.contract_no}
                onChange={e => setFormData({ ...formData, contract_no: e.target.value })}
                placeholder="VD: 1395/2026/HĐTV-BQLĐSĐT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-blue-400 font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Giá trị Hợp đồng (Sau thuế) <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={formData.contract_value}
                onChange={e => setFormData({ ...formData, contract_value: e.target.value })}
                placeholder="VD: 5574573235"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Tên Hợp đồng</label>
            <input
              type="text"
              value={formData.contract_name}
              onChange={e => setFormData({ ...formData, contract_name: e.target.value })}
              placeholder="VD: Hợp đồng tư vấn đo vẽ, lập bản đồ vị trí phục vụ thu hồi đất"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Nhà thầu / Liên danh <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={formData.contractor_name}
                onChange={e => setFormData({ ...formData, contractor_name: e.target.value })}
                placeholder="Tên nhà thầu trúng thầu"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Mã số thuế</label>
              <input
                type="text"
                value={formData.contractor_tax_code}
                onChange={e => setFormData({ ...formData, contractor_tax_code: e.target.value })}
                placeholder="VD: 0301234567"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Người đại diện / Chủ trì</label>
              <input
                type="text"
                value={formData.contractor_leader}
                onChange={e => setFormData({ ...formData, contractor_leader: e.target.value })}
                placeholder="Họ và tên"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Ngày ký HĐ</label>
              <DatePickerVN
                value={formData.sign_date}
                onChange={val => setFormData({ ...formData, sign_date: val })}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Ngày hiệu lực</label>
              <DatePickerVN
                value={formData.effective_date}
                onChange={val => setFormData({ ...formData, effective_date: val })}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Ngày hết hạn cam kết</label>
              <DatePickerVN
                value={formData.end_date}
                onChange={val => setFormData({ ...formData, end_date: val })}
              />
            </div>
          </div>

          {/* Khối bảo lãnh */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-[11px] font-bold text-purple-400 uppercase flex items-center gap-1.5">
              <ShieldCheck size={14} /> Thời Hạn Bảo Lãnh Ngân Hàng
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Hạn bảo lãnh tạm ứng</label>
                <DatePickerVN
                  value={formData.advance_guarantee_expiry}
                  onChange={val => setFormData({ ...formData, advance_guarantee_expiry: val })}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Hạn bảo lãnh thực hiện HĐ</label>
                <DatePickerVN
                  value={formData.performance_guarantee_expiry}
                  onChange={val => setFormData({ ...formData, performance_guarantee_expiry: val })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LegalDocLinker
              documentPath={formData.document_path || ''}
              documentNumber={formData.contract_no}
              projectId={projectId}
              label="File Hợp đồng scan (từ tab Pháp lý)"
              onDocumentChange={(path, num, doc) => {
                setFormData(prev => ({
                  ...prev,
                  document_path: path,
                  contract_no: num || prev.contract_no,
                  sign_date: doc ? (toInputDateFormat(doc.date || doc.ngay_phat_hanh) || prev.sign_date) : prev.sign_date
                }));
              }}
            />

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Trạng thái Hợp đồng</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="dang_thuc_hien">Đang thực hiện</option>
                <option value="da_nghiem_thu">Đã nghiệm thu hoàn thành</option>
                <option value="da_thanh_ly">Đã thanh lý / Quyết toán</option>
              </select>
            </div>
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
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {contractData ? 'Lưu Thay Đổi' : 'Lưu Hợp Đồng'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
