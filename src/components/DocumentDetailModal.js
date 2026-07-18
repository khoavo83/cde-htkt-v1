import { useState } from 'react';
import { X, Calendar, User, Tag, Folder, FileText, Link2, Trash2, Edit3, ExternalLink, Plus, CheckCircle, Info } from 'lucide-react';

export default function DocumentDetailModal({ 
  document: doc, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  allPlots = [], 
  onUpdatePlots 
}) {
  const [selectedPlotToAdd, setSelectedPlotToAdd] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  if (!isOpen || !doc) return null;

  // Lọc ra các thửa đất chưa liên kết với tài liệu này
  const linkedPlots = doc.plots || [];
  const unlinkedPlots = allPlots.filter(plot => !linkedPlots.includes(plot.code));

  // Định nghĩa màu sắc cho các trạng thái hiệu lực
  const statusConfig = {
    effective: { text: "Có hiệu lực", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    pending: { text: "Đang xử lý", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    expired: { text: "Hết hiệu lực", bg: "bg-red-500/10 text-red-400 border-red-500/20" },
    draft: { text: "Dự thảo", bg: "bg-slate-800 text-slate-400 border-slate-700" }
  };

  const currentStatus = statusConfig[doc.status] || statusConfig.effective;

  // Xử lý thêm liên kết thửa đất
  const handleAddLink = () => {
    if (!selectedPlotToAdd) return;
    setIsLinking(true);
    const updatedPlots = [...linkedPlots, selectedPlotToAdd];
    onUpdatePlots(doc.id, updatedPlots).then(() => {
      setSelectedPlotToAdd('');
      setIsLinking(false);
    }).catch(() => setIsLinking(false));
  };

  // Xử lý gỡ liên kết thửa đất
  const handleRemoveLink = (plotCode) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ liên kết giữa văn bản này và thửa đất ${plotCode}?`)) return;
    const updatedPlots = linkedPlots.filter(code => code !== plotCode);
    onUpdatePlots(doc.id, updatedPlots);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-0.5">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border tracking-wider mb-2 ${currentStatus.bg}`}>
                {currentStatus.text}
              </span>
              <h2 className="text-sm font-bold text-slate-100 leading-snug" title={doc.name}>
                {doc.name}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="font-semibold text-slate-300">Danh mục:</span> {doc.category}
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-slate-300">Thư mục:</span> {doc.folder}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Left Column: Metadata (3/5) */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Info className="w-4 h-4 text-emerald-400" />
                Thông tin văn bản
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 block">Số hiệu văn bản</span>
                  <span className="text-xs font-semibold text-slate-200 bg-slate-950/60 border border-slate-850 px-2 py-1.5 rounded-lg block mt-1">
                    {doc.documentNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Ngày ban hành</span>
                  <span className="text-xs font-semibold text-slate-200 bg-slate-950/60 border border-slate-850 px-2 py-1.5 rounded-lg block mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {doc.issuedDate}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">Cơ quan ban hành</span>
                <span className="text-xs font-semibold text-slate-200 bg-slate-950/60 border border-slate-850 px-2.5 py-2 rounded-lg block mt-1">
                  {doc.issuer}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">Trích yếu / Nội dung chính</span>
                <p className="text-xs text-slate-300 bg-slate-950/60 border border-slate-850 p-3 rounded-lg block mt-1 leading-relaxed whitespace-pre-line">
                  {doc.notes || "Không có trích yếu chi tiết cho văn bản này."}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <span>Dung lượng: <strong className="text-slate-200">{doc.size || "1.5 MB"}</strong></span>
                <span>Cập nhật lần cuối: <strong className="text-slate-200">{new Date(doc.updatedAt).toLocaleString('vi-VN')}</strong></span>
              </div>
            </div>

            {/* Right Column: Linked Plots (2/5) */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Link2 className="w-4 h-4 text-emerald-400" />
                Thửa đất liên kết ({linkedPlots.length})
              </h3>

              {/* Add Link Form */}
              <div className="flex gap-2">
                <select
                  value={selectedPlotToAdd}
                  onChange={(e) => setSelectedPlotToAdd(e.target.value)}
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl text-xs px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Chọn thửa đất --</option>
                  {unlinkedPlots.map(plot => (
                    <option key={plot.id} value={plot.code}>
                      {plot.code} ({plot.owner})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddLink}
                  disabled={!selectedPlotToAdd || isLinking}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Gán
                </button>
              </div>

              {/* Linked Plots List */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {linkedPlots.map((plotCode) => {
                  const plotInfo = allPlots.find(p => p.code === plotCode);
                  return (
                    <div 
                      key={plotCode}
                      className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl group hover:border-slate-700/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          {plotCode}
                        </span>
                        {plotInfo && (
                          <div className="text-[10px] text-slate-300 mt-1 truncate font-medium">
                            {plotInfo.owner}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleRemoveLink(plotCode)}
                          className="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300"
                          title="Gỡ liên kết"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {linkedPlots.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs leading-normal">
                    Chưa có thửa đất nào được liên kết với văn bản này.
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center gap-3">
          {/* Left Actions: Delete */}
          <button
            onClick={() => {
              if (confirm("Bạn có chắc chắn muốn xóa văn bản này khỏi dự án? Hành động này sẽ gỡ toàn bộ liên kết với các thửa đất liên quan.")) {
                onDelete(doc.id);
              }
            }}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/30 border border-red-900/30 hover:border-red-800/40 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Xóa văn bản
          </button>

          {/* Right Actions: Edit & View Drive */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(doc)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Edit3 className="w-4 h-4 text-cyan-400" />
              Sửa thông tin
            </button>
            
            <a
              href={doc.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/10"
            >
              <ExternalLink className="w-4 h-4" />
              Mở trên Google Drive
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
