'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, FolderOpen, File, HardDrive, RefreshCw, Network,
  ChevronRight, ChevronLeft, ChevronDown, Search, ExternalLink,
  Pencil, Check, X, RotateCcw, CheckCircle2, Sparkles, ScanSearch, GripVertical, FileText, ArrowUpRight, ArrowDownRight, Link2, Download, ScanEye, CornerDownRight, Unlink2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
              className="text-sm w-full border border-emerald-400 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none resize-none"/>
          : <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
              className="text-sm w-full border border-emerald-400 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"/>
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


const parseDateString = (dateStr) => {
  if (!dateStr || dateStr === 'Chưa xác định') return 0;
  const parts = dateStr.split('/');
  if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
  return 0;
};

// =========================================================
// Hàng dữ liệu có edit + re-extract
// =========================================================
const DocRow = ({ file, idx, onUpdate, onAnalyze, onAttachClick, provided, snapshot, agencies }) => {
  const isDraggingClass = snapshot?.isDragging ? 'bg-emerald-50 dark:bg-emerald-900/30 shadow-lg' : '';

  const getAbbreviation = (fullName) => {
    if (!fullName || !agencies) return fullName;
    const agency = agencies.find(a => a.name === fullName);
    return agency?.abbreviation || fullName;
  };

  if (file._loading) {
    return (
      <tr 
        ref={provided?.innerRef} 
        {...provided?.draggableProps}
        className="border-b border-slate-100 dark:border-slate-800/80"
      >
        <td className="px-3 py-2.5 text-slate-400 text-sm w-12">
          <div className="flex items-center gap-2">
            {provided && (
              <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                <GripVertical size={14}/>
              </div>
            )}
            <span>{idx + 1}</span>
          </div>
        </td>
        {[...Array(5)].map((_,i) => <td key={i} className="px-3 py-2.5"><SkeletonCell/></td>)}
        <td className="px-3 py-2.5"/>
      </tr>
    );
  }

  const cellClass = "px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 cursor-pointer max-w-[150px] truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors";
  const notesClass = "px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 cursor-pointer max-w-xs hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors";

  return (
    <tr 
      ref={provided?.innerRef} 
      {...provided?.draggableProps}
      className={`border-b border-slate-100 dark:border-slate-800/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors group ${isDraggingClass}`}
    >
      <td className="px-3 py-2.5 text-slate-400 text-sm w-12">
        <div className="flex items-center gap-2">
          {provided && (
            <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
              <GripVertical size={14}/>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span 
              className={`font-medium ${file.manually_edited ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
              title={file.manually_edited ? 'Đã chỉnh sửa thủ công' : ''}
            >
              {idx + 1}
            </span>
            <div className="flex gap-1 mt-0.5">
              {file.mimeType === 'application/pdf' && (
                file.is_outgoing ? (
                  <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-700" title="Văn bản đi"><ArrowUpRight size={10} strokeWidth={3}/></div>
                ) : (
                  <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700" title="Văn bản đến"><ArrowDownRight size={10} strokeWidth={3}/></div>
                )
              )}
            </div>
          </div>
        </div>
      </td>

      <td className={cellClass} onClick={onAnalyze}>
        <div className="flex items-center gap-1">
          {file.mimeType && file.mimeType.includes('word') ? (
            <FileText size={14} className="text-blue-500" title="File Word dự thảo"/>
          ) : (
            <File size={14} className="text-red-500" title="File PDF chính"/>
          )}
          {file.loai_vb || '—'}
        </div>
      </td>
      <td className={cellClass + " font-mono min-w-[120px] whitespace-normal break-words"} onClick={onAnalyze}>
        {file.so_vb || '—'}
      </td>
      <td className={cellClass} onClick={onAnalyze}>{file.ngay_phat_hanh || '—'}</td>
      <td className={cellClass} onClick={onAnalyze} title={file.noi_phat_hanh}>{getAbbreviation(file.noi_phat_hanh) || '—'}</td>
      <td className={notesClass} onClick={onAnalyze}>
        <div className="line-clamp-2" title={file.trich_yeu || file.name || file.file_name}>{file.trich_yeu || file.name || file.file_name}</div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 justify-center">
          {file.mimeType && file.mimeType.includes('word') ? (
            <button
              onClick={() => onAttachClick && onAttachClick(file)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500 hover:text-white transition-all shadow-sm shadow-cyan-500/20"
              title="Gắn vào file PDF"
            >
              <Link2 size={13} className="drop-shadow-md" />
            </button>
          ) : (
            <button
              onClick={onAnalyze}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm shadow-amber-500/20"
              title="Sửa / Phân tích chi tiết"
            >
              <Pencil size={13} className="drop-shadow-md" />
            </button>
          )}
          
          <button
            onClick={() => alert('Tính năng quét OCR đang được phát triển làm phương án dự phòng.')}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all shadow-sm shadow-indigo-500/20"
            title="Quét bằng OCR (Dự phòng)"
          >
            <ScanSearch size={13} className="drop-shadow-md" />
          </button>

          {(file.webViewLink || file.web_view_link) && (
            <button
              onClick={onAnalyze}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm shadow-emerald-500/20"
              title="Xem trước tài liệu"
            >
              <ScanEye size={13} className="drop-shadow-md"/>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// =========================================================
// ChildRow: Hiển thị file đính kèm (Word dự thảo) thụt lề dưới file PDF cha
// =========================================================
const ChildRow = ({ file, onDetach }) => {
  const isWord = file.mimeType && file.mimeType.includes('word');
  return (
    <tr className="border-b border-slate-100/60 dark:border-slate-800/50 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/10 transition-colors">
      {/* # column */}
      <td className="pl-8 pr-3 py-2 text-slate-300 dark:text-slate-600 text-xs w-12">
        <CornerDownRight size={12} className="text-cyan-400/70" />
      </td>

      {/* Loại VB */}
      <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500" colSpan={1}>
        <div className="flex items-center gap-1">
          {isWord ? (
            <FileText size={12} className="text-blue-400" title="File Word dự thảo" />
          ) : (
            <File size={12} className="text-slate-400" />
          )}
          <span className="italic text-slate-400 dark:text-slate-500">Dự thảo</span>
        </div>
      </td>

      {/* Số VB - trống */}
      <td className="px-3 py-2" />

      {/* Ngày PH - trống */}
      <td className="px-3 py-2" />

      {/* Nơi PH - trống */}
      <td className="px-3 py-2" />

      {/* Tên file */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <a
            href={(file.webViewLink || file.web_view_link) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline truncate max-w-[250px]"
            title={file.name || file.file_name}
          >
            {file.name || file.file_name || '(không có tên)'}
          </a>
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 justify-center">
          {onDetach && (
            <button
              onClick={() => onDetach(file)}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              title="Gỡ đính kèm"
            >
              <Unlink2 size={11} />
            </button>
          )}
          {(file.webViewLink || file.web_view_link) && (
            <a
              href={file.webViewLink || file.web_view_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
              title="Mở file"
            >
              <ScanEye size={11} />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
};

// =========================================================
// Main Component
// =========================================================
export default function FolderTree({ projectId, allDocuments = [] }) {
  const [data, setData]         = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [totalPdfCount, setTotalPdfCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError]       = useState(null);
  const [rootPath, setRootPath] = useState('H:/My Drive/Bồi thường BT-CG');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  
  const [analyzingDoc, setAnalyzingDoc] = useState(null);
  const [folderFiles, setFolderFiles]       = useState([]);
  const [loadingFiles, setLoadingFiles]     = useState(false);
  const [currentPage, setCurrentPage]       = useState(1);
  const [itemsPerPage, setItemsPerPage]     = useState(20);
  const [search, setSearch]     = useState('');
  const [docCategory, setDocCategory] = useState('Tất cả');
  const [searchNgayPhatHanh, setSearchNgayPhatHanh] = useState('');
  const [searchNoiPhatHanh, setSearchNoiPhatHanh] = useState('');
  
  // States for Global Search via Supabase
  const [isSearching, setIsSearching] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const url  = projectId ? `/api/drive/tree?projectId=${projectId}` : '/api/drive/tree';
      const json = await fetch(url).then(r => r.json());
      if (json.data) {
        setData(json.data);
        if (json.totalPdfCount !== undefined) setTotalPdfCount(json.totalPdfCount);
      }
      else if (json.message) setError(json.message);

      try {
        const agenciesRes = await fetch('/api/settings/agencies').then(r => r.json());
        if (agenciesRes.success) setAgencies(agenciesRes.data);
      } catch(e) { console.error('Lỗi tải nơi phát hành', e); }

    } catch { setError('Lỗi kết nối server'); }
    finally  { setLoading(false); }
  };

  const [attachingFile, setAttachingFile] = useState(null);
  const [attachTargetId, setAttachTargetId] = useState('');
  const [attachSearchTerm, setAttachSearchTerm] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);

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

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setError(null);
      
      // Lấy danh sách ID của thư mục hiện tại và tất cả thư mục con
      let folderIds = [];
      if (selectedFolder) {
        const findNode = (nodes, id) => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findNode(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const getAllIds = (node) => {
          let ids = [node.id];
          if (node.children) {
            for (const child of node.children) {
              ids = ids.concat(getAllIds(child));
            }
          }
          return ids;
        };

        const selectedNode = findNode(data, selectedFolder.id);
        if (selectedNode) {
          folderIds = getAllIds(selectedNode);
        } else {
          folderIds = [selectedFolder.id]; // Fallback
        }
      }

      const queryParams = new URLSearchParams({
        folderIds: folderIds.join(','),
        folderName: selectedFolder ? selectedFolder.name : rootPath,
        q: search,
        category: docCategory !== 'Tất cả' ? docCategory : '',
        ngayPhatHanh: searchNgayPhatHanh,
        noiPhatHanh: searchNoiPhatHanh
      });

      const response = await fetch(`/api/documents/export?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Lỗi khi xuất file Excel');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_Sach_Van_Ban_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  // Cập nhật 1 dòng trong bảng
  const updateRow = useCallback((fileId, updatedData) => {
    setFolderFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updatedData } : f));
  }, []);

  // Gỡ đính kèm file con khỏi file cha (xóa parent_id trong DB)
  const handleDetach = async (childFile) => {
    if (!confirm(`Xác nhận gỡ đính kèm file "${childFile.name || childFile.file_name}" khỏi văn bản cha?`)) return;
    try {
      await fetch('/api/drive/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detach', child_id: childFile.id }),
      });
      // Cập nhật local state: xóa parent_id của file con
      setFolderFiles(prev => prev.map(f => f.id === childFile.id ? { ...f, parent_id: null } : f));
    } catch (err) {
      alert('Lỗi khi gỡ đính kèm: ' + err.message);
    }
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
    setLoadingFiles(true);
    setFolderFiles([]);
    setIsGlobalSearchActive(false);

    fetch(`/api/drive/files?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data) return;

        // Không lọc PDF nữa, lấy hết file do API trả về (đã lọc PDF và Word trong route)
        const allAllowedFiles = json.data;
        
        const rows = allAllowedFiles.map(f => {
          const fileName = f.name || f.file_name || '';
          let parsedNgay = f.ngay_phat_hanh;
          let parsedSoVb = f.so_vb;
          let parsedTrichYeu = f.trich_yeu;

          const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
          const parts = nameWithoutExt.split('_');

          // Kiểm tra xem filename có đúng cấu trúc yyyy-mm-dd_x_y không
          if (parts.length >= 3 && /^(\d{4})-(\d{2})-(\d{2})$/.test(parts[0])) {
            const dateMatch = parts[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
            parsedNgay = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
            parsedTrichYeu = parts[parts.length - 1];
            parsedSoVb = parts.slice(1, parts.length - 1).join('/');
          }

          return { 
            ...f, 
            ngay_phat_hanh: parsedNgay || f.ngay_phat_hanh,
            so_vb: parsedSoVb || f.so_vb,
            trich_yeu: parsedTrichYeu || f.trich_yeu,
            _loading: false 
          };
        });

        // Sắp xếp ngày phát hành (nhỏ đến lớn) -> custom_order_index
        rows.sort((a, b) => {
          const timeA = parseDateString(a.ngay_phat_hanh);
          const timeB = parseDateString(b.ngay_phat_hanh);
          if (timeA !== timeB) return timeA - timeB;
          return (a.custom_order_index || 0) - (b.custom_order_index || 0);
        });
        setFolderFiles(rows);

      })
      .finally(() => setLoadingFiles(false));
  };


  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    if (isGlobalSearchActive || search || docCategory !== 'Tất cả') {
      alert("Không thể sắp xếp khi đang tìm kiếm hoặc lọc văn bản. Vui lòng xóa bộ lọc.");
      return;
    }

    const absoluteSourceIndex = (currentPage - 1) * itemsPerPage + result.source.index;
    const absoluteDestinationIndex = (currentPage - 1) * itemsPerPage + result.destination.index;
    if (absoluteSourceIndex === absoluteDestinationIndex) return;

    // Lấy danh sách các file đang được hiển thị ở cấp cao nhất (không phải file đính kèm)
    const topLevelFiles = folderFiles.filter(f => !f.parent_id);
    const draggedItem = topLevelFiles[absoluteSourceIndex];
    const targetItem = topLevelFiles[absoluteDestinationIndex];

    if (!draggedItem || !targetItem) return;

    // Ràng buộc không vượt quá ngày phát hành
    const draggedTime = parseDateString(draggedItem.ngay_phat_hanh);
    const targetTime = parseDateString(targetItem.ngay_phat_hanh);

    if (draggedTime !== targetTime) {
      // Bị kéo ra khỏi cụm ngày của nó, từ chối drop
      return; 
    }

    const newFiles = Array.from(folderFiles);
    // Tìm index thực sự trong folderFiles
    const realSourceIndex = newFiles.findIndex(f => f.id === draggedItem.id);
    const realDestIndex = newFiles.findIndex(f => f.id === targetItem.id);

    // Cập nhật lại mảng
    newFiles.splice(realSourceIndex, 1);
    newFiles.splice(realDestIndex, 0, draggedItem);

    // Tính toán lại custom_order_index cho các item có cùng ngày
    const sameDateItems = newFiles.filter(f => parseDateString(f.ngay_phat_hanh) === draggedTime && !f.parent_id);
    
    const updates = [];
    sameDateItems.forEach((f, idx) => {
      f.custom_order_index = idx;
      updates.push({ fileId: f.id, orderIndex: idx });
    });

    setFolderFiles(newFiles);

    // Gọi API update
    try {
      await fetch('/api/drive/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
    } catch (error) {
      console.error('Lỗi lưu thứ tự', error);
    }
  };

  const displayData = data.filter(n => n.isFolder);
  const anyLoading  = folderFiles.some(f => f._loading);
  const pdfCount    = folderFiles.length;

  const handleGlobalSearch = async () => {
    if (!search.trim() && docCategory === 'Tất cả' && !searchNgayPhatHanh.trim() && !searchNoiPhatHanh.trim()) {
      setIsGlobalSearchActive(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const url = `/api/drive/search?q=${encodeURIComponent(search)}&category=${encodeURIComponent(docCategory)}&ngayPhatHanh=${encodeURIComponent(searchNgayPhatHanh)}&noiPhatHanh=${encodeURIComponent(searchNoiPhatHanh)}`;
      const res = await fetch(url).then(r => r.json());
      
      if (res.success && res.data) {
        setGlobalSearchResults(res.data);
        setIsGlobalSearchActive(true);
        setSelectedFolder(null); // Bỏ chọn thư mục để hiện kết quả toàn cục
      } else {
        setError(res.error || 'Lỗi khi tìm kiếm');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ tìm kiếm');
    } finally {
      setIsSearching(false);
    }
  };

  const currentFilesToDisplay = isGlobalSearchActive ? globalSearchResults : (selectedFolder ? folderFiles : []);

  const filteredFiles = currentFilesToDisplay.filter(f => {
    if (f.parent_id) return false; // Không hiển thị file con (file đã được đính kèm)
    if (isGlobalSearchActive) return true; // Đã lọc ở backend
    const q = search.toLowerCase();
    const name = (f.name || f.file_name || '').toLowerCase();
    const trichYeu = (f.trich_yeu || '').toLowerCase();
    const soVb = (f.so_vb || '').toLowerCase();
    const matchSearch = name.includes(q) || trichYeu.includes(q) || soVb.includes(q);
    
    // So sánh linh hoạt loại VB hoặc category
    const docType = f.loai_vb || f.category || '';
    const matchCategory = docCategory === 'Tất cả' || docType === docCategory;
    
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage) || 1;
  const paginatedFiles = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, docCategory, searchNgayPhatHanh, searchNoiPhatHanh, selectedFolder]);

  return (
    <div className="flex flex-col h-full rounded-xl bg-transparent backdrop-blur-md border border-transparent dark:border-slate-800 overflow-hidden">

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Network size={20}/>
          <span>Cấu trúc dữ liệu</span>
          {totalPdfCount > 0 && (
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0 ml-1">
              {totalPdfCount} PDF
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-56 flex items-center shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Tìm kiếm văn bản..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
              className="w-full pl-9 pr-3 py-2 rounded-l-lg bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"/>
          </div>
          <input type="text" placeholder="Ngày phát hành" value={searchNgayPhatHanh}
            onChange={e => setSearchNgayPhatHanh(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
            className="w-full sm:w-28 px-3 py-2 bg-white/50 dark:bg-black/20 border-y border-r border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs shrink-0"/>
          <input type="text" placeholder="Nơi phát hành" value={searchNoiPhatHanh}
            onChange={e => setSearchNoiPhatHanh(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
            className="w-full sm:w-32 px-3 py-2 bg-white/50 dark:bg-black/20 border-y border-r border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs shrink-0"/>
          <select
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value)}
            className="px-2 py-2 bg-white/50 dark:bg-black/20 border-y border-r border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs text-slate-600 dark:text-slate-300 appearance-none cursor-pointer shrink-0"
          >
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Tất cả">Tất cả loại VB</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Quyết định">Quyết định</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Công văn">Công văn</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Tờ trình">Tờ trình</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Báo cáo">Báo cáo</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Thông báo">Thông báo</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Biên bản">Biên bản</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Hợp đồng">Hợp đồng</option>
          </select>
          <button onClick={handleGlobalSearch} disabled={isSearching}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg transition-colors disabled:opacity-50 text-xs font-medium whitespace-nowrap shrink-0">
            {isSearching ? <RefreshCw size={16} className="animate-spin"/> : <Search size={16}/>}
            <span className="hidden sm:inline">Tìm</span>
          </button>
          
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>
          
          <button onClick={handleExportExcel} disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap">
            <Download size={16} className={exporting ? 'animate-bounce' : ''}/>
            <span className="hidden sm:inline">{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>

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
              <p className="text-sm text-center">Chưa có dữ liệu.<br/>Bấm Đồng bộ.</p>
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
          {!selectedFolder && !isGlobalSearchActive ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <Folder size={64} className="opacity-10"/>
              <p className="text-sm">Chọn một thư mục bên trái để xem danh sách văn bản</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-emerald-500"/>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">
                      {selectedFolder ? selectedFolder.name : "Kết quả tìm kiếm toàn cục"}
                    </span>
                    {filteredFiles.length > 0 && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                        {filteredFiles.length} kết quả
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
                
                {/* Pagination Controls */}
                {filteredFiles.length > 0 && (
                  <div className="text-[10px] text-slate-500 flex flex-wrap justify-between items-center shrink-0">
                    <span>Trang <strong className="text-slate-700 dark:text-slate-200">{currentPage}</strong>/{totalPages}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={itemsPerPage}
                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-white/50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value={10}>10 / trang</option>
                        <option value={20}>20 / trang</option>
                        <option value={50}>50 / trang</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                          className="p-1 rounded-md bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 transition-colors">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-slate-700 dark:text-slate-300 font-bold px-1 min-w-[16px] text-center">{currentPage}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                          className="p-1 rounded-md bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {loadingFiles ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <RefreshCw size={24} className="animate-spin text-emerald-500"/>
                    <p className="text-sm">Đang tải danh sách file...</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <File size={40} className="opacity-20"/>
                    <p className="text-sm">Không tìm thấy file phù hợp</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur z-10">
                        {['#','Loại VB','Số VB','Ngày PH','Nơi phát hành','Trích yếu nội dung','Thao tác'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="document-list">
                        {(provided) => (
                          <tbody ref={provided.innerRef} {...provided.droppableProps}>
                            {paginatedFiles.map((file, idx) => {
                              const absoluteIndex = (currentPage - 1) * itemsPerPage + idx;
                              // Tìm tất cả file con (dự thảo đính kèm) của file này
                              const childFiles = currentFilesToDisplay.filter(f => f.parent_id === file.id);
                              return (
                                <Draggable key={file.id} draggableId={file.id} index={idx}>
                                  {(provided, snapshot) => (
                                    <>
                                      <DocRow 
                                        file={file} idx={absoluteIndex} onUpdate={updateRow} onAnalyze={() => setAnalyzingDoc(file)} 
                                        onAttachClick={(f) => {
                                          setAttachingFile(f);
                                          setAttachTargetId('');
                                          setAttachSearchTerm('');
                                        }}
                                        provided={provided} snapshot={snapshot} agencies={agencies}
                                      />
                                      {/* Hiển thị file dự thảo đính kèm (con) ngay dưới file cha */}
                                      {childFiles.map(child => (
                                        <ChildRow key={child.id} file={child} onDetach={handleDetach} />
                                      ))}
                                    </>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </tbody>
                        )}
                      </Droppable>
                    </DragDropContext>
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
          allFolderFiles={currentFilesToDisplay}
          onClose={() => setAnalyzingDoc(null)} 
          onSave={(updatedDoc) => {
            // Update the local list
            updateRow(updatedDoc.id, updatedDoc);
            setAnalyzingDoc(null);
          }} 
          agencies={agencies}
        />
      )}

      {/* Attach Modal */}
      {attachingFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-cyan-500" /> Gắn file Word vào PDF
              </h3>
              <button 
                onClick={() => setAttachingFile(null)} 
                className="text-slate-400 hover:text-red-400"
                disabled={isAttaching}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-300 mb-2">
                Chọn một file PDF bên dưới để gắn file Word dự thảo <strong>{attachingFile.name || attachingFile.file_name}</strong> vào:
              </p>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-500" />
                </div>
                <input 
                  type="text"
                  placeholder="Nhập Số VB hoặc Tên file để tìm nhanh PDF..."
                  value={attachSearchTerm}
                  onChange={(e) => setAttachSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-slate-200 mb-3"
                  disabled={isAttaching}
                />
              </div>
              
              <div className="relative max-h-[40vh] overflow-y-auto border border-slate-700/60 rounded-xl bg-slate-950/80 p-1.5 space-y-1 custom-scrollbar">
                  {currentFilesToDisplay
                    .filter(f => {
                       if (f.mimeType !== 'application/pdf' || f.id === attachingFile.id || f.parent_id || f.folder !== attachingFile.folder) return false;
                       if (attachSearchTerm) {
                         const term = attachSearchTerm.toLowerCase();
                         const nameMatch = (f.name || f.file_name || '').toLowerCase().includes(term);
                         const soVbMatch = (f.so_vb || '').toLowerCase().includes(term);
                         return nameMatch || soVbMatch;
                       }
                       return true;
                    })
                    .map(f => (
                    <div 
                      key={f.id} 
                      onClick={() => setAttachTargetId(f.id)}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors flex items-center gap-3 ${
                        attachTargetId === f.id 
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                          : 'text-slate-300 hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${attachTargetId === f.id ? 'border-cyan-500' : 'border-slate-500'}`}>
                         {attachTargetId === f.id && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-medium truncate" title={f.name || f.file_name}>{f.name || f.file_name}</div>
                        {f.so_vb && <div className="text-xs text-slate-500 mt-0.5">Số VB: {f.so_vb}</div>}
                      </div>
                    </div>
                  ))}
                  
                  {currentFilesToDisplay.filter(f => f.mimeType === 'application/pdf' && f.id !== attachingFile.id && !f.parent_id && f.folder === attachingFile.folder).length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Không có file PDF nào trong thư mục này.
                    </div>
                  )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80 mt-4">
                 <button 
                   onClick={() => setAttachingFile(null)} 
                   className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                   disabled={isAttaching}
                 >
                   Hủy
                 </button>
                 <button 
                   disabled={!attachTargetId || isAttaching}
                   onClick={async () => {
                     setIsAttaching(true);
                     try {
                        const targetFile = currentFilesToDisplay.find(f => f.id === attachTargetId);
                        const res = await fetch('/api/drive/attach', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            action: 'attach', 
                            child_id: attachingFile.id, 
                            parent_id: attachTargetId,
                            child_name: attachingFile.name || attachingFile.file_name,
                            parent_name: targetFile?.name || targetFile?.file_name
                          })
                        });
                        const json = await res.json();
                        if (json.success) {
                           setFolderFiles(prev => prev.map(f => f.id === attachingFile.id ? { 
                             ...f, 
                             parent_id: attachTargetId,
                             name: json.newName || f.name,
                             file_name: json.newName || f.file_name
                           } : f));
                           setAttachingFile(null);
                        } else {
                           alert('Lỗi đính kèm: ' + json.error);
                        }
                     } catch(e) { 
                        alert('Lỗi kết nối'); 
                     } finally { 
                        setIsAttaching(false); 
                     }
                   }}
                   className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
                 >
                   {isAttaching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                   Đồng ý gán
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
