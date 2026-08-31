'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AgencyCombobox from './AgencyCombobox';
import StaffCombobox from './StaffCombobox';
import { useAuth } from '@/context/AuthContext';
import { 
  X, Save, Bot, CheckCircle2, AlertTriangle, 
  FileText, Sparkles, Loader2, Shield,
  Calendar, User, Tag, Hash, FolderOpen, Send, Copy, Type, XCircle, ScanEye, Link2, Plus, ExternalLink, Download, FileCheck, Unlink2, Trash2, ShieldAlert,
  FileCode, RotateCw, Check, BookOpen
} from 'lucide-react';
import MarkdownPreview from '@/components/common/MarkdownPreview';
import { formatDateVN, formatDateTimeVN } from '@/lib/formatters';


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
  onDetachPhieuTrinh,
  onAttachPhieuTrinhClick,
  onDelete,
  onAttachClick,
  allDocuments = [],
  allFolderFiles = [],
  agencies = [],
  documentTypes = [],
  analysisResult: customAnalysisResult,
}) {
  const { isEditor, openAuthModal } = useAuth();
  const analysisResult = customAnalysisResult || doc?.analysisResult || doc;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    is_outgoing: false, // Công văn đi
    draftFiles: [], // File dự thảo/đính kèm
    assignedStaff: '',
  });

  const [staffList, setStaffList] = useState([]);
  
  const [selectedDraftFile, setSelectedDraftFile] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // ─── States cho Kho tri thức Markdown (.md) ───
  const [activeTab, setActiveTab] = useState('metadata'); // 'metadata' | 'markdown'
  const [markdownContent, setMarkdownContent] = useState('');
  const [mdCharCount, setMdCharCount] = useState(0);
  const [mdGeneratedAt, setMdGeneratedAt] = useState(null);
  const [isGeneratingMd, setIsGeneratingMd] = useState(false);
  const [mdViewMode, setMdViewMode] = useState('preview'); // 'preview' | 'raw'
  const [copySuccess, setCopySuccess] = useState(false);
  const [mdSuccessMsg, setMdSuccessMsg] = useState('');

  const phapLyString = useMemo(() => {
    let str = formData.category ? `${formData.category}` : '';
    if (formData.documentNumber) {
      str += ` số ${formData.documentNumber}`;
    }
    if (formData.issuedDate) {
      let dd, mm, yyyy;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(formData.issuedDate)) {
        [dd, mm, yyyy] = formData.issuedDate.split('/');
      } else if (/^\d{4}-\d{2}-\d{2}/.test(formData.issuedDate)) {
        [yyyy, mm, dd] = formData.issuedDate.split('T')[0].split('-');
      } else {
        const d = new Date(formData.issuedDate);
        if (!isNaN(d.getTime())) {
          dd = String(d.getDate()).padStart(2, '0');
          mm = String(d.getMonth() + 1).padStart(2, '0');
          yyyy = d.getFullYear();
        }
      }
      if (dd && mm && yyyy) {
        str += ` ngày ${dd} tháng ${mm} năm ${yyyy}`;
      } else {
        str += ` ngày ${formData.issuedDate}`;
      }
    }
    
    if (formData.issuer) {
      str += ` của ${formData.issuer}`;
    }
    
    if (formData.receiver) {
      str += ` ký giữa ${formData.receiver}`;
    }
    
    if (formData.notes) {
      let trichYeu = formData.notes.trim();
      trichYeu = trichYeu.replace(/^v\/v:?\s*/i, 'về việc ');
      trichYeu = trichYeu.replace(/\s+v\/v\s+/gi, ' về việc ');
      
      if (!/^về việc/i.test(trichYeu)) {
        str += ` về việc ${trichYeu}`;
      } else {
        str += ` ${trichYeu}`;
      }
    }
    
    return str.trim();
  }, [formData.category, formData.documentNumber, formData.issuedDate, formData.issuer, formData.receiver, formData.notes]);

  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const res = await fetch('/api/staffs');
        const data = await res.json();
        if (data.success) {
          setStaffList(data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách cán bộ:', err);
      }
    };
    fetchStaffs();
  }, []);

  useEffect(() => {
    if (isOpen && doc) {
      // 1. Số hiệu
      const initialDocNumber = doc.documentNumber || doc.so_vb || analysisResult.documentNumber || analysisResult.so_vb || '';
      
      // 2. Ngày ban hành
      let rawDate = doc.issuedDate || doc.ngay_phat_hanh || analysisResult.issuedDate || analysisResult.ngay_phat_hanh || '';
      let initialDate = '';
      if (rawDate) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
          const [d, m, y] = rawDate.split('/');
          initialDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          initialDate = rawDate.split('T')[0];
        } else {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            initialDate = parsed.toISOString().split('T')[0];
          }
        }
      }

      // 3. Cơ quan ban hành
      const initialIssuer = doc.issuer || doc.noi_phat_hanh || analysisResult.issuer || analysisResult.noi_phat_hanh || '';

      // 4. Trích yếu / Nội dung
      const initialNotes = doc.notes || doc.trich_yeu || analysisResult.notes || analysisResult.trich_yeu || '';

      // 5. Loại văn bản
      const initialCategory = doc.category || doc.loai_vb || analysisResult.category || analysisResult.loai_vb || '';

      // 6. Trạng thái
      const initialStatus = doc.status || analysisResult.status || 'effective';

      // 7. Nơi nhận / Nơi gửi
      const initialReceiver = doc.receiver || doc.noi_gui || analysisResult.receiver || analysisResult.noi_gui || '';

      // 8. Cán bộ thụ lý
      const initialStaff = doc.assignedStaff || doc.nguoi_xu_ly || analysisResult.assignedStaff || analysisResult.nguoi_xu_ly || '';

      // 9. Công văn đi
      const initialIsOutgoing = doc.is_outgoing !== undefined ? doc.is_outgoing : (analysisResult.is_outgoing || false);

      // 10. File dự thảo / đính kèm
      const initialDraftFiles = doc.draftFiles || doc.file_dinh_kem || analysisResult.draftFiles || analysisResult.file_dinh_kem || [];

      setFormData({
        documentNumber: initialDocNumber,
        issuedDate: initialDate,
        issuer: initialIssuer,
        notes: initialNotes,
        category: initialCategory,
        status: initialStatus,
        receiver: initialReceiver,
        is_outgoing: initialIsOutgoing,
        draftFiles: Array.isArray(initialDraftFiles) ? initialDraftFiles : [],
        assignedStaff: initialStaff,
      });

      // 11. Load dữ liệu Markdown (.md) từ doc hoặc DB
      if (doc.content_md) {
        setMarkdownContent(doc.content_md);
        setMdCharCount(doc.md_char_count || doc.content_md.length);
        setMdGeneratedAt(doc.md_generated_at || null);
      } else {
        const fileId = doc.id || doc.fileId || doc.driveFileId;
        if (fileId) {
          fetch(`/api/documents/generate-md?fileId=${fileId}`)
            .then(res => res.json())
            .then(data => {
              if (data.has_md && data.content_md) {
                setMarkdownContent(data.content_md);
                setMdCharCount(data.md_char_count || data.content_md.length);
                setMdGeneratedAt(data.md_generated_at);
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [isOpen, doc]);

  // Xử lý tạo nội dung Markdown tự động nhận diện
  const handleGenerateMd = async () => {
    const targetFileId = doc.id || doc.fileId || doc.driveFileId;
    if (!targetFileId && !doc.name && !doc.file_name) return;

    setIsGeneratingMd(true);
    setError('');
    setMdSuccessMsg('');
    try {
      const res = await fetch('/api/documents/generate-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: targetFileId,
          fileName: doc.name || doc.file_name,
          force: true
        })
      });
      const data = await res.json();
      if (data.success && data.content_md) {
        setMarkdownContent(data.content_md);
        setMdCharCount(data.md_char_count || data.content_md.length);
        setMdGeneratedAt(data.md_generated_at || new Date().toISOString());
        setMdSuccessMsg(`Đã tạo và lưu thành công ${data.md_char_count || data.content_md.length} ký tự vào Supabase!`);
        if (onSave) {
          onSave({
            ...doc,
            content_md: data.content_md,
            is_md_generated: true,
            md_char_count: data.md_char_count || data.content_md.length,
            md_generated_at: data.md_generated_at || new Date().toISOString()
          });
        }
      } else {
        setError(data.error || 'Không thể tạo nội dung Markdown');
      }
    } catch (err) {
      setError('Lỗi khi gọi API tạo Markdown: ' + err.message);
    } finally {
      setIsGeneratingMd(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!markdownContent) return;
    navigator.clipboard.writeText(markdownContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!markdownContent) return;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (formData.documentNumber || doc.name || 'document')
      .replace(/[/\\?%*:|"<>]/g, '_');
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Xử lý phím tắt
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      // Ctrl + S để lưu
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Giả lập click nút Lưu (hoặc gọi trực tiếp hàm xử lý lưu, nhưng phải đảm bảo confirm)
        if (!showConfirm && !showCloseConfirm && !saving) {
          setShowConfirm(true);
        }
      }
      
      // Esc để đóng
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showConfirm) setShowConfirm(false);
        else if (showCloseConfirm) setShowCloseConfirm(false);
        else handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirm, showCloseConfirm, saving]);

  if (!isOpen || !doc) return null;

  const handleClose = () => {
    setShowCloseConfirm(true);
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
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
        is_outgoing: formData.is_outgoing,
        
        so_vb: formData.documentNumber,
        ngay_phat_hanh: formData.issuedDate,
        noi_phat_hanh: formData.issuer,
        trich_yeu: formData.notes,
        loai_vb: formData.category,
        noi_gui: formData.receiver,
        assignedStaff: formData.assignedStaff,
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
          is_outgoing: updatedDoc.is_outgoing,
          assignedStaff: updatedDoc.assignedStaff,
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

  // Chuẩn bị URL embed cho iframe
  let embedUrl = '';
  if (doc.driveWebLink || doc.webViewLink || doc.web_view_link) {
    const link = doc.driveWebLink || doc.webViewLink || doc.web_view_link;
    const fileIdMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    } else {
      embedUrl = link.replace(/\/view.*$/, '/preview');
    }
  } else if (doc.path) {
    embedUrl = `/api/documents/view?path=${encodeURIComponent(doc.path)}#toolbar=1&navpanes=1&scrollbar=1&view=Fit`;
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => !showConfirm && !showCloseConfirm && handleClose()}
      />

      {/* Modal Container */}
      <div className="relative w-[98vw] h-[98vh] max-w-[1920px] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-0 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-sm shrink-0">
          <div className="flex items-center gap-3 pr-8 min-w-0">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shrink-0 shadow-inner">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-start">
                <h2 className="text-sm font-bold text-emerald-400 flex items-start gap-2 group whitespace-normal leading-snug">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-slate-200 select-text">{phapLyString || 'Thông tin & Nhập liệu Văn bản'}</span>
                  {phapLyString && (
                    <button 
                      onClick={() => navigator.clipboard.writeText(phapLyString)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition-all shrink-0 -mt-1"
                      title="Sao chép nội dung pháp lý"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h2>
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
          <div className="flex items-center gap-2 shrink-0">
            {doc.mimeType && doc.mimeType.includes('word') && onAttachClick && (
              <button
                onClick={() => onAttachClick(doc)}
                className="flex items-center gap-2 p-2 bg-cyan-500/10 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
                disabled={showConfirm || showCloseConfirm}
                title="Gắn file này vào PDF"
              >
                <Link2 className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Gắn vào PDF</span>
              </button>
            )}
            {doc.mimeType === 'application/pdf' && doc.so_vb && doc.so_vb.toLowerCase().includes('ptr-htkt') && onAttachPhieuTrinhClick && (
              <button
                onClick={() => onAttachPhieuTrinhClick(doc)}
                className="flex items-center gap-2 p-2 bg-amber-500/10 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                disabled={showConfirm || showCloseConfirm}
                title="Gắn Phiếu trình này vào Văn bản chính"
              >
                <Link2 className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Gắn Phiếu trình</span>
              </button>
            )}
            {(doc.webViewLink || doc.web_view_link) && (
              <a
                href={doc.webViewLink || doc.web_view_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-emerald-500/10 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
                title="Xem trên Drive"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Mở Drive</span>
              </a>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete();
                }}
                className="flex items-center gap-2 p-2 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-colors shrink-0"
                disabled={showConfirm || showCloseConfirm}
                title="Xóa khỏi hệ thống"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Xóa</span>
              </button>
            )}
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button 
              onClick={handleClose}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-slate-100 transition-colors shrink-0"
              disabled={showConfirm || showCloseConfirm}
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area (Split Grid) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-950/50">
          
          {/* Left Column: PDF Viewer */}
          <div className="flex-1 lg:w-[60%] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-[40vh] lg:h-full bg-[#323639] min-h-0">
            {embedUrl ? (
              <iframe 
                src={embedUrl} 
                className="w-full h-full border-0" 
                title="Trình xem tài liệu"
                allow="autoplay"
                onError={(e) => {
                  console.error("Iframe load error, fallback might be needed.");
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Không thể xem trực tiếp tệp này.</p>
                <a href={doc.driveWebLink || doc.webViewLink || doc.web_view_link} target="_blank" rel="noopener noreferrer" className="mt-4 text-cyan-500 hover:underline text-xs">
                  Mở trên tab mới
                </a>
              </div>
            )}
          </div>

          {/* Right Column: Data Form & Markdown Knowledge Base */}
          <div className="flex-1 lg:w-[40%] flex flex-col h-full max-h-full bg-slate-900 relative min-h-0">
            {/* Tab Switcher Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('metadata')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'metadata'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Thuộc tính</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('markdown')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'markdown'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Kho tri thức (.md)</span>
                  {markdownContent ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  ) : (
                    <span className="text-[9px] bg-slate-800 text-cyan-400 px-1 py-0.5 rounded border border-cyan-500/30">Mới</span>
                  )}
                </button>
              </div>

              {/* Quick info / Actions on Top Right */}
              {activeTab === 'markdown' && markdownContent && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md hidden sm:inline">
                    {Math.round(mdCharCount / 1024 * 10) / 10} KB
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Sao chép toàn bộ Markdown"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copySuccess ? 'Đã chép' : 'Chép'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Tải file .md về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tải .md</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: METADATA FORM */}
            {activeTab === 'metadata' && (
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
              
              {/* Nút check Công văn đi */}
              <div className="mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Checkbox Văn bản đi */}
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/80 transition-colors shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={formData.is_outgoing}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_outgoing: e.target.checked }))}
                      className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer border-slate-600 bg-slate-900"
                    />
                    <span className="text-sm font-semibold text-slate-200 select-none">
                      Văn bản đi (Phát hành)
                    </span>
                  </label>

                  {/* Phiếu trình — hiện khi là Văn bản đi VÀ đã có Phiếu trình */}
                  {formData.is_outgoing && doc?.phieu_trinh && (
                    <div className="flex items-center gap-2 flex-wrap bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                      <FileCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <a
                        href={doc.phieu_trinh.webViewLink ? doc.phieu_trinh.webViewLink.replace(/\/view.*$/, '/preview') : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 text-sm font-medium hover:underline truncate max-w-[220px]"
                        title={`Mở Phiếu trình: ${doc.phieu_trinh.name}`}
                      >
                        {doc.phieu_trinh.name?.replace(/\.pdf$/i, '') || 'Phiếu trình'}
                      </a>
                      
                      {/* Hiển thị các file dự thảo của Phiếu trình (nếu có) */}
                      {(() => {
                        const ptDrafts = allFolderFiles.filter(f => String(f.parent_id) === String(doc.phieu_trinh.id));
                        return ptDrafts.map(ptDraft => (
                          <div key={ptDraft.id} className="flex items-center ml-1 pl-2 border-l border-amber-500/30">
                            <a
                              href={ptDraft.webContentLink || ptDraft.web_content_link || ptDraft.webViewLink || ptDraft.web_view_link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center justify-center"
                              title={`Tải/Xem: ${ptDraft.name || ptDraft.file_name}`}
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" />
                            </a>
                          </div>
                        ));
                      })()}
                      {onDetachPhieuTrinh && (
                        <button
                          onClick={() => onDetachPhieuTrinh(doc.phieu_trinh.id)}
                          className="ml-1 text-red-400 hover:text-red-300 flex-shrink-0"
                          title="Gỡ Phiếu trình"
                        >
                          <Unlink2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Thông báo khi là Văn bản đi nhưng chưa có Phiếu trình */}
                  {formData.is_outgoing && !doc?.phieu_trinh && (
                    <button
                      onClick={() => onAttachPhieuTrinhClick && onAttachPhieuTrinhClick(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-sm font-medium transition-colors"
                      title="Gắn file Phiếu trình"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Phiếu trình
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-12 gap-3 sm:gap-4">
                
                {/* Loại VB (Danh mục) */}
                <div className="col-span-12 sm:col-span-3 xl:col-span-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="w-4 h-4 text-slate-500" />
                  </div>
                  <select
                    name="category"
                    value={formData.category || ''}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-8 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="" disabled>-- Chọn Loại VB --</option>
                    {documentTypes.map(dt => (
                      <option key={dt.id} value={dt.name}>{dt.name}</option>
                    ))}
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
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
                <div className="col-span-12 sm:col-span-6">
                  <AgencyCombobox
                    value={formData.issuer}
                    agencies={agencies}
                    placeholder="Gõ để tìm Nơi phát hành..."
                    onChange={(val) => setFormData(prev => ({ ...prev, issuer: val }))}
                    confidence={<ConfidenceBadge value={analysisResult?.confidence?.issuer} />}
                  />
                </div>

                {/* Nơi gửi */}
                <div className="col-span-12 sm:col-span-6">
                  <AgencyCombobox
                    value={formData.receiver}
                    agencies={agencies}
                    placeholder="Gõ để tìm Nơi nhận..."
                    onChange={(val) => setFormData(prev => ({ ...prev, receiver: val }))}
                    confidence={<ConfidenceBadge value={analysisResult?.confidence?.receiver} />}
                  />
                </div>

                {/* Người xử lý */}
                <div className="col-span-12 sm:col-span-6 relative z-40">
                  <StaffCombobox
                    value={formData.assignedStaff}
                    staffs={staffList}
                    onChange={(val) => setFormData(prev => ({ ...prev, assignedStaff: val }))}
                  />
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
                    Dự thảo ({formData.draftFiles?.length || 0})
                  </h3>
                  
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedDraftFile}
                      onChange={(e) => setSelectedDraftFile(e.target.value)}
                      className="flex-1 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer text-slate-200"
                    >
                      <option value="">-- Chọn file dự thảo --</option>
                      {allFolderFiles.filter(d => String(d.id) !== String(doc?.id) && !(formData.draftFiles || []).some(id => String(id) === String(d.id))).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.file_name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!selectedDraftFile) return;
                        // Try to keep numeric IDs as numbers if possible, since Supabase often uses Int
                        const fileIdToAdd = isNaN(Number(selectedDraftFile)) ? selectedDraftFile : Number(selectedDraftFile);
                        
                        setFormData(prev => {
                          const currentDrafts = prev.draftFiles || [];
                          // Avoid duplicates
                          if (currentDrafts.some(id => String(id) === String(fileIdToAdd))) return prev;
                          return {
                            ...prev,
                            draftFiles: [...currentDrafts, fileIdToAdd]
                          };
                        });
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
                      const linkedDoc = allFolderFiles.find(d => String(d.id) === String(fileId));
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
                              <>
                                {(linkedDoc.webContentLink || linkedDoc.web_content_link) && (
                                  <a
                                    href={linkedDoc.webContentLink || linkedDoc.web_content_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-slate-800 rounded text-green-400 hover:text-green-300"
                                    title="Tải file về máy"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                )}
                                {(linkedDoc.webViewLink || linkedDoc.web_view_link) && (
                                  <a
                                    href={linkedDoc.webViewLink || linkedDoc.web_view_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-slate-800 rounded text-cyan-400 hover:text-cyan-300"
                                    title="Xem trên Drive"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </>
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
                        Chưa có file dự thảo nào.
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Nút hành động */}
                <div className="col-span-12 pt-4 mt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between gap-3 w-full">
                    {!isEditor ? (
                      <div className="text-xs text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Chế độ Người xem (Read-only). Cần quyền Chuyên viên để chỉnh sửa.</span>
                      </div>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleClose}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Đóng
                      </button>

                      {isEditor ? (
                        <button
                          onClick={() => setShowConfirm(true)}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          Lưu thông tin
                        </button>
                      ) : (
                        <button
                          onClick={() => openAuthModal('login')}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                          <Shield className="w-4 h-4" />
                          Đăng nhập để sửa
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Spacing for footer */}
              <div className="h-6"></div>
            </div>
            )}

            {/* TAB 2: MARKDOWN KNOWLEDGE BASE */}
            {activeTab === 'markdown' && (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-900">
                {/* Action Control Bar */}
                <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {markdownContent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã có .md ({Math.round(mdCharCount / 1024 * 10) / 10} KB)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Chưa tạo .md
                      </span>
                    )}

                    {/* Auto-detect badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-300 bg-slate-800/80 border border-slate-700/70 select-none" title="Hệ thống tự động phát hiện định dạng PDF để bóc tách tối ưu">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tự động nhận diện (Chữ / Scan)</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mode Switcher */}
                    {markdownContent && (
                      <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setMdViewMode('preview')}
                          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                            mdViewMode === 'preview' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Xem trước
                        </button>
                        <button
                          type="button"
                          onClick={() => setMdViewMode('raw')}
                          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                            mdViewMode === 'raw' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Mã thô
                        </button>
                      </div>
                    )}

                    {/* Generate / Re-generate Button */}
                    <button
                      type="button"
                      onClick={() => handleGenerateMd()}
                      disabled={isGeneratingMd}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
                    >
                      {isGeneratingMd ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang trích xuất...</span>
                        </>
                      ) : markdownContent ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Trích xuất lại .md</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Tạo .md tự động</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                {mdSuccessMsg && (
                  <div className="mx-4 mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{mdSuccessMsg}</span>
                  </div>
                )}
                {error && activeTab === 'markdown' && (
                  <div className="mx-4 mt-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 shrink-0">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Content Display Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-0">
                  {isGeneratingMd ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
                          <Sparkles className="w-8 h-8 text-cyan-400" />
                        </div>
                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin absolute -top-1 -right-1" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">Đang số hóa nội dung tài liệu...</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Hệ thống đang đọc dữ liệu từ Google Drive, bóc tách bảng biểu và cấu trúc thành văn bản Markdown chuẩn để lưu vào Supabase.
                        </p>
                      </div>
                    </div>
                  ) : markdownContent ? (
                    mdViewMode === 'preview' ? (
                      <div className="bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
                        <MarkdownPreview content={markdownContent} />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col">
                        <textarea
                          value={markdownContent}
                          onChange={(e) => setMarkdownContent(e.target.value)}
                          className="w-full h-full min-h-[400px] bg-slate-950 p-4 font-mono text-xs text-slate-200 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                          placeholder="Nội dung Markdown..."
                        />
                      </div>
                    )
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                        <BookOpen className="w-7 h-7 text-cyan-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200">Chưa có nội dung số hóa (.md) cho văn bản này</h4>
                      <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
                        Nhấn nút <strong className="text-cyan-400">"⚡ Tạo .md tự động"</strong> để hệ thống trích xuất toàn bộ chữ, bảng biểu, điều khoản từ file và lưu trực tiếp vào Kho tri thức Supabase.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleGenerateMd(false)}
                        className="mt-5 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>⚡ Bắt đầu tạo nội dung .md ngay</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
    </div>,
    document.body
  );
}
