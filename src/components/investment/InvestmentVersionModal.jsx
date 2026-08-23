'use client';

import { useState, useEffect } from 'react';
import { X, Save, Copy, Layers } from 'lucide-react';
import LegalDocLinker from '../documents/LegalDocLinker';
import DatePickerVN from '../common/DatePickerVN';
import { toInputDateFormat } from '@/lib/formatters';

export default function InvestmentVersionModal({
  isOpen,
  onClose,
  version = null,
  allVersions = [],
  projectId,
  onSuccess
}) {
  const isEdit = !!version;

  const [formData, setFormData] = useState({
    versionCode: '',
    versionName: '',
    decisionNo: '',
    decisionDate: '',
    approvedBy: '',
    notes: '',
    cloneFromVersionId: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (version) {
        setFormData({
          versionCode: version.version_code || '',
          versionName: version.version_name || '',
          decisionNo: version.decision_no || '',
          decisionDate: version.decision_date ? version.decision_date.split('T')[0] : '',
          approvedBy: version.approved_by || '',
          notes: version.notes || '',
          cloneFromVersionId: ''
        });
      } else {
        const nextIndex = (allVersions || []).length;
        const defaultCode = `V${nextIndex}`;
        const defaultName = nextIndex === 0 ? 'TMĐT phê duyệt lần đầu' : `TMĐT điều chỉnh lần ${nextIndex}`;
        const lastVersion = allVersions && allVersions.length > 0 ? allVersions[allVersions.length - 1] : null;

        setFormData({
          versionCode: defaultCode,
          versionName: defaultName,
          decisionNo: '',
          decisionDate: new Date().toISOString().split('T')[0],
          approvedBy: '',
          notes: '',
          cloneFromVersionId: lastVersion ? lastVersion.id : ''
        });
      }
    }
  }, [isOpen, version, allVersions]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.versionCode.trim() || !formData.versionName.trim()) {
      return alert('Vui lòng nhập Mã và Tên phiên bản TMĐT');
    }

    try {
      setSaving(true);
      const url = '/api/investment/versions';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        id: version?.id,
        projectId
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.version);
        onClose();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi lưu phiên bản');
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
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-400">
                {isEdit ? 'Chỉnh sửa Phiên bản TMĐT' : 'Tạo Phiên bản Phê duyệt Mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý lịch sử phê duyệt lần đầu và các lần điều chỉnh (V0, V1, V2...)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ký hiệu (Code) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.versionCode}
                onChange={e => setFormData(prev => ({ ...prev, versionCode: e.target.value }))}
                placeholder="VD: V1"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs font-mono font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tên Phiên bản phê duyệt <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.versionName}
                onChange={e => setFormData(prev => ({ ...prev, versionName: e.target.value }))}
                placeholder="VD: TMĐT điều chỉnh lần 1"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Số Quyết định phê duyệt
              </label>
              <input
                type="text"
                value={formData.decisionNo}
                onChange={e => setFormData(prev => ({ ...prev, decisionNo: e.target.value }))}
                placeholder="VD: 235/BCTT hoặc 123/QĐ-UBND"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ngày ban hành quyết định
              </label>
              <DatePickerVN
                value={formData.decisionDate}
                onChange={val => setFormData(prev => ({ ...prev, decisionDate: val }))}
              />
            </div>
          </div>

          {/* Liên kết văn bản từ tab Pháp lý */}
          <LegalDocLinker
            documentPath={formData.documentPath || ''}
            documentNumber={formData.decisionNo}
            projectId={projectId}
            label="Văn bản Quyết định phê duyệt TMĐT (từ tab Pháp lý)"
            onDocumentChange={(path, num, doc) => {
              setFormData(prev => ({
                ...prev,
                documentPath: path,
                decisionNo: num || prev.decisionNo,
                decisionDate: doc ? (toInputDateFormat(doc.date || doc.ngay_phat_hanh) || prev.decisionDate) : prev.decisionDate,
                approvedBy: doc?.issuing_agency || prev.approvedBy
              }));
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cơ quan / Đơn vị phê duyệt / Thẩm tra
            </label>
            <input
              type="text"
              value={formData.approvedBy}
              onChange={e => setFormData(prev => ({ ...prev, approvedBy: e.target.value }))}
              placeholder="VD: UBND Thành phố Hồ Chí Minh / Tam Kiệt"
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Tùy chọn sao chép dữ liệu từ bản cũ */}
          {!isEdit && allVersions && allVersions.length > 0 && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <label className="block text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <Copy size={14} /> Sao chép Cây khoản mục từ phiên bản trước
              </label>
              <select
                value={formData.cloneFromVersionId}
                onChange={e => setFormData(prev => ({ ...prev, cloneFromVersionId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
              >
                <option value="">-- Tạo bảng trống (Không sao chép) --</option>
                {allVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    [{v.version_code}] {v.version_name} {v.decision_no ? `(${v.decision_no})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Khuyên dùng: Sao chép từ phiên bản liền trước giúp bạn chỉ cần sửa đổi những mục chi phí có biến động.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ghi chú / Lý do điều chỉnh
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="VD: Điều chỉnh tăng chi phí bồi thường và bổ sung kinh phí đo vẽ GPMB..."
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
              {saving ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo Phiên Bản')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
