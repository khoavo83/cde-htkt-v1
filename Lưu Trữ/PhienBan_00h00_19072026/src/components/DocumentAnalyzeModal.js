'use client';

import { useState, useEffect } from 'react';
import { 
  X, Save, Brain, RefreshCw, Edit3, CheckCircle2, AlertTriangle, 
  FileText, Sparkles, Loader2, ArrowRight, Pencil, Shield,
  Calendar, User, Tag, Hash, FolderOpen, MessageSquare
} from 'lucide-react';

const CATEGORIES = [
  "Quy hoạch", "Sở ngành", "Đất đai", "Rà phá bom mìn", "Phú Mỹ Hưng", "Khác"
];

const STATUS_OPTIONS = [
  { value: "effective", label: "Có hiệu lực" },
  { value: "pending", label: "Đang xử lý" },
  { value: "expired", label: "Hết hiệu lực" },
  { value: "draft", label: "Dự thảo" }
];

// Thanh confidence với hiệu ứng gradient
function ConfidenceBar({ value, label }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'from-emerald-500 to-teal-400' 
    : pct >= 50 ? 'from-amber-500 to-yellow-400' 
    : 'from-red-500 to-orange-400';
  const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] text-slate-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[9px] font-bold w-8 text-right ${textColor}`}>{pct}%</span>
    </div>
  );
}

export default function DocumentAnalyzeModal({
  document: doc,
  isOpen,
  onClose,
  onSave,
}) {
  // Trạng thái phân tích
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(null); // 'gemini_2.0_flash' | 'regex_improved'
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  // Trạng thái form chỉnh sửa
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    documentNumber: '',
    issuedDate: '',
    issuer: '',
    notes: '',
    category: 'Khác',
    status: 'effective',
  });
  const [saving, setSaving] = useState(false);

  // Reset khi mở/đóng
  useEffect(() => {
    if (isOpen && doc) {
      setAnalysisResult(null);
      setAnalysisMode(null);
      setWarning('');
      setError('');
      setIsEditing(false);
      setEditData({
        documentNumber: doc.documentNumber || '',
        issuedDate: doc.issuedDate || '',
        issuer: doc.issuer || '',
        notes: doc.notes || '',
        category: doc.category || 'Khác',
        status: doc.status || 'effective',
      });
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  // Gọi API phân tích
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: doc.id,
          fileName: doc.name || doc.file_name,
          folderName: doc.folder,
        }),
      });
      const data = await res.json();

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        setAnalysisMode(data.analysis.analysisMode || 'unknown');
        if (data.warning) setWarning(data.warning);

        // Cập nhật editData với kết quả phân tích
        setEditData(prev => ({
          ...prev,
          documentNumber: data.analysis.documentNumber || prev.documentNumber,
          issuedDate: data.analysis.issuedDate || prev.issuedDate,
          issuer: data.analysis.issuer || prev.issuer,
          notes: data.analysis.notes || prev.notes,
          category: data.analysis.category || prev.category,
        }));
      } else {
        setError(data.error || 'Phân tích thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Chuyển sang chế độ nhập tay
  const handleSwitchToEdit = () => {
    setIsEditing(true);
  };

  // Cập nhật input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  // Lưu kết quả
  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedDoc = {
        ...doc,
        // Giữ các thuộc tính tiếng Anh để Modal xài
        documentNumber: editData.documentNumber,
        issuedDate: editData.issuedDate,
        issuer: editData.issuer,
        notes: editData.notes,
        category: editData.category,
        status: editData.status,
        
        // Map sang tiếng Việt để FolderTree xài và hiển thị trên bảng
        so_vb: editData.documentNumber,
        ngay_phat_hanh: editData.issuedDate,
        noi_phat_hanh: editData.issuer,
        trich_yeu: editData.notes,
        loai_vb: editData.category,
      };

      // Gửi request cập nhật vào database (đánh dấu manually_edited = true)
      await fetch('/api/drive/extract', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: doc.id,
          fileName: doc.name || doc.file_name,
          webViewLink: doc.webViewLink || doc.web_view_link,
          loai_vb: updatedDoc.loai_vb,
          so_vb: updatedDoc.so_vb,
          ngay_phat_hanh: updatedDoc.ngay_phat_hanh,
          noi_phat_hanh: updatedDoc.noi_phat_hanh,
          trich_yeu: updatedDoc.trich_yeu,
          noi_gui: doc.noi_gui || ''
        })
      });

      await onSave(updatedDoc);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Badge cho AI mode
  const getModeBadge = () => {
    if (!analysisMode) return null;
    if (analysisMode === 'gemini_2.0_flash') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 font-bold">
          <Sparkles className="w-3 h-3" />
          Gemini 2.0 Flash (AI)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
        <Shield className="w-3 h-3" />
        Regex cải tiến (Offline)
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-violet-950/20">
          <div className="flex items-start gap-3 pr-8 min-w-0">
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl mt-0.5 shrink-0">
              <Brain className="w-6 h-6 text-violet-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 mb-1.5">
                Phân tích & Nhận diện văn bản
              </h2>
              <p className="text-[10px] text-slate-400 truncate max-w-[350px]" title={doc.name}>
                <FileText className="w-3 h-3 inline mr-1 text-slate-500" />
                {doc.name}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                <FolderOpen className="w-3 h-3 inline mr-1" />
                {doc.folder}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Thông tin hiện tại */}
          {!analysisResult && !isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Thông tin hiện tại (có thể sai)
                </h3>
                <span className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                  Chưa phân tích lại
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Số hiệu" value={doc.documentNumber} icon={<Hash className="w-3 h-3" />} />
                <InfoField label="Ngày ban hành" value={doc.issuedDate} icon={<Calendar className="w-3 h-3" />} />
                <InfoField label="Cơ quan ban hành" value={doc.issuer} icon={<User className="w-3 h-3" />} className="col-span-2" />
                <InfoField label="Danh mục" value={doc.category} icon={<Tag className="w-3 h-3" />} />
                <InfoField label="Trạng thái" value={doc.status} icon={<CheckCircle2 className="w-3 h-3" />} />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3" />
                  Trích yếu nội dung
                </span>
                <p className="text-[11px] text-slate-300 bg-slate-950/60 border border-slate-850 p-2.5 rounded-lg leading-relaxed">
                  {doc.notes || 'Không có'}
                </p>
              </div>
            </div>
          )}

          {/* Kết quả phân tích AI */}
          {analysisResult && !isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Kết quả phân tích mới
                </h3>
                {getModeBadge()}
              </div>

              {warning && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-900/30 rounded-xl text-[10px] text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              )}

              {/* Confidence Overview */}
              {analysisResult.confidence && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Độ tin cậy AI</span>
                  <ConfidenceBar value={analysisResult.confidence.documentNumber} label="Số hiệu" />
                  <ConfidenceBar value={analysisResult.confidence.issuedDate} label="Ngày BH" />
                  <ConfidenceBar value={analysisResult.confidence.issuer} label="Cơ quan" />
                  <ConfidenceBar value={analysisResult.confidence.notes} label="Trích yếu" />
                </div>
              )}

              {/* So sánh Cũ → Mới */}
              <div className="space-y-2">
                <CompareField 
                  label="Số hiệu văn bản" 
                  oldValue={doc.documentNumber} 
                  newValue={analysisResult.documentNumber}
                  confidence={analysisResult.confidence?.documentNumber}
                />
                <CompareField 
                  label="Ngày ban hành" 
                  oldValue={doc.issuedDate} 
                  newValue={analysisResult.issuedDate}
                  confidence={analysisResult.confidence?.issuedDate}
                />
                <CompareField 
                  label="Cơ quan ban hành" 
                  oldValue={doc.issuer} 
                  newValue={analysisResult.issuer}
                  confidence={analysisResult.confidence?.issuer}
                />
                <CompareField 
                  label="Trích yếu" 
                  oldValue={doc.notes} 
                  newValue={analysisResult.notes}
                  confidence={analysisResult.confidence?.notes}
                  isLong
                />
                <CompareField 
                  label="Danh mục" 
                  oldValue={doc.category} 
                  newValue={analysisResult.category}
                />
              </div>
            </div>
          )}

          {/* Form nhập tay */}
          {isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-cyan-400" />
                  Chỉnh sửa thủ công
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← Quay lại xem kết quả
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Số hiệu */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Số hiệu văn bản
                  </label>
                  <input
                    type="text"
                    name="documentNumber"
                    value={editData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="VD: 1209/BQLĐSĐT-HTKT"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-violet-500 transition-all text-slate-200"
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
                    value={editData.issuedDate}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-violet-500 transition-all text-slate-200 cursor-pointer"
                  />
                </div>

                {/* Cơ quan ban hành */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cơ quan ban hành
                  </label>
                  <input
                    type="text"
                    name="issuer"
                    value={editData.issuer}
                    onChange={handleInputChange}
                    placeholder="VD: Ban Quản lý Đường sắt Đô thị"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-violet-500 transition-all text-slate-200"
                  />
                </div>

                {/* Danh mục */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Danh mục
                  </label>
                  <select
                    name="category"
                    value={editData.category}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-violet-500 transition-all text-slate-200 cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Trạng thái hiệu lực
                  </label>
                  <select
                    name="status"
                    value={editData.status}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-violet-500 transition-all text-slate-200 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Trích yếu */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Trích yếu nội dung / Ghi chú
                  </label>
                  <textarea
                    name="notes"
                    value={editData.notes}
                    onChange={handleInputChange}
                    placeholder="Nhập nội dung tóm tắt..."
                    rows={3}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-violet-500 transition-all text-slate-200 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
          {/* Left: Phân tích lại */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-500/10"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  {analysisResult ? 'Phân tích lại' : '🔄 Phân tích bằng AI'}
                </>
              )}
            </button>

            {/* Nút nhập tay */}
            {!isEditing && (
              <button
                onClick={handleSwitchToEdit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                Nhập tay
              </button>
            )}
          </div>

          {/* Right: Lưu / Hủy */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              Đóng
            </button>

            {(analysisResult || isEditing) && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : '💾 Lưu kết quả'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function InfoField({ label, value, icon, className = '' }) {
  return (
    <div className={className}>
      <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </span>
      <span className="text-[11px] font-semibold text-slate-200 bg-slate-950/60 border border-slate-850 px-2.5 py-1.5 rounded-lg block">
        {value || '—'}
      </span>
    </div>
  );
}

function CompareField({ label, oldValue, newValue, confidence, isLong }) {
  const isChanged = oldValue !== newValue;
  const confColor = confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.5 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className={`bg-slate-950/40 border rounded-xl p-2.5 ${isChanged ? 'border-violet-500/30' : 'border-slate-800/60'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 font-bold">{label}</span>
        {confidence !== undefined && (
          <span className={`text-[8px] font-bold ${confColor}`}>
            {Math.round(confidence * 100)}% tin cậy
          </span>
        )}
      </div>

      {isChanged ? (
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-[8px] text-red-400 bg-red-500/10 px-1 rounded font-bold shrink-0 mt-0.5">CŨ</span>
            <span className={`text-[10px] text-slate-500 line-through ${isLong ? '' : 'truncate'}`}>
              {oldValue || '—'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1 rounded font-bold shrink-0 mt-0.5">MỚI</span>
            <span className={`text-[10px] text-emerald-300 font-semibold ${isLong ? 'leading-relaxed' : 'truncate'}`}>
              {newValue || '—'}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-[10px] text-slate-300">
          {newValue || '—'}
          <span className="text-[8px] text-slate-500 ml-2">(không đổi)</span>
        </span>
      )}
    </div>
  );
}
