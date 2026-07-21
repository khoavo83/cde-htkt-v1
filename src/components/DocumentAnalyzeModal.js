'use client';

import { useState, useEffect } from 'react';
import { 
  X, Save, Bot, CheckCircle2, AlertTriangle, 
  FileText, Sparkles, Loader2, Shield,
  Calendar, User, Tag, Hash, FolderOpen, Send, Copy, Type, XCircle, ScanEye, Link2, Plus, ExternalLink
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
  allDocuments = [],
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [aiReading, setAiReading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(null); 
  const [extractedText, setExtractedText] = useState('');
  const [extractMode, setExtractMode] = useState(null); // 'ocr' | 'ai'
  
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    documentNumber: '',
    issuedDate: '',
    issuer: '',
    notes: '',
    category: '',
    status: 'effective',
    receiver: '', // Nơi gửi
    draftFiles: [], // File dự thảo/đính kèm
  });
  
  const [selectedDraftFile, setSelectedDraftFile] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && doc) {
      setAnalysisResult(null);
      setAnalysisMode(null);
      setExtractedText('');
      setExtractMode(null);
      setAiReading(false);
      setWarning('');
      setError('');
      setShowConfirm(false);
      setShowCloseConfirm(false);
      setFormData({
        documentNumber: doc.documentNumber || doc.so_vb || '',
        issuedDate: doc.issuedDate || doc.ngay_phat_hanh || '',
        issuer: doc.issuer || doc.noi_phat_hanh || '',
        notes: doc.notes || doc.trich_yeu || '',
        category: doc.category || doc.loai_vb || '',
        status: doc.status || 'effective',
        receiver: doc.noi_gui || doc.receiver || '',
        draftFiles: doc.draftFiles || doc.draft_files || [],
      });
      setSelectedDraftFile('');
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const handleClose = () => {
    setShowCloseConfirm(true);
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

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
        setExtractMode('ocr');
        // Kiểm tra xem text có vẻ bị lỗi font không (nhiều ký tự lạ, thiếu dấu TV)
        const weirdCharCount = (data.text.match(/[§©®°¡¢£¤¥¦¨ª«¬­¯±²³´µ¶·¸¹º»¼½¾¿]/g) || []).length;
        if (weirdCharCount > 5) {
          setWarning('⚠️ Phát hiện lỗi font: File PDF này dùng font đặc biệt nên một số chữ tiếng Việt có thể bị sai dấu. Hãy đối chiếu với nội dung PDF bên trái để chỉnh sửa.');
        }
      } else {
        setError(data.error || 'Trích xuất chữ thất bại (Có thể do file scan ảnh, không chứa text)');
      }
    } catch (err) {
      setError('Lỗi kết nối server: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleAiRead = async () => {
    setAiReading(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/documents/ai-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath: doc.path, 
          fileId: doc.id,
          fileName: doc.name || doc.file_name 
        }),
      });
      const data = await res.json();

      if (data.success && data.text) {
        setExtractedText(data.text);
        setExtractMode('ai');
      } else {
        setError(data.error || 'AI đọc thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server: ' + err.message);
    } finally {
      setAiReading(false);
    }
  };

  const handleCopyText = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
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
        draftFiles: formData.draftFiles,
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
          noi_gui: updatedDoc.noi_gui,
          draftFiles: updatedDoc.draftFiles
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
    if (analysisMode?.includes('gemini')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold ml-2">
          <Sparkles className="w-3 h-3" />
          Gemini Flash AI
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

  // Chuẩn bị URL embed cho iframe
  let embedUrl = '';
  if (doc.path) {
    // Dùng API trực tiếp với Chrome PDF viewer, yêu cầu hiển thị từng trang (view=Fit)
    embedUrl = `/api/documents/view?path=${encodeURIComponent(doc.path)}#toolbar=1&navpanes=1&scrollbar=1&view=Fit`;
  } else if (doc.webViewLink) {
    embedUrl = doc.webViewLink.replace(/\/view.*$/, '/preview');
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => !showConfirm && !showCloseConfirm && handleClose()}
      />

      {/* Modal Container */}
      <div className="relative w-full h-full max-w-7xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-0 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-sm shrink-0">
          <div className="flex items-center gap-3 pr-8 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 rounded-xl shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Phân tích & Nhập liệu Văn bản
                </h2>
                {getModeBadge()}
              </div>
              <div className="text-[11px] text-slate-400 max-w-lg mt-1 flex flex-col gap-0.5">
                <span className="truncate" title={doc.name || doc.file_name}>
                  <FileText className="w-3 h-3 inline mr-1 text-slate-500" />
                  <strong className="text-slate-300">Tên file:</strong> {doc.name || doc.file_name}
                </span>
                <span className="truncate" title={doc.id}>
                  <Hash className="w-3 h-3 inline mr-1 text-slate-500" />
                  <strong className="text-slate-300">File ID:</strong> <span className="font-mono">{doc.id}</span>
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-colors shrink-0"
            disabled={showConfirm || showCloseConfirm}
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area (Split Grid) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-950/50">
          
          {/* Left Column: PDF Viewer */}
          <div className="flex-1 lg:w-[55%] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-[40vh] lg:h-full bg-[#323639] min-h-0">
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
          <div className="flex-1 lg:w-[45%] flex flex-col h-full max-h-full bg-slate-900 relative min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar min-h-0">
              

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
                      <Type className="w-3.5 h-3.5 text-slate-400" />
                      'OCR Code (Trang đầu)'
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
              <div className="grid grid-cols-12 gap-3 sm:gap-4">
                
                {/* Loại VB (Danh mục) */}
                <div className="col-span-12 sm:col-span-3 xl:col-span-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="category"
                    list="category-options"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Loại VB..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                  <datalist id="category-options">
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* Số VB */}
                <div className="col-span-12 sm:col-span-5 xl:col-span-5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="Số VB..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-12 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <ConfidenceBadge value={analysisResult?.confidence?.documentNumber} />
                  </div>
                </div>

                {/* Ngày phát hành */}
                <div className="col-span-12 sm:col-span-4 xl:col-span-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="issuedDate"
                    value={formData.issuedDate}
                    onChange={handleInputChange}
                    placeholder="Ngày ban hành..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-8 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
                  />
                  <div className="absolute inset-y-0 right-8 pr-1 flex items-center pointer-events-none">
                    <ConfidenceBadge value={analysisResult?.confidence?.issuedDate} />
                  </div>
                </div>

                {/* Nơi phát hành */}
                <div className="col-span-12 sm:col-span-6 relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <textarea
                    name="issuer"
                    value={formData.issuer}
                    onChange={handleInputChange}
                    placeholder="Nơi phát hành"
                    rows={2}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-12 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 resize-none shadow-inner leading-snug"
                  />
                  <div className="absolute top-2 right-2 pointer-events-none">
                    <ConfidenceBadge value={analysisResult?.confidence?.issuer} />
                  </div>
                </div>

                {/* Nơi gửi */}
                <div className="col-span-12 sm:col-span-6 relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <Send className="w-4 h-4 text-slate-500" />
                  </div>
                  <textarea
                    name="receiver"
                    value={formData.receiver}
                    onChange={handleInputChange}
                    placeholder="Nơi nhận"
                    rows={2}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-12 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 resize-none shadow-inner leading-snug"
                  />
                  <div className="absolute top-2 right-2 pointer-events-none">
                    <ConfidenceBadge value={analysisResult?.confidence?.receiver} />
                  </div>
                </div>
                
                {/* Trích yếu nội dung */}
                <div className="col-span-12 relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Trích yếu nội dung văn bản..."
                    rows={3}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-12 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 resize-none shadow-inner leading-relaxed"
                  />
                  <div className="absolute top-2 right-2 pointer-events-none">
                    <ConfidenceBadge value={analysisResult?.confidence?.notes} />
                  </div>
                </div>

                {/* File dự thảo đính kèm */}
                <div className="col-span-12 relative mt-2 border-t border-slate-800/80 pt-4">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-3">
                    <Link2 className="w-4 h-4 text-cyan-400" />
                    File dự thảo / Đính kèm ({formData.draftFiles?.length || 0})
                  </h3>
                  
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedDraftFile}
                      onChange={(e) => setSelectedDraftFile(e.target.value)}
                      className="flex-1 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer text-slate-200"
                    >
                      <option value="">-- Chọn file đính kèm --</option>
                      {allDocuments.filter(d => d.id !== doc.id && !formData.draftFiles?.includes(d.id)).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.file_name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!selectedDraftFile) return;
                        setFormData(prev => ({
                          ...prev,
                          draftFiles: [...(prev.draftFiles || []), selectedDraftFile]
                        }));
                        setSelectedDraftFile('');
                      }}
                      type="button"
                      disabled={!selectedDraftFile}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Gán
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                    {(formData.draftFiles || []).map((fileId) => {
                      const linkedDoc = allDocuments.find(d => d.id === fileId);
                      return (
                        <div key={fileId} className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl group hover:border-slate-700/80 transition-colors">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-slate-200 truncate font-medium" title={linkedDoc ? (linkedDoc.name || linkedDoc.file_name) : fileId}>
                              {linkedDoc ? (linkedDoc.name || linkedDoc.file_name) : fileId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {linkedDoc && (
                              <a
                                href={`/api/documents/view?path=${encodeURIComponent(linkedDoc.path)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-slate-800 rounded text-cyan-400 hover:text-cyan-300"
                                title="Xem file"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  draftFiles: prev.draftFiles.filter(id => id !== fileId)
                                }));
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300"
                              title="Gỡ liên kết"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {(!formData.draftFiles || formData.draftFiles.length === 0) && (
                      <div className="text-center py-4 text-slate-500 border border-dashed border-slate-700/60 rounded-xl text-xs">
                        Chưa có file đính kèm nào.
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Nút hành động */}
                <div className="col-span-12 pt-4 mt-2 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Các công cụ trích xuất AI */}
                    <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleExtractText}
                        disabled={extracting}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-600/50 shadow-sm"
                        title="Trích xuất chữ bằng thư viện code (nhanh, có thể sai font)"
                      >
                        {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
                        OCR Code
                      </button>
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                        title="Tự động phân tích và điền vào form"
                      >
                        {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Phân tích Tự động
                      </button>
                    </div>

                    {/* Các nút Hủy / Lưu */}
                    <div className="flex items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleClose}
                        className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Hủy
                      </button>
                      <button
                        onClick={() => setShowConfirm(true)}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Save className="w-4 h-4" />
                        Lưu thông tin
                      </button>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Spacing for footer */}
              <div className="h-6"></div>
            </div>
            
            {/* Save Confirmation Overlay */}
            {showConfirm && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                    <Save className="w-5 h-5 text-emerald-500"/> Xác nhận Lưu
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Bạn có chắc chắn muốn lưu các thay đổi này vào cơ sở dữ liệu? Dữ liệu cũ sẽ bị ghi đè.
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
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                      disabled={saving}
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin"/> Đang lưu...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Đồng ý lưu</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Close Confirmation Overlay */}
            {showCloseConfirm && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                    <X className="w-5 h-5 text-red-500"/> Xác nhận thoát
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Bạn có chắc chắn muốn thoát? Các dữ liệu chưa được lưu sẽ bị mất.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={confirmClose}
                      className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                    >
                      Đồng ý thoát
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
