'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, FileText, Calendar, Building, Folder, Eye, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatDateVN } from '@/lib/formatters';

export default function DocumentPickerModal({
  isOpen,
  onClose,
  projectId,
  onSelectDocument,
  title = "Chọn Văn Bản Pháp Lý Liên Kết"
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('Tất cả');

  // Tải danh sách văn bản pháp lý của dự án
  const fetchDocs = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (query.trim()) params.append('q', query.trim());

      const res = await fetch(`/api/drive/search?${params.toString()}&t=${Date.now()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setDocuments(json.data);
      } else {
        // Fallback: Thử gọi không có projectId nếu chưa gắn folder với project_id
        if (projectId && (!json.data || json.data.length === 0)) {
          const fallbackRes = await fetch(`/api/drive/search?q=${encodeURIComponent(query.trim())}&t=${Date.now()}`);
          const fallbackJson = await fallbackRes.json();
          if (fallbackJson.success && fallbackJson.data) {
            setDocuments(fallbackJson.data);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách văn bản pháp lý:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      setSearchKeyword('');
      setFilterCategory('Tất cả');
      fetchDocs('');
    }
  }, [isOpen, fetchDocs]);

  // Debounce tìm kiếm khi gõ
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchDocs(searchKeyword);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchKeyword, isOpen, fetchDocs]);

  // Lọc theo loại văn bản trên client
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (filterCategory !== 'Tất cả') {
        const loai = doc.loai_vb || doc.category || '';
        if (loai !== filterCategory) return false;
      }
      return true;
    });
  }, [documents, filterCategory]);

  // Danh sách các loại văn bản độc nhất
  const categories = useMemo(() => {
    const set = new Set();
    documents.forEach(d => {
      const loai = d.loai_vb || d.category;
      if (loai) set.add(loai);
    });
    return Array.from(set);
  }, [documents]);

  // Xem trước văn bản
  const handlePreview = async (e, doc) => {
    e.stopPropagation();
    try {
      if (doc.webViewLink) {
        window.open(doc.webViewLink, '_blank');
        return;
      }
      const filePath = doc.path || doc.file_name || doc.name;
      const res = await fetch('/api/documents/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Không thể mở văn bản này.');
      }
    } catch (err) {
      alert('Lỗi khi mở văn bản: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-400">
                Tìm kiếm và liên kết trực tiếp với hồ sơ tài liệu từ tab Pháp lý / Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="Nhập số hiệu (VD: 3779, 235), trích yếu, cơ quan ban hành..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              autoFocus
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="Tất cả">Tất cả loại văn bản</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={() => fetchDocs(searchKeyword)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors shrink-0"
            title="Làm mới danh sách"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>

          <span className="text-xs text-slate-400 shrink-0">
            Tìm thấy <b>{filteredDocs.length}</b> văn bản
          </span>
        </div>

        {/* Danh sách Văn bản Pháp lý */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[250px]">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={20} className="animate-spin text-emerald-400" />
              <span>Đang tải danh mục hồ sơ pháp lý của dự án...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <p>Không tìm thấy văn bản nào phù hợp với từ khóa "<b>{searchKeyword}</b>".</p>
              <p className="text-[11px] text-slate-600">
                Mẹo: Bạn có thể thử tìm bằng một phần số hiệu, tên viết tắt cơ quan (UBND, BQLĐSĐT, Tam Kiệt...) hoặc xóa ô tìm kiếm để duyệt tất cả.
              </p>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc.id || doc.file_id || doc.path}
                className="bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl p-3 flex items-start justify-between gap-3 transition-all cursor-pointer group shadow-sm"
                onClick={() => {
                  onSelectDocument({
                    path: doc.path || doc.file_name || doc.name,
                    document_number: doc.so_vb || doc.document_number,
                    number: doc.so_vb || doc.document_number,
                    title: doc.trich_yeu || doc.title || doc.name,
                    date: doc.ngay_phat_hanh || doc.date,
                    issuing_agency: doc.noi_phat_hanh || doc.issuing_agency,
                    ...doc
                  });
                  onClose();
                }}
              >
                <div className="flex-1 min-w-0">
                  {/* Dòng Header thẻ */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold rounded text-[11px]">
                      {doc.so_vb || doc.document_number || 'Chưa có số hiệu'}
                    </span>

                    {doc.loai_vb && (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                        {doc.loai_vb}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar size={11} className="text-slate-500" />
                      {formatDateVN(doc.ngay_phat_hanh || doc.date)}
                    </span>

                    {doc.noi_phat_hanh && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Building size={11} className="text-slate-500" />
                        {doc.noi_phat_hanh}
                      </span>
                    )}
                  </div>

                  {/* Trích yếu nội dung */}
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {doc.trich_yeu || doc.title || doc.name}
                  </h4>

                  {/* Vị trí thư mục & Tên file gốc */}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono truncate">
                    {doc.folder_name && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Folder size={10} className="text-amber-500" />
                        {doc.folder_name}
                      </span>
                    )}
                    <span className="truncate text-slate-500">
                      • {doc.file_name || doc.name}
                    </span>
                  </div>
                </div>

                {/* Các nút hành động */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, doc)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors border border-slate-700"
                    title="Xem trước văn bản"
                  >
                    <Eye size={13} />
                  </button>

                  <button
                    type="button"
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-emerald-500/30 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Chọn
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
