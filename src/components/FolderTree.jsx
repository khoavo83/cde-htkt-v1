'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, FolderOpen, File, HardDrive, RefreshCw,
  ChevronRight, ChevronDown, Search, ExternalLink,
  Pencil, Check, X, RotateCcw, CheckCircle2, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentAnalyzeModal from './DocumentAnalyzeModal';

// =========================================================
// TreeNode — chỉ render Folder
// =========================================================
const TreeNode = ({ node, level = 0, defaultOpen = false, selectedFolderId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!node.isFolder) return null;

  const folderChildren = node.children ? node.children.filter(c => c.isFolder) : [];
  const isExpandable   = folderChildren.length > 0;
  const isSelected     = selectedFolderId === node.id;

  const handleToggle = (e) => { e.stopPropagation(); if (isExpandable) setIsOpen(!isOpen); };
  const handleSelect = (e) => { e.stopPropagation(); onSelect(node); if (isExpandable && !isOpen) setIsOpen(true); };

  return (
    <div className="w-full">
      <div
        className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors
          ${isSelected ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                       : 'hover:bg-white/5 dark:hover:bg-slate-800/50'}
          ${level === 0 ? 'mt-1' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <span className="w-5 flex items-center justify-center mr-1 text-slate-500" onClick={handleToggle}>
          {isExpandable ? (isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>) : <span className="w-4"/>}
        </span>
        <span className="mr-2">
          {isOpen
            ? <FolderOpen size={16} className={isSelected ? 'text-emerald-500' : 'text-blue-400'}/>
            : <Folder    size={16} className={isSelected ? 'text-emerald-500' : 'text-blue-400'}/>}
        </span>
        <span className={`text-sm truncate ${isSelected ? 'font-semibold' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
          {node.name}
        </span>
      </div>

      <AnimatePresence>
        {isOpen && isExpandable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}    transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {folderChildren.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1}
                selectedFolderId={selectedFolderId} onSelect={onSelect}/>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================
// Badge màu loại văn bản
// =========================================================
const VBBadge = ({ type }) => {
  const map = {
    'Quyết định': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    'Công văn':   'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-400',
    'Tờ trình':   'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-400',
    'Báo cáo':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    'Thông báo':  'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-400',
    'Biên bản':   'bg-pink-100   text-pink-700   dark:bg-pink-900/40   dark:text-pink-400',
    'Hợp đồng':   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${map[type] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
      {type || '—'}
    </span>
  );
};

const SkeletonCell = ({ w = 'w-20' }) => (
  <div className={`h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${w}`}/>
);

// =========================================================
// Ô có thể chỉnh sửa
// =========================================================
const EditableCell = ({ value, onSave, multiline = false, className = '' }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value || '');

  const handleSave = () => { onSave(draft); setEditing(false); };
  const handleCancel = () => { setDraft(value || ''); setEditing(false); };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        {multiline
          ? <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
              className="text-xs w-full border border-emerald-400 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none resize-none"/>
          : <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
              className="text-xs w-full border border-emerald-400 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"/>
        }
        <div className="flex gap-1">
          <button onClick={handleSave}   className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"><Check size={11}/></button>
          <button onClick={handleCancel} className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300"><X size={11}/></button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group/cell relative cursor-pointer rounded px-1 -mx-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors ${className}`}
      onClick={() => setEditing(true)}
      title="Nhấp để sửa"
    >
      <span>{value || '—'}</span>
      <Pencil size={10} className="absolute top-0.5 right-0.5 opacity-0 group-hover/cell:opacity-50 text-emerald-500 transition-opacity"/>
    </div>
  );
};

// =========================================================
// Hàng dữ liệu có edit + re-extract
// =========================================================
const DocRow = ({ file, idx, onUpdate, onAnalyze }) => {
  const [saving, setSaving]   = useState(false);
  const [reloading, setReloading] = useState(false);
  const [saved, setSaved]     = useState(false);

  const FIELDS = ['loai_vb','so_vb','ngay_phat_hanh','noi_phat_hanh','trich_yeu','noi_gui'];

  const handleSaveField = async (field, newValue) => {
    const updated = { ...file, [field]: newValue };
    onUpdate(file.id, updated);
    setSaving(true);
    try {
      await fetch('/api/drive/extract', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId:      file.id,
          fileName:    file.file_name || file.name,
          webViewLink: file.web_view_link || file.webViewLink,
          ...FIELDS.reduce((acc, f) => ({ ...acc, [f]: updated[f] || '' }), {}),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* nếu lỗi vẫn giữ giá trị local */ }
    finally { setSaving(false); }
  };

  const handleReExtract = async () => {
    setReloading(true);
    onUpdate(file.id, { ...file, _loading: true });
    try {
      const p = new URLSearchParams({
        fileId:      file.id,
        fileName:    file.file_name || file.name,
        mimeType:    file.mimeType || 'application/pdf',
        webViewLink: file.web_view_link || file.webViewLink || '',
        refresh:     'true',
      });
      const res  = await fetch(`/api/drive/extract?${p}`);
      const json = await res.json();
      onUpdate(file.id, { ...file, ...(json.success ? json.data : {}), _loading: false });
    } catch { onUpdate(file.id, { ...file, _loading: false }); }
    finally { setReloading(false); }
  };

  if (file._loading) {
    return (
      <tr className="border-b border-slate-100 dark:border-slate-800/80">
        <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
        {[...Array(6)].map((_,i) => <td key={i} className="px-3 py-2.5"><SkeletonCell/></td>)}
        <td className="px-3 py-2.5"><SkeletonCell w="w-full"/></td>
        <td className="px-3 py-2.5"/>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors group">
      {/* # */}
      <td className="px-3 py-2.5 text-slate-400 text-xs w-8">
        <div className="flex flex-col items-center gap-1">
          <span>{idx + 1}</span>
          {file.manually_edited && <CheckCircle2 size={10} className="text-emerald-500" title="Đã chỉnh sửa thủ công"/>}
        </div>
      </td>

      {/* Loại VB */}
      <td className="px-3 py-2.5">
        <EditableCell value={file.loai_vb} onSave={v => handleSaveField('loai_vb', v)}
          className="inline-block"/>
      </td>

      {/* Số VB */}
      <td className="px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
        <EditableCell value={file.so_vb} onSave={v => handleSaveField('so_vb', v)}/>
      </td>

      {/* Ngày PH */}
      <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
        <EditableCell value={file.ngay_phat_hanh} onSave={v => handleSaveField('ngay_phat_hanh', v)}/>
      </td>

      {/* Nơi phát hành */}
      <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 max-w-[140px]">
        <EditableCell value={file.noi_phat_hanh} onSave={v => handleSaveField('noi_phat_hanh', v)}/>
      </td>

      {/* Trích yếu */}
      <td className="px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 max-w-xs">
        <EditableCell value={file.trich_yeu} onSave={v => handleSaveField('trich_yeu', v)} multiline/>
      </td>

      {/* Nơi gửi */}
      <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 max-w-[140px]">
        <EditableCell value={file.noi_gui} onSave={v => handleSaveField('noi_gui', v)}/>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 justify-center">
          {/* Phân tích lại bằng AI Gemini */}
          <button
            onClick={onAnalyze}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm shadow-amber-500/20"
            title="Phân tích lại bằng AI Gemini"
          >
            <Brain size={13} className="drop-shadow-md" />
          </button>

          {/* Mở file */}
          {(file.webViewLink || file.web_view_link) && (
            <a
              href={file.webViewLink || file.web_view_link}
              target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
              title="Mở văn bản trên Drive"
            >
              <ExternalLink size={12}/>
            </a>
          )}
        </div>

        {saved && (
          <div className="text-xs text-emerald-500 text-center mt-1 whitespace-nowrap">✓ Đã lưu</div>
        )}
      </td>
    </tr>
  );
};

// =========================================================
// Main Component
// =========================================================
export default function FolderTree({ projectId }) {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [error, setError]       = useState(null);
  const [rootPath, setRootPath] = useState('H:/My Drive/Bồi thường BT-CG');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  
  const [analyzingDoc, setAnalyzingDoc] = useState(null);
  const [folderFiles, setFolderFiles]       = useState([]);
  const [loadingFiles, setLoadingFiles]     = useState(false);
  const [search, setSearch]     = useState('');

  const [selectedFolder, setSelectedFolder] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const url  = projectId ? `/api/drive/tree?projectId=${projectId}` : '/api/drive/tree';
      const json = await fetch(url).then(r => r.json());
      if (json.data) setData(json.data);
      else if (json.message) setError(json.message);
    } catch { setError('Lỗi kết nối server'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { loadData(); setSelectedFolder(null); setFolderFiles([]); }, [projectId]);

  const handleSync = async () => {
    setSyncing(true); setError(null);
    try {
      const url  = projectId ? `/api/drive/sync?projectId=${projectId}` : '/api/drive/sync';
      const json = await fetch(url, { method: 'POST' }).then(r => r.json());
      if (json.success) await loadData();
      else setError(json.error || 'Đồng bộ thất bại');
    } catch { setError('Lỗi khi đồng bộ'); }
    finally  { setSyncing(false); }
  };

  // Cập nhật 1 dòng trong bảng
  const updateRow = useCallback((fileId, updatedData) => {
    setFolderFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updatedData } : f));
  }, []);

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
    setLoadingFiles(true);
    setFolderFiles([]);

    fetch(`/api/drive/files?folderId=${folder.id}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data) return;

        // Chỉ xử lý file PDF
        const pdfFiles = json.data.filter(f => f.mimeType === 'application/pdf');
        const rows = pdfFiles.map(f => ({ ...f, _loading: true }));
        setFolderFiles(rows);

        // Extract theo batch 3
        const extractBatch = async () => {
          const SIZE = 3;
          for (let i = 0; i < pdfFiles.length; i += SIZE) {
            await Promise.all(pdfFiles.slice(i, i + SIZE).map(async file => {
              try {
                const p = new URLSearchParams({
                  fileId:      file.id,
                  fileName:    file.name,
                  mimeType:    file.mimeType,
                  webViewLink: file.webViewLink || '',
                });
                const resp = await fetch(`/api/drive/extract?${p}`).then(r => r.json());
                setFolderFiles(prev => prev.map(f =>
                  f.id === file.id
                    ? { ...f, ...(resp.success ? resp.data : {}), _loading: false }
                    : f
                ));
              } catch {
                setFolderFiles(prev => prev.map(f =>
                  f.id === file.id ? { ...f, _loading: false } : f
                ));
              }
            }));
          }
        };
        extractBatch();
      })
      .finally(() => setLoadingFiles(false));
  };

  const flattenFolders = (nodes, query) => {
    const result = []; const lq = query.toLowerCase();
    const traverse = list => {
      for (const n of list) {
        if (n.isFolder && n.name.toLowerCase().includes(lq)) result.push(n);
        if (n.children) traverse(n.children);
      }
    };
    traverse(nodes); return result;
  };

  const displayData = search ? flattenFolders(data, search) : data.filter(n => n.isFolder);
  const anyLoading  = folderFiles.some(f => f._loading);
  const pdfCount    = folderFiles.length;

  return (
    <div className="flex flex-col h-full rounded-xl bg-transparent backdrop-blur-md border border-transparent dark:border-slate-800 overflow-hidden">

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
          <HardDrive size={20}/>
          <span>Quản lý Tài liệu Google Drive</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Tìm kiếm thư mục..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"/>
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''}/>
            <span className="hidden sm:inline">{syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm shrink-0">
          <span className="font-semibold mr-2">Lỗi:</span>{error}
        </div>
      )}

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Cây thư mục */}
        <div className="w-1/3 min-w-[180px] border-r border-slate-200/50 dark:border-slate-800/50 overflow-y-auto p-2 shrink-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <RefreshCw size={22} className="animate-spin text-emerald-500"/>
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : displayData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Folder size={44} className="opacity-20"/>
              <p className="text-sm text-center">{search ? 'Không tìm thấy thư mục.' : 'Chưa có dữ liệu.\nBấm Đồng bộ.'}</p>
            </div>
          ) : (
            <div className="p-1">
              {displayData.map(node => (
                <TreeNode key={node.id} node={node} defaultOpen={false}
                  selectedFolderId={selectedFolder?.id} onSelect={handleSelectFolder}/>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Bảng văn bản */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {!selectedFolder ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <Folder size={64} className="opacity-10"/>
              <p className="text-sm">Chọn một thư mục bên trái để xem danh sách văn bản</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-emerald-500"/>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">{selectedFolder.name}</span>
                  {pdfCount > 0 && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                      {pdfCount} PDF
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {anyLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <RefreshCw size={11} className="animate-spin"/>
                      <span>AI đang phân tích...</span>
                    </div>
                  )}
                  <span className="text-xs text-slate-400 hidden sm:inline">Nhấp vào ô để sửa • 🔄 Phân tích lại</span>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {loadingFiles ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <RefreshCw size={24} className="animate-spin text-emerald-500"/>
                    <p className="text-sm">Đang tải danh sách file...</p>
                  </div>
                ) : folderFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <File size={40} className="opacity-20"/>
                    <p className="text-sm">Không có file PDF trong thư mục này</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur z-10">
                        {['#','Loại VB','Số VB','Ngày PH','Nơi phát hành','Trích yếu nội dung','Nơi gửi','Thao tác'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {folderFiles.map((file, idx) => (
                        <DocRow key={file.id} file={file} idx={idx} onUpdate={updateRow} onAnalyze={() => setAnalyzingDoc(file)} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {analyzingDoc && (
        <DocumentAnalyzeModal 
          document={analyzingDoc} 
          isOpen={!!analyzingDoc} 
          onClose={() => setAnalyzingDoc(null)} 
          onSave={(updatedDoc) => {
            // Update the local list
            setFiles(prev => prev.map(f => f.id === updatedDoc.id ? updatedDoc : f));
            setAnalyzingDoc(null);
          }} 
        />
      )}
    </div>
  );
}
