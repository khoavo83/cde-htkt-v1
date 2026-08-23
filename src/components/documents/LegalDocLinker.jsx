'use client';

import { useState } from 'react';
import { FileText, FolderOpen, Eye, X, ExternalLink } from 'lucide-react';
import DocumentPickerModal from './DocumentPickerModal';

export default function LegalDocLinker({
  documentPath = '',
  documentNumber = '',
  onDocumentChange,
  projectId,
  label = "Văn bản pháp lý đính kèm",
  placeholder = "Chọn hoặc nhập đường dẫn file từ Google Drive..."
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Mở xem văn bản
  const handleView = async () => {
    if (!documentPath) return;
    try {
      const res = await fetch('/api/documents/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: documentPath })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Không thể mở file này.');
      }
    } catch (e) {
      alert('Lỗi kết nối khi mở file: ' + e.message);
    }
  };

  const handleSelect = (doc) => {
    const chosenPath = doc.path || doc.filePath || doc.name || '';
    const chosenNum = doc.document_number || doc.number || '';
    if (onDocumentChange) {
      onDocumentChange(chosenPath, chosenNum, doc);
    }
  };

  const handleClear = () => {
    if (onDocumentChange) {
      onDocumentChange('', '', null);
    }
  };

  return (
    <div>
      <label className="text-[11px] font-bold text-slate-300 block mb-1">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={documentPath}
            onChange={e => onDocumentChange && onDocumentChange(e.target.value, documentNumber, null)}
            placeholder={placeholder}
            className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          {documentPath && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              title="Xóa liên kết"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Nút Chọn từ tab Pháp lý */}
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-all shrink-0 shadow-sm"
          title="Chọn từ danh mục Pháp lý"
        >
          <FolderOpen size={13} className="text-emerald-400" /> Chọn từ Pháp lý
        </button>

        {/* Nút Xem văn bản */}
        {documentPath && (
          <button
            type="button"
            onClick={handleView}
            className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all shrink-0"
            title="Mở xem văn bản trực tiếp"
          >
            <Eye size={14} />
          </button>
        )}
      </div>

      {isPickerOpen && (
        <DocumentPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          projectId={projectId}
          onSelectDocument={handleSelect}
        />
      )}
    </div>
  );
}
