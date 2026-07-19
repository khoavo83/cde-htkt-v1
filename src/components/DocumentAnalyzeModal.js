'use client';

import { useState, useEffect } from 'react';
import { 
  X, Save, Bot, CheckCircle2, AlertTriangle, 
  FileText, Sparkles, Loader2, Shield,
  Calendar, User, Tag, Hash, FolderOpen, Send, Copy, Type
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

// Badge hiển thị độ tin cậy của AI (Confidence)
function ConfidenceBadge({ value }) {
  if (value === undefined || value === null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    : pct >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
    : 'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${color} flex-shrink-0 ml-2`} title="Độ tin cậy của AI">
      {pct}% AI
    </span>
  );
}

export default function DocumentAnalyzeModal({
  document: doc,
  isOpen,
  onClose,
  onSave,
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(null); 
  const [extractedText, setExtractedText] = useState('');
  
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    documentNumber: '',
    issuedDate: '',
    issuer: '',
    notes: '',
    category: 'Khác',
    status: 'effective',
    receiver: '', // Nơi gửi
  });
  
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && doc) {
      setAnalysisResult(null);
      setAnalysisMode(null);
      setExtractedText('');
      setWarning('');
      setError('');
      setShowConfirm(false);
      setFormData({
        documentNumber: doc.documentNumber || doc.so_vb || '',
        issuedDate: doc.issuedDate || doc.ngay_phat_hanh || '',
        issuer: doc.issuer || doc.noi_phat_hanh || '',
        notes: doc.notes || doc.trich_yeu || '',
        category: doc.category || doc.loai_vb || 'Khác',
        status: doc.status || 'effective',
        receiver: doc.noi_gui || doc.receiver || '',
      });
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

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

        // Update form data directly with AI results
        setFormData(prev => ({
          ...prev,
          documentNumber: data.analysis.documentNumber || prev.documentNumber,
          issuedDate: data.analysis.issuedDate || prev.issuedDate,
          issuer: data.analysis.issuer || prev.issuer,
          notes: data.analysis.notes || prev.notes,
          category: data.analysis.category || prev.category,
          receiver: data.analysis.receiver || prev.receiver, // Fallback if AI provides receiver
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

  const handleExtractText = async () => {
    setExtracting(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/documents/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.path, fileId: doc.id }),
      });
      const data = await res.json();

      if (data.success && data.text) {
        setExtractedText(data.text);
      } else {
        setError(data.error || 'Trích xuất chữ thất bại (Có thể do file scan ảnh, không chứa text)');
      }
    } catch (err) {
      setError('Lỗi kết nối server: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleCopyText = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      // Optional: show a small toast here if available
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfirm = async () => {
    setSaving(true);
    try {
      const updatedDoc = {
        ...doc,
        documentNumber: formData.documentNumber,
        issuedDate: formData.issuedDate,
        issuer: formData.issuer,
        notes: formData.notes,
        category: formData.category,
        status: formData.status,
        receiver: formData.receiver,
        
        so_vb: formData.documentNumber,
        ngay_phat_hanh: formData.issuedDate,
        noi_phat_hanh: formData.issuer,
        trich_yeu: formData.notes,
        loai_vb: formData.category,
        noi_gui: formData.receiver,
      };

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
          noi_gui: updatedDoc.noi_gui
        })
      });

      await onSave(updatedDoc);
      setShowConfirm(false);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const getModeBadge = () => {
    if (!analysisMode) return null;
    if (analysisMode === 'gemini_2.0_flash') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold ml-2">
          <Sparkles className="w-3 h-3" />
          Gemini 2.0 AI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 font-bold ml-2">
        <Shield className="w-3 h-3" />
        Regex Cải tiến
      </span>
    );
  };

  // Chuẩn bị URL embed cho iframe (Dùng Google Drive Preview để hỗ trợ mọi định dạng file)
  const embedUrl = doc.webViewLink 
    ? doc.webViewLink.replace(/\/view.*$/, '/preview')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => !showConfirm && onClose()}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-[98vw] lg:max-w-[90vw] xl:max-w-7xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-sm shrink-0">
          <div className="flex items-center gap-3 pr-8 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 rounded-xl shrink-0 shadow-inner">
              <Bot className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Phân tích & Nhập liệu Văn bản
                </h2>
                {getModeBadge()}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-lg mt-1" title={doc.name}>
                <FileText className="w-3 h-3 inline mr-1 text-slate-500" />
                {doc.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
            disabled={showConfirm}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area (Split Grid) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-950/50">
          
          {/* Left Column: PDF Viewer */}
          <div className="flex-1 lg:w-[55%] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-[40vh] lg:h-full bg-[#323639]">
            {embedUrl ? (
              <iframe 
                src={embedUrl} 
                className="w-full h-full border-0" 
                title="Trình xem tài liệu"
                allow="autoplay"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Không thể xem trước tệp này.</p>
              </div>
            )}
          </div>

          {/* Right Column: Data Form */}
          <div className="flex-1 lg:w-[45%] flex flex-col h-full max-h-full bg-slate-900 relative">
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 mb-2 bg-slate-800/40 p-2 rounded-xl border border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium pl-2">Thông tin trích xuất</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExtractText}
                    disabled={extracting}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-600/50 shadow-sm"
                  >
                    {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5" />}
                    Lấy chữ (PDF)
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                    Phân tích AI
                  </button>
                </div>
              </div>

              {/* Messages */}
              {warning && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{warning}</span>
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[11px] text-red-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}
              
              {/* Vùng hiển thị Text trích xuất (nếu có) */}
              {extractedText && (
                <div className="bg-slate-950/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/60 border-b border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-slate-400" /> Nội dung thô (Trang đầu)
                    </span>
                    <button 
                      onClick={handleCopyText}
                      className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-3">
                    <textarea
                      readOnly
                      value={extractedText}
                      rows={5}
                      className="w-full bg-transparent text-[11px] text-slate-300 focus:outline-none resize-none custom-scrollbar"
                    />
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Loại VB (Danh mục) - Chuyển sang DataList để cho phép gõ */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Loại VB (Danh mục)
                    </label>
                  </div>
                  <input
                    type="text"
                    name="category"
                    list="category-options"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Chọn hoặc nhập loại văn bản..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                  <datalist id="category-options">
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* Số VB */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Số VB
                    </label>
                    <ConfidenceBadge value={analysisResult?.confidence?.documentNumber} />
                  </div>
                  <input
                    type="text"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="VD: 1209/BQL..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                </div>

                {/* Ngày phát hành */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Ngày phát hành
                    </label>
                    <ConfidenceBadge value={analysisResult?.confidence?.issuedDate} />
                  </div>
                  <input
                    type="date"
                    name="issuedDate"
                    value={formData.issuedDate}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner custom-calendar-icon"
                  />
                </div>

                {/* Nơi phát hành */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Nơi phát hành
                    </label>
                    <ConfidenceBadge value={analysisResult?.confidence?.issuer} />
                  </div>
                  <input
                    type="text"
                    name="issuer"
                    value={formData.issuer}
                    onChange={handleInputChange}
                    placeholder="VD: Ban Quản lý..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                </div>

                {/* Nơi gửi */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Nơi gửi (Nơi nhận)
                    </label>
                    <ConfidenceBadge value={analysisResult?.confidence?.receiver} />
                  </div>
                  <input
                    type="text"
                    name="receiver"
                    value={formData.receiver}
                    onChange={handleInputChange}
                    placeholder="VD: Sở Tài Nguyên Môi Trường, UBND TP..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                </div>
                
                {/* Trích yếu nội dung */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Trích yếu nội dung
                    </label>
                    <ConfidenceBadge value={analysisResult?.confidence?.notes} />
                  </div>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Nhập trích yếu tóm tắt nội dung văn bản..."
                    rows={4}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 resize-none shadow-inner leading-relaxed"
                  />
                </div>

              </div>
              
              {/* Spacing for footer */}
              <div className="h-6"></div>
            </div>

            {/* Footer Form */}
            <div className="p-4 bg-slate-900 border-t border-slate-800/80 shrink-0">
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                Lưu thông tin văn bản
              </button>
            </div>
            
            {/* Confirmation Overlay */}
            {showConfirm && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Xác nhận lưu
                  </h3>
                  <p className="text-sm text-slate-300 mb-6">
                    Bạn có chắc chắn muốn lưu các thông tin đã chỉnh sửa cho văn bản này không? Dữ liệu cũ sẽ bị ghi đè.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                      disabled={saving}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveConfirm}
                      disabled={saving}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Đồng ý lưu</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
