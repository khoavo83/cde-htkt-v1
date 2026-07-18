import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, FileText } from 'lucide-react';

const CATEGORIES = [
  "Quy hoạch",
  "Sở ngành",
  "Đất đai",
  "Rà phá bom mìn",
  "Phú Mỹ Hưng",
  "Khác"
];

const STATUS_OPTIONS = [
  { value: "effective", label: "Có hiệu lực" },
  { value: "pending", label: "Đang xử lý" },
  { value: "expired", label: "Hết hiệu lực" },
  { value: "draft", label: "Dự thảo" }
];

const COMMON_FOLDERS = [
  "26. Quy hoạch",
  "Sở NNMT",
  "Văn phòng ĐKĐĐ TP",
  "Lữ đoàn 239 - Binh chủng Công binh",
  "Tổng Công ty Xây dựng Lũng Lô",
  "Tổng Công ty Thành An - Binh đoàn 11",
  "Trung tâm xử lý bom mìn",
  "Lữ đoàn 299 -Quân đoàn 12",
  "Công ty TNHH Phát triển Phú Mỹ Hưng",
  "Bồi thường BT-CG"
];

export default function DocumentFormModal({ 
  document: docToEdit, 
  isOpen, 
  onClose, 
  onSubmit 
}) {
  const isEditMode = !!docToEdit;

  const [formData, setFormData] = useState({
    name: '',
    documentNumber: '',
    issuedDate: '',
    issuer: '',
    category: 'Khác',
    folder: 'Bồi thường BT-CG',
    status: 'effective',
    driveUrl: '',
    size: '1.5 MB',
    notes: '',
    plots: [] // Thừa đất được bảo lưu
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load dữ liệu khi mở modal (ở chế độ sửa)
  useEffect(() => {
    if (isOpen) {
      if (docToEdit) {
        setFormData({
          id: docToEdit.id,
          name: docToEdit.name || '',
          documentNumber: docToEdit.documentNumber || '',
          issuedDate: docToEdit.issuedDate || '',
          issuer: docToEdit.issuer || '',
          category: docToEdit.category || 'Khác',
          folder: docToEdit.folder || 'Bồi thường BT-CG',
          status: docToEdit.status || 'effective',
          driveUrl: docToEdit.driveUrl || '',
          size: docToEdit.size || '1.5 MB',
          notes: docToEdit.notes || '',
          plots: docToEdit.plots || []
        });
      } else {
        // Reset form cho chế độ tạo mới
        setFormData({
          name: '',
          documentNumber: '',
          issuedDate: new Date().toISOString().split('T')[0],
          issuer: 'Ban Quản lý Đường sắt Đô thị',
          category: 'Khác',
          folder: 'Bồi thường BT-CG',
          status: 'effective',
          driveUrl: 'https://drive.google.com',
          size: '1.5 MB',
          notes: '',
          plots: []
        });
      }
      setError('');
    }
  }, [isOpen, docToEdit]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên văn bản');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi lưu văn bản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100">
              {isEditMode ? 'Chỉnh sửa thông tin văn bản' : 'Thêm văn bản mới vào dự án'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tên văn bản */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tên văn bản <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="VD: QĐ-UBND Ban hành Kế hoạch thực hiện dự án..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Số hiệu văn bản */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Số hiệu văn bản
              </label>
              <input
                type="text"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleInputChange}
                placeholder="VD: 1209/BQLĐSĐT-HTKT"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200"
              />
            </div>
            
            {/* Ngày ban hành */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Ngày ban hành
              </label>
              <input
                type="date"
                name="issuedDate"
                value={formData.issuedDate}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200 cursor-pointer"
              />
            </div>
          </div>

          {/* Cơ quan ban hành */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Cơ quan ban hành
            </label>
            <input
              type="text"
              name="issuer"
              value={formData.issuer}
              onChange={handleInputChange}
              placeholder="VD: Văn phòng Đăng ký Đất đai TP.HCM"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Danh mục */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Danh mục
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200 cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Thư mục cha */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Thư mục lưu trữ
              </label>
              <select
                name="folder"
                value={formData.folder}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200 cursor-pointer"
              >
                {COMMON_FOLDERS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Trạng thái hiệu lực */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Trạng thái hiệu lực
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200 cursor-pointer"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Link Google Drive */}
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Đường dẫn liên kết Google Drive
              </label>
              <input
                type="url"
                name="driveUrl"
                value={formData.driveUrl}
                onChange={handleInputChange}
                placeholder="https://drive.google.com/..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200"
              />
            </div>

            {/* Dung lượng file */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Dung lượng file
              </label>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                placeholder="VD: 1.5 MB"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200"
              />
            </div>
          </div>

          {/* Trích yếu / Ghi chú */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Trích yếu nội dung / Ghi chú bổ sung
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Nhập nội dung tóm tắt của văn bản, ý kiến chỉ đạo, hoặc các lưu ý đặc biệt..."
              rows={3}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-all text-slate-200 resize-none"
            ></textarea>
          </div>

          {/* Hộp thoại nút bấm submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Đang lưu...' : 'Lưu văn bản'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
