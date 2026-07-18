'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, FolderOpen, File, HardDrive, RefreshCw,
  ChevronRight, ChevronDown, Search, ExternalLink,
  Pencil, Check, X, RotateCcw, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =========================================================
// TreeNode â€” chá»‰ render Folder
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
// Badge mÃ u loáº¡i vÄƒn báº£n
// =========================================================
const VBBadge = ({ type }) => {
  const map = {
    'Quyáº¿t Ä‘á»‹nh': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    'CÃ´ng vÄƒn':   'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-400',
    'Tá» trÃ¬nh':   'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-400',
    'BÃ¡o cÃ¡o':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    'ThÃ´ng bÃ¡o':  'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-400',
    'BiÃªn báº£n':   'bg-pink-100   text-pink-700   dark:bg-pink-900/40   dark:text-pink-400',
    'Há»£p Ä‘á»“ng':   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${map[type] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
      {type || 'â€”'}
    </span>
  );
};

const SkeletonCell = ({ w = 'w-20' }) => (
  <div className={`h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${w}`}/>
);

// =========================================================
// Ã” cÃ³ thá»ƒ chá»‰nh sá»­a
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
      title="Nháº¥p Ä‘á»ƒ sá»­a"
    >
      <span>{value || 'â€”'}</span>
      <Pencil size={10} className="absolute top-0.5 right-0.5 opacity-0 group-hover/cell:opacity-50 text-emerald-500 transition-opacity"/>
    </div>
  );
};

// =========================================================
// HÃ ng dá»¯ liá»‡u cÃ³ edit + re-extract
// =========================================================
const DocRow = ({ file, idx, onUpdate }) => {
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
    } catch { /* náº¿u lá»—i váº«n giá»¯ giÃ¡ trá»‹ local */ }
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
          {file.manually_edited && <CheckCircle2 size={10} className="text-emerald-500" title="ÄÃ£ chá»‰nh sá»­a thá»§ cÃ´ng"/>}
        </div>
      </td>

      {/* Loáº¡i VB */}
      <td className="px-3 py-2.5">
        <EditableCell value={file.loai_vb} onSave={v => handleSaveField('loai_vb', v)}
          className="inline-block"/>
      </td>

      {/* Sá»‘ VB */}
      <td className="px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
        <EditableCell value={file.so_vb} onSave={v => handleSaveField('so_vb', v)}/>
      </td>

      {/* NgÃ y PH */}
      <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
        <EditableCell value={file.ngay_phat_hanh} onSave={v => handleSaveField('ngay_phat_hanh', v)}/>
      </td>

      {/* NÆ¡i phÃ¡t hÃ nh */}
      <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 max-w-[140px]">
        <EditableCell value={file.noi_phat_hanh} onSave={v => handleSaveField('noi_phat_hanh', v)}/>
      </td>

      {/* TrÃ­ch yáº¿u */}
      <td className="px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 max-w-xs">
        <EditableCell value={file.trich_yeu} onSave={v => handleSaveField('trich_yeu', v)} multiline/>
      </td>

      {/* NÆ¡i gá»­i */}
      <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 max-w-[140px]">
        <EditableCell value={file.noi_gui} onSave={v => handleSaveField('noi_gui', v)}/>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 justify-center">
          {/* PhÃ¢n tÃ­ch láº¡i */}
          <button
            onClick={handleReExtract}
            disabled={reloading}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
            title="PhÃ¢n tÃ­ch láº¡i báº±ng AI"
          >
            <RotateCcw size={12} className={reloading ? 'animate-spin' : ''}/>
          </button>

          {/* Má»Ÿ file */}
          {(file.webViewLink || file.web_view_link) && (
            <a
              href={file.webViewLink || file.web_view_link}
              target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
              title="Má»Ÿ vÄƒn báº£n trÃªn Drive"
            >
              <ExternalLink size={12}/>
            </a>
          )}
        </div>

        {saved && (
          <div className="text-xs text-emerald-500 text-center mt-1 whitespace-nowrap">âœ“ ÄÃ£ lÆ°u</div>
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
  const [search, setSearch]     = useState('');

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderFiles, setFolderFiles]       = useState([]);
  const [loadingFiles, setLoadingFiles]     = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const url  = projectId ? `/api/drive/tree?projectId=${projectId}` : '/api/drive/tree';
      const json = await fetch(url).then(r => r.json());
      if (json.data) setData(json.data);
      else if (json.message) setError(json.message);
    } catch { setError('Lá»—i káº¿t ná»‘i server'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { loadData(); setSelectedFolder(null); setFolderFiles([]); }, [projectId]);

  const handleSync = async () => {
    setSyncing(true); setError(null);
    try {
      const url  = projectId ? `/api/drive/sync?projectId=${projectId}` : '/api/drive/sync';
      const json = await fetch(url, { method: 'POST' }).then(r => r.json());
      if (json.success) await loadData();
      else setError(json.error || 'Äá»“ng bá»™ tháº¥t báº¡i');
    } catch { setError('Lá»—i khi Ä‘á»“ng bá»™'); }
    finally  { setSyncing(false); }
  };

  // Cáº­p nháº­t 1 dÃ²ng trong báº£ng
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

        // Chá»‰ xá»­ lÃ½ file PDF
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
          <span>Quáº£n lÃ½ TÃ i liá»‡u Google Drive</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="TÃ¬m kiáº¿m thÆ° má»¥c..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"/>
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''}/>
            <span className="hidden sm:inline">{syncing ? 'Äang Ä‘á»“ng bá»™...' : 'Äá»“ng bá»™'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm shrink-0">
          <span className="font-semibold mr-2">Lá»—i:</span>{error}
        </div>
      )}

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: CÃ¢y thÆ° má»¥c */}
        <div className="w-1/3 min-w-[180px] border-r border-slate-200/50 dark:border-slate-800/50 overflow-y-auto p-2 shrink-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <RefreshCw size={22} className="animate-spin text-emerald-500"/>
              <p className="text-sm">Äang táº£i...</p>
            </div>
          ) : displayData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Folder size={44} className="opacity-20"/>
              <p className="text-sm text-center">{search ? 'KhÃ´ng tÃ¬m tháº¥y thÆ° má»¥c.' : 'ChÆ°a cÃ³ dá»¯ liá»‡u.\nBáº¥m Äá»“ng bá»™.'}</p>
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

        {/* RIGHT: Báº£ng vÄƒn báº£n */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {!selectedFolder ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <Folder size={64} className="opacity-10"/>
              <p className="text-sm">Chá»n má»™t thÆ° má»¥c bÃªn trÃ¡i Ä‘á»ƒ xem danh sÃ¡ch vÄƒn báº£n</p>
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
                      <span>AI Ä‘ang phÃ¢n tÃ­ch...</span>
                    </div>
                  )}
                  <span className="text-xs text-slate-400 hidden sm:inline">Nháº¥p vÃ o Ã´ Ä‘á»ƒ sá»­a â€¢ ðŸ”„ PhÃ¢n tÃ­ch láº¡i</span>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {loadingFiles ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <RefreshCw size={24} className="animate-spin text-emerald-500"/>
                    <p className="text-sm">Äang táº£i danh sÃ¡ch file...</p>
                  </div>
                ) : folderFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <File size={40} className="opacity-20"/>
                    <p className="text-sm">KhÃ´ng cÃ³ file PDF trong thÆ° má»¥c nÃ y</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur z-10">
                        {['#','Loáº¡i VB','Sá»‘ VB','NgÃ y PH','NÆ¡i phÃ¡t hÃ nh','TrÃ­ch yáº¿u ná»™i dung','NÆ¡i gá»­i','Thao tÃ¡c'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {folderFiles.map((file, idx) => (
                        <DocRow key={file.id} file={file} idx={idx} onUpdate={updateRow}/>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const isPressing = new WeakSet<EventTarget>()

import type { VisualElement } from "../../render/VisualElement"

export interface WithDepth {
    depth: number
}

export const compareByDepth = (a: VisualElement, b: VisualElement) =>
    a.depth - b.depth

export const isBrowser = typeof window !== "undefined"

export type ElementOrSelector =
    | Element
    | Element[]
    | NodeListOf<Element>
    | string
    | null
    | undefined

export interface WithQuerySelectorAll {
    querySelectorAll: Element["querySelectorAll"]
}

export interface AnimationScope<T = any> {
    readonly current: T
    animations: any[] // TODO: Refactor to types package AnimationPlaybackControls[]
}

export interface SelectorCache {
    [key: string]: NodeListOf<Element>
}

export function resolveElements(
    elementOrSelector: ElementOrSelector,
    scope?: AnimationScope,
    selectorCache?: SelectorCache
): Element[] {
    if (elementOrSelector == null) {
        return []
    }

    if (elementOrSelector instanceof EventTarget) {
        return [elementOrSelector]
    } else if (typeof elementOrSelector === "string") {
        let root: WithQuerySelectorAll = document

        if (scope) {
            root = scope.current
        }

        const elements =
            selectorCache?.[elementOrSelector] ??
            root.querySelectorAll(elementOrSelector)

        return elements ? Array.from(elements) : []
    }

    return Array.from(elementOrSelector).filter(
        (element): element is Element => element != null
    )
}

import type { Delta, Point } from "motion-utils"
import type { ResolvedValues } from "../../node/types"

export function buildProjectionTransform(
    delta: Delta,
    treeScale: Point,
    latestTransform?: ResolvedValues
): string {
    let transform = ""

    /**
     * The translations we use to calculate are always relative to the viewport coordinate space.
     * But when we apply scales, we also scale the coordinate space of an element and its children.
     * For instance if we have a treeScale (the culmination of all parent scales) of 0.5 and we need
     * to move an element 100 pixels, we actually need to move it 200 in within that scaled space.
     */
    const xTranslate = delta.x.translate / treeScale.x
    const yTranslate = delta.y.translate / treeScale.y
    const zTranslate = latestTransform?.z || 0
    if (xTranslate || yTranslate || zTranslate) {
        transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `
    }

    /**
     * Apply scale correction for the tree transform.
     * This will apply scale to the screen-orientated axes.
     */
    if (treeScale.x !== 1 || treeScale.y !== 1) {
        transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `
    }

    if (latestTransform) {
        const {
            transformPerspective,
            rotate,
            pathRotation,
            rotateX,
            rotateY,
            skewX,
            skewY,
        } = latestTransform
        if (transformPerspective)
            transform = `perspective(${transformPerspective}px) ${transform}`
        if (rotate) transform += `rotate(${rotate}deg) `
        // Additive `rotate()` so user `rotate` isn't clobbered.
        if (pathRotation) transform += `rotate(${pathRotation}deg) `
        if (rotateX) transform += `rotateX(${rotateX}deg) `
        if (rotateY) transform += `rotateY(${rotateY}deg) `
        if (skewX) transform += `skewX(${skewX}deg) `
        if (skewY) transform += `skewY(${skewY}deg) `
    }

    /**
     * Apply scale to match the size of the element to the size we want it.
     * This will apply scale to the element-orientated axes.
     */
    const elementScaleX = delta.x.scale * treeScale.x
    const elementScaleY = delta.y.scale * treeScale.y
    if (elementScaleX !== 1 || elementScaleY !== 1) {
        transform += `scale(${elementScaleX}, ${elementScaleY})`
    }

    return transform || "none"
}

import type { MotionStyle } from "../../VisualElement"
import { HTMLRenderState } from "../types"

export function renderHTML(
    element: HTMLElement,
    { style, vars }: HTMLRenderState,
    styleProp?: MotionStyle,
    projection?: any
) {
    const elementStyle = element.style

    let key: string
    for (key in style) {
        // CSSStyleDeclaration has [index: number]: string; in the types, so we use that as key type.
        elementStyle[key as unknown as number] = style[key] as string
    }

    // Write projection styles directly to element style
    projection?.applyProjectionStyles(elementStyle, styleProp)

    for (key in vars) {
        // Loop over any CSS variables and assign those.
        // They can only be assigned using `setProperty`.
        elementStyle.setProperty(key, vars[key] as string)
    }
}

import type { MotionValue } from ".."

export const isMotionValue = (value: any): value is MotionValue =>
    Boolean(value && value.getVelocity)

export const isObject = (value: unknown): value is object =>
    typeof value === "object" && value !== null

import type { DynamicOption } from "../types"
import type { VisualElement } from "../../render/VisualElement"

export function calcChildStagger(
    children: Set<VisualElement>,
    child: VisualElement,
    delayChildren?: number | DynamicOption<number>,
    staggerChildren: number = 0,
    staggerDirection: number = 1
): number {
    const index = Array.from(children)
        .sort((a, b) => a.sortNodePosition(b))
        .indexOf(child)
    const numChildren = children.size
    const maxStaggerDuration = (numChildren - 1) * staggerChildren
    const delayIsFunction = typeof delayChildren === "function"

    return delayIsFunction
        ? delayChildren(index, numChildren)
        : staggerDirection === 1
        ? index * staggerChildren
        : maxStaggerDuration - index * staggerChildren
}

export function addDomEvent(
    target: EventTarget,
    eventName: string,
    handler: EventListener,
    options: AddEventListenerOptions = { passive: true }
) {
    target.addEventListener(eventName, handler, options)

    return () => target.removeEventListener(eventName, handler, options)
}

import { BezierDefinition } from "motion-utils"

export const cubicBezierAsString = ([a, b, c, d]: BezierDefinition) =>
    `cubic-bezier(${a}, ${b}, ${c}, ${d})`

import { AnyResolvedKeyframe } from "../types"

export type CSSVariableName = `--${string}`

export type CSSVariableToken = `var(${CSSVariableName})`

const checkStringStartsWith =
    <T extends string>(token: string) =>
    (key?: AnyResolvedKeyframe | null): key is T =>
        typeof key === "string" && key.startsWith(token)

export const isCSSVariableName =
    /*@__PURE__*/ checkStringStartsWith<CSSVariableName>("--")

const startsAsVariableToken =
    /*@__PURE__*/ checkStringStartsWith<CSSVariableToken>("var(--")
export const isCSSVariableToken = (
    value?: string
): value is CSSVariableToken => {
    const startsWithToken = startsAsVariableToken(value)

    if (!startsWithToken) return false

    // Ensure any comments are stripped from the value as this can harm performance of the regex.
    return singleCssVariableRegex.test(value.split("/*")[0].trim())
}

const singleCssVariableRegex =
    /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu

/**
 * Check if a value contains a CSS variable anywhere (e.g. inside calc()).
 * Unlike isCSSVariableToken which checks if the value IS a var() token,
 * this checks if the value CONTAINS var() somewhere in the string.
 */
export function containsCSSVariable(
    value?: AnyResolvedKeyframe | null
): boolean {
    if (typeof value !== "string") return false
    // Strip comments to avoid false positives
    return value.split("/*")[0].includes("var(--")
}

export const isDragging = {
    x: false,
    y: false,
}

export function isDragActive() {
    return isDragging.x || isDragging.y
}

export function isNullish(v: any): v is null | undefined {
    return v == null
}

import type {
    AnimationDefinition,
    MotionNodeOptions,
    TargetAndTransition,
    TargetResolver,
} from "../../node/types"
import type { ResolvedValues } from "../types"

function getValueState(visualElement?: any): [ResolvedValues, ResolvedValues] {
    const state: [ResolvedValues, ResolvedValues] = [{}, {}]

    visualElement?.values.forEach((value: any, key: string) => {
        state[0][key] = value.get()
        state[1][key] = value.getVelocity()
    })

    return state
}

export function resolveVariantFromProps(
    props: MotionNodeOptions,
    definition: TargetAndTransition | TargetResolver,
    custom?: any,
    visualElement?: any
): TargetAndTransition
export function resolveVariantFromProps(
    props: MotionNodeOptions,
    definition?: AnimationDefinition,
    custom?: any,
    visualElement?: any
): undefined | TargetAndTransition
export function resolveVariantFromProps(
    props: MotionNodeOptions,
    definition?: AnimationDefinition,
    custom?: any,
    visualElement?: any
) {
    /**
     * If the variant definition is a function, resolve.
     */
    if (typeof definition === "function") {
        const [current, velocity] = getValueState(visualElement)
        definition = definition(
            custom !== undefined ? custom : props.custom,
            current,
            velocity
        )
    }

    /**
     * If the variant definition is a variant label, or
     * the function returned a variant label, resolve.
     */
    if (typeof definition === "string") {
        definition = props.variants && props.variants[definition]
    }

    /**
     * At this point we've resolved both functions and variant labels,
     * but the resolved variant label might itself have been a function.
     * If so, resolve. This can only have returned a valid target object.
     */
    if (typeof definition === "function") {
        const [current, velocity] = getValueState(visualElement)
        definition = definition(
            custom !== undefined ? custom : props.custom,
            current,
            velocity
        )
    }

    return definition
}

import { Point } from "motion-utils"

export const distance = (a: number, b: number) => Math.abs(a - b)

export function distance2D(a: Point, b: Point): number {
    // Multi-dimensional
    const xDelta = distance(a.x, b.x)
    const yDelta = distance(a.y, b.y)
    return Math.sqrt(xDelta ** 2 + yDelta ** 2)
}

import { AnimationGeneratorType, GeneratorFactory } from "../../types"

export function isGenerator(
    type?: AnimationGeneratorType
): type is GeneratorFactory {
    return typeof type === "function" && "applyToOptions" in type
}

export function mixImmediate<T>(a: T, b: T) {
    return (p: number) => (p > 0 ? b : a)
}

import { Easing } from "../types"

/*#__NO_SIDE_EFFECTS__*/
export const isEasingArray = (ease: any): ease is Easing[] => {
    return Array.isArray(ease) && typeof ease[0] !== "number"
}

export function addUniqueItem<T>(arr: T[], item: T) {
    if (arr.indexOf(item) === -1) arr.push(item)
}

export function removeItem<T>(arr: T[], item: T) {
    const index = arr.indexOf(item)
    if (index > -1) arr.splice(index, 1)
}

// Adapted from array-move
export function moveItem<T>([...arr]: T[], fromIndex: number, toIndex: number) {
    const startIndex = fromIndex < 0 ? arr.length + fromIndex : fromIndex

    if (startIndex >= 0 && startIndex < arr.length) {
        const endIndex = toIndex < 0 ? arr.length + toIndex : toIndex

        const [item] = arr.splice(fromIndex, 1)
        arr.splice(endIndex, 0, item)
    }

    return arr
}

export function camelToDash(str: string): string {
    return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`)
}

interface ReducedMotionState {
    current: boolean | null
}

// Does this device prefer reduced motion? Returns `null` server-side.
export const prefersReducedMotion: ReducedMotionState = { current: null }

export const hasReducedMotionListener = { current: false }

import { BezierDefinition, Easing } from "../types"

/*#__NO_SIDE_EFFECTS__*/
export const isBezierDefinition = (
    easing: Easing | Easing[]
): easing is BezierDefinition =>
    Array.isArray(easing) && typeof easing[0] === "number"

import { AnimationPlaybackOptions } from "../types"

const isNotNull = (value: unknown) => value !== null

export function getFinalKeyframe<T>(
    keyframes: T[],
    { repeat, repeatType = "loop" }: AnimationPlaybackOptions,
    finalKeyframe?: T,
    speed: number = 1
): T {
    const resolvedKeyframes = keyframes.filter(isNotNull)
    const useFirstKeyframe =
        speed < 0 || (repeat && repeatType !== "loop" && repeat % 2 === 1)
    const index = useFirstKeyframe ? 0 : resolvedKeyframes.length - 1

    return !index || finalKeyframe === undefined
        ? resolvedKeyframes[index]
        : finalKeyframe
}

import { isValidElement, Children, ReactElement, ReactNode } from "react"

export type ComponentKey = string | number

export const getChildKey = (child: ReactElement<any>): ComponentKey =>
    child.key || ""

export function onlyElements(children: ReactNode): ReactElement<any>[] {
    const filtered: ReactElement<any>[] = []

    // We use forEach here instead of map as map mutates the component key by preprending `.$`
    Children.forEach(children, (child) => {
        if (isValidElement(child)) filtered.push(child)
    })

    return filtered
}

import { transformPropOrder } from "./keys-transform"

export const positionalKeys = new Set([
    "width",
    "height",
    "top",
    "left",
    "right",
    "bottom",
    ...transformPropOrder,
])

import { isControllingVariants, isVariantLabel } from "motion-dom"
import type { MotionContextProps } from "."
import { MotionProps } from "../../motion/types"

export function getCurrentTreeVariants(
    props: MotionProps,
    context: MotionContextProps
): MotionContextProps {
    if (isControllingVariants(props)) {
        const { initial, animate } = props
        return {
            initial:
                initial === false || isVariantLabel(initial)
                    ? (initial as any)
                    : undefined,
            animate: isVariantLabel(animate) ? animate : undefined,
        }
    }
    return props.inherit !== false ? context : {}
}

import { isMotionValue } from "../utils/is-motion-value"
import type { WillChange } from "./types"

export function isWillChangeMotionValue(value: any): value is WillChange {
    return Boolean(isMotionValue(value) && (value as WillChange).add)
}

import {
    ElementOrSelector,
    resolveElements,
} from "../../utils/resolve-elements"
import { EventOptions } from "../types"

export function setupGesture(
    elementOrSelector: ElementOrSelector,
    options: EventOptions
): [Element[], AddEventListenerOptions, VoidFunction] {
    const elements = resolveElements(elementOrSelector)

    const gestureAbortController = new AbortController()

    const eventOptions = {
        passive: true,
        ...options,
        signal: gestureAbortController.signal,
    }

    const cancel = () => gestureAbortController.abort()

    return [elements, eventOptions, cancel]
}

import { createRenderBatcher } from "./batcher"

export const { schedule: microtask, cancel: cancelMicrotask } =
    /* @__PURE__ */ createRenderBatcher(queueMicrotask, false)

import { UnresolvedValueKeyframe, ValueKeyframe } from "../../types"

export function fillWildcards(
    keyframes: ValueKeyframe[] | UnresolvedValueKeyframe[]
) {
    for (let i = 1; i < keyframes.length; i++) {
        keyframes[i] ??= keyframes[i - 1]
    }
}

import { ValueKeyframesDefinition, ValueTransition } from "../types"
import { mapEasingToNativeEasing } from "./easing/map-easing"

export function startWaapiAnimation(
    element: Element,
    valueName: string,
    keyframes: ValueKeyframesDefinition,
    {
        delay = 0,
        duration = 300,
        repeat = 0,
        repeatType = "loop",
        ease = "easeOut",
        times,
    }: ValueTransition = {},
    pseudoElement: string | undefined = undefined
) {
    const keyframeOptions: PropertyIndexedKeyframes = {
        [valueName]: keyframes as string[],
    }
    if (times) keyframeOptions.offset = times

    const easing = mapEasingToNativeEasing(ease, duration)

    /**
     * If this is an easing array, apply to keyframes, not animation as a whole
     */
    if (Array.isArray(easing)) keyframeOptions.easing = easing

    const options: KeyframeAnimationOptions = {
        delay,
        duration,
        easing: !Array.isArray(easing) ? easing : "linear",
        fill: "both",
        iterations: repeat + 1,
        direction: repeatType === "reverse" ? "alternate" : "normal",
    }

    if (pseudoElement) options.pseudoElement = pseudoElement

    return element.animate(keyframeOptions, options)
}

import type {
    AnimationDefinition,
    TargetAndTransition,
    TargetResolver,
} from "../../node/types"
import { resolveVariantFromProps } from "./resolve-variants"

/**
 * Resolves a variant if it's a variant resolver.
 * Uses `any` type for visualElement to avoid circular dependencies.
 */
export function resolveVariant(
    visualElement: any,
    definition?: TargetAndTransition | TargetResolver,
    custom?: any
): TargetAndTransition
export function resolveVariant(
    visualElement: any,
    definition?: AnimationDefinition,
    custom?: any
): TargetAndTransition | undefined
export function resolveVariant(
    visualElement: any,
    definition?: AnimationDefinition,
    custom?: any
) {
    const props = visualElement.getProps()
    return resolveVariantFromProps(
        props,
        definition,
        custom !== undefined ? custom : props.custom,
        visualElement
    )
}

import { ProgressTimeline } from "../.."
import { memoSupports } from "./memo"

declare global {
    interface Window {
        ScrollTimeline: ScrollTimeline
        ViewTimeline: ViewTimeline
    }
}

declare class ScrollTimeline implements ProgressTimeline {
    constructor(options: ScrollOptions)

    currentTime: null | { value: number }

    cancel?: VoidFunction
}

declare class ViewTimeline implements ProgressTimeline {
    constructor(options: { subject: Element; axis?: string })

    currentTime: null | { value: number }

    cancel?: VoidFunction
}

export const supportsScrollTimeline = /* @__PURE__ */ memoSupports(
    () => window.ScrollTimeline !== undefined,
    "scrollTimeline"
)

export const supportsViewTimeline = /* @__PURE__ */ memoSupports(
    () => window.ViewTimeline !== undefined,
    "viewTimeline"
)

import { AnyResolvedKeyframe } from "../../../animation/types"

/*#__NO_SIDE_EFFECTS__*/
const createUnitType = (unit: string) => ({
    test: (v: AnyResolvedKeyframe) =>
        typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
    parse: parseFloat,
    transform: (v: number | string) => `${v}${unit}`,
})

export const degrees = /*@__PURE__*/ createUnitType("deg")
export const percent = /*@__PURE__*/ createUnitType("%")
export const px = /*@__PURE__*/ createUnitType("px")
export const vh = /*@__PURE__*/ createUnitType("vh")
export const vw = /*@__PURE__*/ createUnitType("vw")

export const progressPercentage = /*@__PURE__*/ (() => ({
    ...percent,
    parse: (v: string) => percent.parse(v) / 100,
    transform: (v: number) => percent.transform(v * 100),
}))()

export function formatErrorMessage(message: string, errorCode?: string) {
    return errorCode
        ? `${message}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${errorCode}`
        : message
}

import { HTMLProjectionNode } from "motion-dom"
import { MeasureLayout } from "./layout/MeasureLayout"
import { FeaturePackages } from "./types"

export const layout: FeaturePackages = {
    layout: {
        ProjectionNode: HTMLProjectionNode,
        MeasureLayout,
    },
}

import { fillOffset } from "./fill"

export function defaultOffset(arr: any[]): number[] {
    const offset = [0]
    fillOffset(offset, arr.length - 1)
    return offset
}

// Accepts an easing function and returns a new one that outputs reversed values.

import { EasingModifier } from "../types"

// Turns easeIn into easeOut.
/*#__NO_SIDE_EFFECTS__*/
export const reverseEasing: EasingModifier = (easing) => (p) =>
    1 - easing(1 - p)

import { Feature, frame, hover, type VisualElement } from "motion-dom"
import { extractEventInfo } from "../events/event-info"

function handleHoverEvent(
    node: VisualElement<Element>,
    event: PointerEvent,
    lifecycle: "Start" | "End"
) {
    const { props } = node

    if (node.animationState && props.whileHover) {
        node.animationState.setActive("whileHover", lifecycle === "Start")
    }

    const eventName = ("onHover" + lifecycle) as "onHoverStart" | "onHoverEnd"
    const callback = props[eventName]
    if (callback) {
        frame.postRender(() => callback(event, extractEventInfo(event)))
    }
}

export class HoverGesture extends Feature<Element> {
    mount() {
        const { current } = this.node
        if (!current) return

        this.unmount = hover(current, (_element, startEvent) => {
            handleHoverEvent(this.node, startEvent, "Start")

            return (endEvent) => handleHoverEvent(this.node, endEvent, "End")
        })
    }

    unmount() {}
}

import { MotionGlobalConfig } from "motion-utils"
import type { VisualElement } from "../../render/VisualElement"
import { isWillChangeMotionValue } from "./is"

export function addValueToWillChange(
    visualElement: VisualElement,
    key: string
) {
    const willChange = visualElement.getValue("willChange")

    /**
     * It could be that a user has set willChange to a regular MotionValue,
     * in which case we can't add the value to it.
     */
    if (isWillChangeMotionValue(willChange)) {
        return willChange.add(key)
    } else if (!willChange && MotionGlobalConfig.WillChange) {
        const newWillChange = new MotionGlobalConfig.WillChange("auto")

        visualElement.addValue("willChange", newWillChange)
        newWillChange.add(key)
    }
}

import { noop } from "motion-utils"
import { createRenderBatcher } from "./batcher"

export const {
    schedule: frame,
    cancel: cancelFrame,
    state: frameData,
    steps: frameSteps,
} = /* @__PURE__ */ createRenderBatcher(
    typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop,
    true
)

// Accepts an easing function and returns a new one that outputs mirrored values for

import { EasingModifier } from "../types"

// the second half of the animation. Turns easeIn into easeInOut.
/*#__NO_SIDE_EFFECTS__*/
export const mirrorEasing: EasingModifier = (easing) => (p) =>
    p <= 0.5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2

import { optimizedAppearDataAttribute } from "./data-id"
import type { WithAppearProps } from "./types"

export function getOptimisedAppearId(
    visualElement: WithAppearProps
): string | undefined {
    return visualElement.props[optimizedAppearDataAttribute]
}

import { warnOnce } from "motion-utils"
import { createMotionComponent, MotionComponentOptions } from "../../motion"
import { FeaturePackages } from "../../motion/features/types"
import { MotionProps } from "../../motion/types"
import { DOMMotionComponents } from "../dom/types"
import { CreateVisualElement } from "../types"

/**
 * I'd rather the return type of `custom` to be implicit but this throws
 * incorrect relative paths in the exported types and API Extractor throws
 * a wobbly.
 */
type ComponentProps<Props> = React.PropsWithoutRef<Props & MotionProps> &
    React.RefAttributes<SVGElement | HTMLElement>
export type CustomDomComponent<Props> = React.ComponentType<
    ComponentProps<Props>
>

type MotionProxy = typeof createMotionComponent &
    DOMMotionComponents & { create: typeof createMotionComponent }

export function createMotionProxy(
    preloadedFeatures?: FeaturePackages,
    createVisualElement?: CreateVisualElement<any, any>
): MotionProxy {
    if (typeof Proxy === "undefined") {
        return createMotionComponent as MotionProxy
    }

    /**
     * A cache of generated `motion` components, e.g `motion.div`, `motion.input` etc.
     * Rather than generating them anew every render.
     */
    const componentCache = new Map<string, any>()

    const factory = (Component: string, options?: MotionComponentOptions) => {
        return createMotionComponent(
            Component,
            options,
            preloadedFeatures,
            createVisualElement
        )
    }

    /**
     * Support for deprecated`motion(Component)` pattern
     */
    const deprecatedFactoryFunction = (
        Component: string,
        options?: MotionComponentOptions
    ) => {
        if (process.env.NODE_ENV !== "production") {
            warnOnce(
                false,
                "motion() is deprecated. Use motion.create() instead."
            )
        }
        return factory(Component, options)
    }

    return new Proxy(deprecatedFactoryFunction, {
        /**
         * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
         * The prop name is passed through as `key` and we can use that to generate a `motion`
         * DOM component with that name.
         */
        get: (_target, key: string) => {
            if (key === "create") return factory

            /**
             * If this element doesn't exist in the component cache, create it and cache.
             */
            if (!componentCache.has(key)) {
                componentCache.set(
                    key,
                    createMotionComponent(
                        key,
                        undefined,
                        preloadedFeatures,
                        createVisualElement
                    )
                )
            }

            return componentCache.get(key)!
        },
    }) as MotionProxy
}

/**
 * Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
 */
export const isNumericalString = (v: string) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v)

import { isMotionValue } from "../../../value/utils/is-motion-value"
import type { MotionNodeOptions } from "../../../node/types"
import { isForcedMotionValue } from "../../utils/is-forced-motion-value"
import type { VisualElement } from "../../VisualElement"

export function scrapeMotionValuesFromProps(
    props: MotionNodeOptions,
    prevProps: MotionNodeOptions,
    visualElement?: VisualElement
) {
    const style = (props as any).style
    const prevStyle = (prevProps as any)?.style
    const newValues: { [key: string]: any } = {}

    if (!style) return newValues

    for (const key in style) {
        if (
            isMotionValue(style[key]) ||
            (prevStyle && isMotionValue(prevStyle[key])) ||
            isForcedMotionValue(key, props) ||
            visualElement?.getValue(key)?.liveStyle !== undefined
        ) {
            newValues[key] = style[key]
        }
    }

    return newValues
}

import {
    AnimationState,
    KeyframeGenerator,
    ValueAnimationOptions,
} from "../types"
import { spring as createSpring } from "./spring"
import { getGeneratorVelocity } from "./utils/velocity"

export function inertia({
    keyframes,
    velocity = 0.0,
    power = 0.8,
    timeConstant = 325,
    bounceDamping = 10,
    bounceStiffness = 500,
    modifyTarget,
    min,
    max,
    restDelta = 0.5,
    restSpeed,
}: ValueAnimationOptions<number>): KeyframeGenerator<number> {
    const origin = keyframes[0]

    const state: AnimationState<number> = {
        done: false,
        value: origin,
    }

    const isOutOfBounds = (v: number) =>
        (min !== undefined && v < min) || (max !== undefined && v > max)

    const nearestBoundary = (v: number) => {
        if (min === undefined) return max
        if (max === undefined) return min

        return Math.abs(min - v) < Math.abs(max - v) ? min : max
    }

    let amplitude = power * velocity
    const ideal = origin + amplitude
    const target = modifyTarget === undefined ? ideal : modifyTarget(ideal)

    /**
     * If the target has changed we need to re-calculate the amplitude, otherwise
     * the animation will start from the wrong position.
     */
    if (target !== ideal) amplitude = target - origin

    const calcDelta = (t: number) => -amplitude * Math.exp(-t / timeConstant)

    const calcLatest = (t: number) => target + calcDelta(t)

    const applyFriction = (t: number) => {
        const delta = calcDelta(t)
        const latest = calcLatest(t)
        state.done = Math.abs(delta) <= restDelta
        state.value = state.done ? target : latest
    }

    /**
     * Ideally this would resolve for t in a stateless way, we could
     * do that by always precalculating the animation but as we know
     * this will be done anyway we can assume that spring will
     * be discovered during that.
     */
    let timeReachedBoundary: number | undefined
    let spring: KeyframeGenerator<number> | undefined

    const checkCatchBoundary = (t: number) => {
        if (!isOutOfBounds(state.value)) return

        timeReachedBoundary = t

        spring = createSpring({
            keyframes: [state.value, nearestBoundary(state.value)!],
            velocity: getGeneratorVelocity(calcLatest, t, state.value), // TODO: This should be passing * 1000
            damping: bounceDamping,
            stiffness: bounceStiffness,
            restDelta,
            restSpeed,
        })
    }

    checkCatchBoundary(0)

    return {
        calculatedDuration: null,
        next: (t: number) => {
            /**
             * We need to resolve the friction to figure out if we need a
             * spring but we don't want to do this twice per frame. So here
             * we flag if we updated for this frame and later if we did
             * we can skip doing it again.
             */
            let hasUpdatedFrame = false
            if (!spring && timeReachedBoundary === undefined) {
                hasUpdatedFrame = true
                applyFriction(t)
                checkCatchBoundary(t)
            }

            /**
             * If we have a spring and the provided t is beyond the moment the friction
             * animation crossed the min/max boundary, use the spring.
             */
            if (timeReachedBoundary !== undefined && t >= timeReachedBoundary) {
                return spring!.next(t - timeReachedBoundary)
            } else {
                !hasUpdatedFrame && applyFriction(t)
                return state
            }
        },
    }
}

import { camelToDash } from "../../render/dom/utils/camel-to-dash"

export const optimizedAppearDataId = "framerAppearId"

export const optimizedAppearDataAttribute =
    "data-" + camelToDash(optimizedAppearDataId) as "data-framer-appear-id"

import { backIn } from "./back"

export const anticipate = (p: number) =>
    p >= 1
        ? 1
        : (p *= 2) < 1
          ? 0.5 * backIn(p)
          : 0.5 * (2 - Math.pow(2, -10 * (p - 1)))

import { isDragging } from "./is-active"

export function setDragLock(axis: boolean | "x" | "y" | "lockDirection") {
    if (axis === "x" || axis === "y") {
        if (isDragging[axis]) {
            return null
        } else {
            isDragging[axis] = true
            return () => {
                isDragging[axis] = false
            }
        }
    } else {
        if (isDragging.x || isDragging.y) {
            return null
        } else {
            isDragging.x = isDragging.y = true
            return () => {
                isDragging.x = isDragging.y = false
            }
        }
    }
}

import { isMotionValue } from "motion-dom"
import type { MotionProps } from "../../../motion/types"
import { isValidMotionProp } from "../../../motion/utils/valid-prop"

let shouldForward = (key: string) => !isValidMotionProp(key)

export type IsValidProp = (key: string) => boolean

export function loadExternalIsValidProp(isValidProp?: IsValidProp) {
    if (typeof isValidProp !== "function") return

    // Explicitly filter our events
    shouldForward = (key: string) =>
        key.startsWith("on") ? !isValidMotionProp(key) : isValidProp(key)
}

/**
 * Emotion and Styled Components both allow users to pass through arbitrary props to their components
 * to dynamically generate CSS. They both use the `@emotion/is-prop-valid` package to determine which
 * of these should be passed to the underlying DOM node.
 *
 * However, when styling a Motion component `styled(motion.div)`, both packages pass through *all* props
 * as it's seen as an arbitrary component rather than a DOM node. Motion only allows arbitrary props
 * passed through the `custom` prop so it doesn't *need* the payload or computational overhead of
 * `@emotion/is-prop-valid`, however to fix this problem we need to use it.
 *
 * By making it an optionalDependency we can offer this functionality only in the situations where it's
 * actually required.
 */
try {
    /**
     * We attempt to import this package but require won't be defined in esm environments, in that case
     * isPropValid will have to be provided via `MotionContext`. In a 6.0.0 this should probably be removed
     * in favour of explicit injection.
     *
     * String concatenation prevents bundlers like webpack (e.g. Storybook)
     * from statically resolving this optional dependency at build time.
     */
    const emotionPkg = "@emotion/is-prop-" + "valid"
    loadExternalIsValidProp(require(emotionPkg).default)
} catch {
    // We don't need to actually do anything here - the fallback is the existing `isPropValid`.
}

export function filterProps(
    props: MotionProps,
    isDom: boolean,
    forwardMotionProps: boolean
) {
    const filteredProps: MotionProps = {}

    for (const key in props) {
        /**
         * values is considered a valid prop by Emotion, so if it's present
         * this will be rendered out to the DOM unless explicitly filtered.
         *
         * We check the type as it could be used with the `feColorMatrix`
         * element, which we support.
         */
        if (key === "values" && typeof props.values === "object") continue

        if (isMotionValue(props[key as keyof typeof props])) continue

        if (
            shouldForward(key) ||
            (forwardMotionProps === true && isValidMotionProp(key)) ||
            (!isDom && !isValidMotionProp(key)) ||
            // If trying to use native HTML drag events, forward drag listeners
            (props["draggable" as keyof MotionProps] &&
                key.startsWith("onDrag"))
        ) {
            filteredProps[key as keyof MotionProps] =
                props[key as keyof MotionProps]
        }
    }

    return filteredProps
}

import { isMotionValue } from "../../../value/utils/is-motion-value"
import type { MotionNodeOptions } from "../../../node/types"
import { transformPropOrder } from "../../utils/keys-transform"
import { scrapeMotionValuesFromProps as scrapeHTMLMotionValuesFromProps } from "../../html/utils/scrape-motion-values"
import type { VisualElement } from "../../VisualElement"

export function scrapeMotionValuesFromProps(
    props: MotionNodeOptions,
    prevProps: MotionNodeOptions,
    visualElement?: VisualElement
) {
    const newValues = scrapeHTMLMotionValuesFromProps(
        props,
        prevProps,
        visualElement
    )

    for (const key in props) {
        if (
            isMotionValue(props[key as keyof typeof props]) ||
            isMotionValue(prevProps[key as keyof typeof prevProps])
        ) {
            const targetKey =
                transformPropOrder.indexOf(key) !== -1
                    ? "attr" + key.charAt(0).toUpperCase() + key.substring(1)
                    : key

            newValues[targetKey] = props[key as keyof typeof props]
        }
    }

    return newValues
}

import { createDomVisualElement } from "../../dom/create-visual-element"
import { createMotionProxy } from "../create-proxy"
import { featureBundle } from "./feature-bundle"

export const motion = /*@__PURE__*/ createMotionProxy(
    featureBundle,
    createDomVisualElement
)

import { EasingFunction } from "motion-utils"

export const generateLinearEasing = (
    easing: EasingFunction,
    duration: number, // as milliseconds
    resolution: number = 10 // as milliseconds
): string => {
    let points = ""
    const numPoints = Math.max(Math.round(duration / resolution), 2)

    for (let i = 0; i < numPoints; i++) {
        points += Math.round(easing(i / (numPoints - 1)) * 10000) / 10000 + ", "
    }

    return `linear(${points.substring(0, points.length - 2)})`
}

import { ElementOrSelector } from "../utils/resolve-elements"
import { resizeElement } from "./handle-element"
import { resizeWindow } from "./handle-window"
import { ResizeHandler, WindowResizeHandler } from "./types"

export function resize(onResize: WindowResizeHandler): VoidFunction
export function resize(
    target: ElementOrSelector,
    onResize: ResizeHandler<Element>
): VoidFunction
export function resize(
    a: WindowResizeHandler | ElementOrSelector,
    b?: ResizeHandler<Element>
) {
    return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b!)
}

/*
  Convert velocity into velocity per second
*/
/*#__NO_SIDE_EFFECTS__*/
export const velocityPerSecond = (velocity: number, frameDuration: number) =>
    frameDuration ? velocity * (1000 / frameDuration) : 0

import { TransformPoint } from "motion-utils"
import {
    convertBoundingBoxToBox,
    transformBoxPoints,
} from "../geometry/conversion"
import { translateAxis } from "../geometry/delta-apply"

export function measureViewportBox(
    instance: HTMLElement,
    transformPoint?: TransformPoint
) {
    return convertBoundingBoxToBox(
        transformBoxPoints(instance.getBoundingClientRect(), transformPoint)
    )
}

export function measurePageBox(
    element: HTMLElement,
    rootProjectionNode: any,
    transformPagePoint?: TransformPoint
) {
    const viewportBox = measureViewportBox(element, transformPagePoint)
    const { scroll } = rootProjectionNode

    if (scroll) {
        translateAxis(viewportBox.x, scroll.offset.x)
        translateAxis(viewportBox.y, scroll.offset.y)
    }

    return viewportBox
}

import { getValueAsType } from "../../../value/types/utils/get-as-type"
import { numberValueTypes } from "../../../value/types/maps/number"
import { transformPropOrder } from "../../utils/keys-transform"
import { ResolvedValues } from "../../types"
import { HTMLRenderState } from "../types"
import type { MotionNodeOptions } from "../../../node/types"

const translateAlias = {
    x: "translateX",
    y: "translateY",
    z: "translateZ",
    transformPerspective: "perspective",
}

const numTransforms = transformPropOrder.length

/**
 * Build a CSS transform style from individual x/y/scale etc properties.
 *
 * This outputs with a default order of transforms/scales/rotations, this can be customised by
 * providing a transformTemplate function.
 */
export function buildTransform(
    latestValues: ResolvedValues,
    transform: HTMLRenderState["transform"],
    transformTemplate?: MotionNodeOptions["transformTemplate"]
) {
    // The transform string we're going to build into.
    let transformString = ""
    let transformIsDefault = true

    /**
     * Loop over all possible transforms in order, adding the ones that
     * are present to the transform string.
     */
    for (let i = 0; i < numTransforms; i++) {
        const key = transformPropOrder[i] as keyof typeof translateAlias
        const value = latestValues[key]

        if (value === undefined) continue

        let valueIsDefault = true
        if (typeof value === "number") {
            valueIsDefault = value === (key.startsWith("scale") ? 1 : 0)
        } else {
            const parsed = parseFloat(value)
            valueIsDefault = key.startsWith("scale") ? parsed === 1 : parsed === 0
        }

        if (!valueIsDefault || transformTemplate) {
            const valueAsType = getValueAsType(value, numberValueTypes[key])

            if (!valueIsDefault) {
                transformIsDefault = false
                const transformName = translateAlias[key] || key
                transformString += `${transformName}(${valueAsType}) `
            }

            if (transformTemplate) {
                transform[key] = valueAsType
            }
        }
    }

    // `pathRotation` composes onto `rotate` as a separate additive term so
    // the user's `rotate` is never clobbered. Deliberately not a slot in
    // `transformPropOrder`.
    const pathRotation = latestValues.pathRotation
    if (pathRotation) {
        transformIsDefault = false
        transformString += `rotate(${getValueAsType(
            pathRotation,
            numberValueTypes.pathRotation
        )}) `
    }

    transformString = transformString.trim()

    // If we have a custom `transform` template, pass our transform values and
    // generated transformString to that before returning
    if (transformTemplate) {
        transformString = transformTemplate(
            transform,
            transformIsDefault ? "" : transformString
        )
    } else if (transformIsDefault) {
        transformString = "none"
    }

    return transformString
}

import { animateMotionValue } from "../interfaces/motion-value"
import type {
    AnimationPlaybackControlsWithThen,
    AnyResolvedKeyframe,
    UnresolvedValueKeyframe,
    ValueAnimationTransition,
} from "../types"
import {
    motionValue as createMotionValue,
    MotionValue,
} from "../../value"
import { isMotionValue } from "../../value/utils/is-motion-value"

export function animateSingleValue<V extends AnyResolvedKeyframe>(
    value: MotionValue<V> | V,
    keyframes: V | UnresolvedValueKeyframe<V>[],
    options?: ValueAnimationTransition
): AnimationPlaybackControlsWithThen {
    const motionValue = isMotionValue(value) ? value : createMotionValue(value)

    motionValue.start(animateMotionValue("", motionValue, keyframes, options))

    return motionValue.animation!
}

import { cubicBezier } from "./cubic-bezier"
import { mirrorEasing } from "./modifiers/mirror"
import { reverseEasing } from "./modifiers/reverse"

export const backOut = /*@__PURE__*/ cubicBezier(0.33, 1.53, 0.69, 0.99)
export const backIn = /*@__PURE__*/ reverseEasing(backOut)
export const backInOut = /*@__PURE__*/ mirrorEasing(backIn)

import type { Box } from "motion-utils"
import { parseValueFromTransform } from "../../../render/dom/parse-transform"
import { transformPropOrder } from "../../../render/utils/keys-transform"
import { MotionValue } from "../../../value"
import { number } from "../../../value/types/numbers"
import { px } from "../../../value/types/numbers/units"
import { ValueType } from "../../../value/types/types"
import { AnyResolvedKeyframe } from "../../types"
import { WithRender } from "../types"

export const isNumOrPxType = (v?: ValueType): v is ValueType =>
    v === number || v === px

type GetActualMeasurementInPixels = (
    bbox: Box,
    computedStyle: Partial<CSSStyleDeclaration>
) => number

const transformKeys = new Set(["x", "y", "z"])
const nonTranslationalTransformKeys = transformPropOrder.filter(
    (key) => !transformKeys.has(key)
)

type RemovedTransforms = [string, AnyResolvedKeyframe][]
export function removeNonTranslationalTransform(visualElement: WithRender) {
    const removedTransforms: RemovedTransforms = []

    nonTranslationalTransformKeys.forEach((key) => {
        const value: MotionValue<AnyResolvedKeyframe> | undefined =
            visualElement.getValue(key)
        if (value !== undefined) {
            removedTransforms.push([key, value.get()])
            value.set(key.startsWith("scale") ? 1 : 0)
        }
    })

    return removedTransforms
}

export const positionalValues: { [key: string]: GetActualMeasurementInPixels } =
    {
        // Dimensions
        width: (
            { x },
            { paddingLeft = "0", paddingRight = "0", boxSizing }
        ) => {
            const width = x.max - x.min
            return boxSizing === "border-box"
                ? width
                : width - parseFloat(paddingLeft) - parseFloat(paddingRight)
        },
        height: (
            { y },
            { paddingTop = "0", paddingBottom = "0", boxSizing }
        ) => {
            const height = y.max - y.min
            return boxSizing === "border-box"
                ? height
                : height - parseFloat(paddingTop) - parseFloat(paddingBottom)
        },

        top: (_bbox, { top }) => parseFloat(top as string),
        left: (_bbox, { left }) => parseFloat(left as string),
        bottom: ({ y }, { top }) => parseFloat(top as string) + (y.max - y.min),
        right: ({ x }, { left }) =>
            parseFloat(left as string) + (x.max - x.min),

        // Transform
        x: (_bbox, { transform }) => parseValueFromTransform(transform, "x"),
        y: (_bbox, { transform }) => parseValueFromTransform(transform, "y"),
    }

// Alias translate longform names
positionalValues.translateX = positionalValues.x
positionalValues.translateY = positionalValues.y

import { complex } from "../complex"
import { filter } from "../complex/filter"
import { mask } from "../complex/mask"
import { getDefaultValueType } from "../maps/defaults"

const customTypes = /*@__PURE__*/ new Set([filter, mask])

export function getAnimatableNone(key: string, value: string) {
    let defaultValueType = getDefaultValueType(key)
    if (!customTypes.has(defaultValueType as any)) defaultValueType = complex
    // If value is not recognised as animatable, ie "none", create an animatable version origin based on the target
    return defaultValueType.getAnimatableNone
        ? defaultValueType.getAnimatableNone(value)
        : undefined
}

import { HSLA, RGBA } from "../types"
import { hex } from "./hex"
import { hsla } from "./hsla"
import { rgba } from "./rgba"

export const color = {
    test: (v: any) => rgba.test(v) || hex.test(v) || hsla.test(v),
    parse: (v: any): RGBA | HSLA => {
        if (rgba.test(v)) {
            return rgba.parse(v)
        } else if (hsla.test(v)) {
            return hsla.parse(v)
        } else {
            return hex.parse(v)
        }
    },
    transform: (v: HSLA | RGBA | string) => {
        return typeof v === "string"
            ? v
            : v.hasOwnProperty("red")
            ? rgba.transform(v as RGBA)
            : hsla.transform(v as HSLA)
    },
    getAnimatableNone: (v: string) => {
        const parsed = color.parse(v)
        parsed.alpha = 0
        return color.transform(parsed)
    },
}

import { isSVGElement } from "../utils/is-svg-element"
import { ElementOrSelector, resolveElements } from "../utils/resolve-elements"
import { ResizeHandler } from "./types"

const resizeHandlers = new WeakMap<Element, Set<ResizeHandler<Element>>>()

let observer: ResizeObserver | undefined

const getSize =
    (
        borderBoxAxis: "inline" | "block",
        svgAxis: "width" | "height",
        htmlAxis: "offsetWidth" | "offsetHeight"
    ) =>
    (target: Element, borderBoxSize?: ReadonlyArray<ResizeObserverSize>) => {
        if (borderBoxSize && borderBoxSize[0]) {
            return borderBoxSize[0][
                (borderBoxAxis + "Size") as keyof ResizeObserverSize
            ]
        } else if (isSVGElement(target) && "getBBox" in target) {
            return (target as SVGGraphicsElement).getBBox()[svgAxis]
        } else {
            return (target as HTMLElement)[htmlAxis]
        }
    }

const getWidth = /*@__PURE__*/ getSize("inline", "width", "offsetWidth")
const getHeight = /*@__PURE__*/ getSize("block", "height", "offsetHeight")

function notifyTarget({ target, borderBoxSize }: ResizeObserverEntry) {
    resizeHandlers.get(target)?.forEach((handler) => {
        handler(target, {
            get width() {
                return getWidth(target, borderBoxSize)
            },
            get height() {
                return getHeight(target, borderBoxSize)
            },
        })
    })
}

function notifyAll(entries: ResizeObserverEntry[]) {
    entries.forEach(notifyTarget)
}

function createResizeObserver() {
    if (typeof ResizeObserver === "undefined") return

    observer = new ResizeObserver(notifyAll)
}

export function resizeElement(
    target: ElementOrSelector,
    handler: ResizeHandler<Element>
) {
    if (!observer) createResizeObserver()

    const elements = resolveElements(target)

    elements.forEach((element) => {
        let elementHandlers = resizeHandlers.get(element)

        if (!elementHandlers) {
            elementHandlers = new Set()
            resizeHandlers.set(element, elementHandlers)
        }

        elementHandlers.add(handler)
        observer?.observe(element)
    })

    return () => {
        elements.forEach((element) => {
            const elementHandlers = resizeHandlers.get(element)

            elementHandlers?.delete(handler)

            if (!elementHandlers?.size) {
                observer?.unobserve(element)
            }
        })
    }
}

import { Feature, frame, press, type VisualElement } from "motion-dom"
import { extractEventInfo } from "../events/event-info"

function handlePressEvent(
    node: VisualElement<Element>,
    event: PointerEvent,
    lifecycle: "Start" | "End" | "Cancel"
) {
    const { props } = node

    if (node.current instanceof HTMLButtonElement && node.current.disabled) {
        return
    }

    if (node.animationState && props.whileTap) {
        node.animationState.setActive("whileTap", lifecycle === "Start")
    }

    const eventName = ("onTap" + (lifecycle === "End" ? "" : lifecycle)) as
        | "onTapStart"
        | "onTap"
        | "onTapCancel"

    const callback = props[eventName]
    if (callback) {
        frame.postRender(() => callback(event, extractEventInfo(event)))
    }
}

export class PressGesture extends Feature<Element> {
    mount() {
        const { current } = this.node
        if (!current) return

        const { globalTapTarget, propagate } = this.node.props

        this.unmount = press(
            current,
            (_element, startEvent) => {
                handlePressEvent(this.node, startEvent, "Start")

                return (endEvent, { success }) =>
                    handlePressEvent(
                        this.node,
                        endEvent,
                        success ? "End" : "Cancel"
                    )
            },
            {
                useGlobalTarget: globalTapTarget,
                stopPropagation: propagate?.tap === false,
            }
        )
    }

    unmount() {}
}

import {
    clamp,
    EasingFunction,
    invariant,
    MotionGlobalConfig,
    noop,
    pipe,
    progress,
} from "motion-utils"
import { mix } from "./mix"
import { Mixer, MixerFactory } from "./mix/types"

export interface InterpolateOptions<T> {
    clamp?: boolean
    ease?: EasingFunction | EasingFunction[]
    mixer?: MixerFactory<T>
}

function createMixers<T>(
    output: T[],
    ease?: EasingFunction | EasingFunction[],
    customMixer?: MixerFactory<T>
) {
    const mixers: Array<Mixer<T>> = []
    const mixerFactory: MixerFactory<T> =
        customMixer || MotionGlobalConfig.mix || mix
    const numMixers = output.length - 1

    for (let i = 0; i < numMixers; i++) {
        let mixer = mixerFactory(output[i], output[i + 1])

        if (ease) {
            const easingFunction = Array.isArray(ease) ? ease[i] || noop : ease
            mixer = pipe(easingFunction, mixer) as Mixer<T>
        }

        mixers.push(mixer)
    }

    return mixers
}

/**
 * Create a function that maps from a numerical input array to a generic output array.
 *
 * Accepts:
 *   - Numbers
 *   - Colors (hex, hsl, hsla, rgb, rgba)
 *   - Complex (combinations of one or more numbers or strings)
 *
 * ```jsx
 * const mixColor = interpolate([0, 1], ['#fff', '#000'])
 *
 * mixColor(0.5) // 'rgba(128, 128, 128, 1)'
 * ```
 *
 * TODO Revisit this approach once we've moved to data models for values,
 * probably not needed to pregenerate mixer functions.
 *
 * @public
 */
export function interpolate<T>(
    input: number[],
    output: T[],
    { clamp: isClamp = true, ease, mixer }: InterpolateOptions<T> = {}
): (v: number) => T {
    const inputLength = input.length

    invariant(
        inputLength === output.length,
        "Both input and output ranges must be the same length",
        "range-length"
    )

    /**
     * If we're only provided a single input, we can just make a function
     * that returns the output.
     */
    if (inputLength === 1) return () => output[0]
    if (inputLength === 2 && output[0] === output[1]) return () => output[1]

    const isZeroDeltaRange = input[0] === input[1]

    // If input runs highest -> lowest, reverse both arrays
    if (input[0] > input[inputLength - 1]) {
        input = [...input].reverse()
        output = [...output].reverse()
    }

    const mixers = createMixers(output, ease, mixer)
    const numMixers = mixers.length

    const interpolator = (v: number): T => {
        if (isZeroDeltaRange && v < input[0]) return output[0]

        let i = 0

        if (numMixers > 1) {
            for (; i < input.length - 2; i++) {
                if (v < input[i + 1]) break
            }
        }

        const progressInRange = progress(input[i], input[i + 1], v)

        return mixers[i](progressInRange)
    }

    return isClamp
        ? (v: number) =>
              interpolator(clamp(input[0], input[inputLength - 1], v))
        : interpolator
}

import { resolveVariant } from "../../render/utils/resolve-dynamic-variants"
import { calcChildStagger } from "../utils/calc-child-stagger"
import type { VisualElementAnimationOptions } from "./types"
import { animateTarget } from "./visual-element-target"
import type { DynamicOption } from "../types"
import type { VisualElement } from "../../render/VisualElement"

export function animateVariant(
    visualElement: VisualElement,
    variant: string,
    options: VisualElementAnimationOptions = {}
): Promise<any> {
    const resolved = resolveVariant(
        visualElement,
        variant,
        options.type === "exit"
            ? visualElement.presenceContext?.custom
            : undefined
    )

    let { transition = visualElement.getDefaultTransition() || {} } =
        resolved || {}

    if (options.transitionOverride) {
        transition = options.transitionOverride
    }

    /**
     * If we have a variant, create a callback that runs it as an animation.
     * Otherwise, we resolve a Promise immediately for a composable no-op.
     */
    const getAnimation: () => Promise<any> = resolved
        ? () => Promise.all(animateTarget(visualElement, resolved, options))
        : () => Promise.resolve()

    /**
     * If we have children, create a callback that runs all their animations.
     * Otherwise, we resolve a Promise immediately for a composable no-op.
     */
    const getChildAnimations =
        visualElement.variantChildren && visualElement.variantChildren.size
            ? (forwardDelay = 0) => {
                  const {
                      delayChildren = 0,
                      staggerChildren,
                      staggerDirection,
                  } = transition

                  return animateChildren(
                      visualElement,
                      variant,
                      forwardDelay,
                      delayChildren,
                      staggerChildren,
                      staggerDirection,
                      options
                  )
              }
            : () => Promise.resolve()

    /**
     * If the transition explicitly defines a "when" option, we need to resolve either
     * this animation or all children animations before playing the other.
     */
    const { when } = transition
    if (when) {
        const [first, last] =
            when === "beforeChildren"
                ? [getAnimation, getChildAnimations]
                : [getChildAnimations, getAnimation]

        return first().then(() => last())
    } else {
        return Promise.all([getAnimation(), getChildAnimations(options.delay)])
    }
}

function animateChildren(
    visualElement: VisualElement,
    variant: string,
    delay: number = 0,
    delayChildren: number | DynamicOption<number> = 0,
    staggerChildren = 0,
    staggerDirection = 1,
    options: VisualElementAnimationOptions
) {
    const animations: Promise<any>[] = []

    for (const child of visualElement.variantChildren!) {
        child.notify("AnimationStart", variant)
        animations.push(
            animateVariant(child, variant, {
                ...options,
                delay:
                    delay +
                    (typeof delayChildren === "function" ? 0 : delayChildren) +
                    calcChildStagger(
                        visualElement.variantChildren!,
                        child,
                        delayChildren,
                        staggerChildren,
                        staggerDirection
                    ),
            }).then(() => child.notify("AnimationComplete", variant))
        )
    }

    return Promise.all(animations)
}

import { complex } from "."
import { AnyResolvedKeyframe } from "../../../animation/types"

export const mask = {
    ...complex,
    getAnimatableNone: (v: AnyResolvedKeyframe) => {
        const parsed = complex.parse(v)
        const transformer = complex.createTransformer(v)
        return transformer(
            parsed.map((v) =>
                typeof v === "number" ? 0 : typeof v === "object" ? { ...v, alpha: 1 } : v
            )
        )
    },
}

import { addDomEvent } from "../../events/add-dom-event"
import { createProjectionNode } from "./create-projection-node"

export const DocumentProjectionNode = createProjectionNode<Window>({
    attachResizeListener: (
        ref: Window | Element,
        notify: VoidFunction
    ): VoidFunction => addDomEvent(ref, "resize", notify),
    measureScroll: () => ({
        x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
        y: document.documentElement.scrollTop || document.body?.scrollTop || 0,
    }),
    checkIsScrollRoot: () => true,
})

import { getValueAsType } from "../../../value/types/utils/get-as-type"
import { numberValueTypes } from "../../../value/types/maps/number"
import { transformProps } from "../../utils/keys-transform"
import { isCSSVariableName } from "../../../animation/utils/is-css-variable"
import { ResolvedValues } from "../../types"
import { HTMLRenderState } from "../types"
import { buildTransform } from "./build-transform"
import type { MotionNodeOptions } from "../../../node/types"

export function buildHTMLStyles(
    state: HTMLRenderState,
    latestValues: ResolvedValues,
    transformTemplate?: MotionNodeOptions["transformTemplate"]
) {
    const { style, vars, transformOrigin } = state

    // Track whether we encounter any transform or transformOrigin values.
    let hasTransform = false
    let hasTransformOrigin = false

    /**
     * Loop over all our latest animated values and decide whether to handle them
     * as a style or CSS variable.
     *
     * Transforms and transform origins are kept separately for further processing.
     */
    for (const key in latestValues) {
        const value = latestValues[key]

        if (transformProps.has(key)) {
            // If this is a transform, flag to enable further transform processing
            hasTransform = true
            continue
        } else if (isCSSVariableName(key)) {
            vars[key] = value
            continue
        } else {
            // Convert the value to its default value type, ie 0 -> "0px"
            const valueAsType = getValueAsType(value, numberValueTypes[key])

            if (key.startsWith("origin")) {
                // If this is a transform origin, flag and enable further transform-origin processing
                hasTransformOrigin = true
                transformOrigin[key as keyof typeof transformOrigin] =
                    valueAsType
            } else {
                style[key] = valueAsType
            }
        }
    }

    if (!latestValues.transform) {
        if (hasTransform || transformTemplate) {
            style.transform = buildTransform(
                latestValues,
                state.transform,
                transformTemplate
            )
        } else if (style.transform) {
            /**
             * If we have previously created a transform but currently don't have any,
             * reset transform style to none.
             */
            style.transform = "none"
        }
    }

    /**
     * Build a transformOrigin style. Uses the same defaults as the browser for
     * undefined origins.
     */
    if (hasTransformOrigin) {
        const {
            originX = "50%",
            originY = "50%",
            originZ = 0,
        } = transformOrigin
        style.transformOrigin = `${originX} ${originY} ${originZ}`
    }
}

import { memoSupports } from "./memo"

export const supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
    try {
        document
            .createElement("div")
            .animate({ opacity: 0 }, { easing: "linear(0, 1)" })
    } catch (e) {
        return false
    }
    return true
}, "linearEasing")

import type { MotionNodeOptions } from "../../node/types"
import { isAnimationControls } from "./is-animation-controls"
import { isVariantLabel } from "./is-variant-label"
import { variantProps } from "./variant-props"

export function isControllingVariants(props: MotionNodeOptions) {
    return (
        isAnimationControls(props.animate) ||
        variantProps.some((name) =>
            isVariantLabel(props[name as keyof typeof props])
        )
    )
}

export function isVariantNode(props: MotionNodeOptions) {
    return Boolean(isControllingVariants(props) || props.variants)
}

import type { EventInfo, PanHandler } from "motion-dom"
import { cancelFrame, frame, frameData, isPrimaryPointer } from "motion-dom"
import {
    millisecondsToSeconds,
    pipe,
    Point,
    secondsToMilliseconds,
    TransformPoint,
} from "motion-utils"
import { addPointerEvent } from "../../events/add-pointer-event"
import { extractEventInfo } from "../../events/event-info"
import { distance2D } from "../../utils/distance"

interface PanSessionHandlers {
    onSessionStart: PanHandler
    onStart: PanHandler
    onMove: PanHandler
    onEnd: PanHandler
    onSessionEnd: PanHandler
    resumeAnimation: () => void
}

interface PanSessionOptions {
    transformPagePoint?: TransformPoint
    dragSnapToOrigin?: boolean | "x" | "y"
    distanceThreshold?: number
    contextWindow?: (Window & typeof globalThis) | null
    /**
     * Element being dragged. When provided, scroll events on its
     * ancestors and window are compensated so the gesture continues
     * smoothly during scroll.
     */
    element?: HTMLElement | null
}

interface TimestampedPoint extends Point {
    timestamp: number
}

const overflowStyles = /*#__PURE__*/ new Set(["auto", "scroll"])

/**
 * @internal
 */
export class PanSession {
    /**
     * @internal
     */
    private history: TimestampedPoint[]

    /**
     * @internal
     */
    private startEvent: PointerEvent | null = null

    /**
     * @internal
     */
    private lastMoveEvent: PointerEvent | null = null

    /**
     * @internal
     */
    private lastMoveEventInfo: EventInfo | null = null

    /**
     * Raw (untransformed) event info, re-transformed each frame
     * so transformPagePoint sees the current parent matrix.
     * @internal
     */
    private lastRawMoveEventInfo: EventInfo | null = null

    /**
     * @internal
     */
    private transformPagePoint?: TransformPoint

    /**
     * @internal
     */
    private handlers: Partial<PanSessionHandlers> = {}

    /**
     * @internal
     */
    private removeListeners: Function

    /**
     * For determining if an animation should resume after it is interupted
     *
     * @internal
     */
    private dragSnapToOrigin: boolean | "x" | "y"

    /**
     * The distance after which panning should start.
     *
     * @internal
     */
    private distanceThreshold: number

    /**
     * @internal
     */
    private contextWindow: PanSessionOptions["contextWindow"] = window

    /**
     * Scroll positions of scrollable ancestors and window.
     * @internal
     */
    private scrollPositions: Map<Element | Window, Point> = new Map()

    /**
     * Cleanup function for scroll listeners.
     * @internal
     */
    private removeScrollListeners: (() => void) | null = null

    constructor(
        event: PointerEvent,
        handlers: Partial<PanSessionHandlers>,
        {
            transformPagePoint,
            contextWindow = window,
            dragSnapToOrigin = false,
            distanceThreshold = 3,
            element,
        }: PanSessionOptions = {}
    ) {
        // If we have more than one touch, don't start detecting this gesture
        if (!isPrimaryPointer(event)) return

        this.dragSnapToOrigin = dragSnapToOrigin
        this.handlers = handlers
        this.transformPagePoint = transformPagePoint
        this.distanceThreshold = distanceThreshold
        this.contextWindow = contextWindow || window

        const info = extractEventInfo(event)
        const initialInfo = transformPoint(info, this.transformPagePoint)
        const { point } = initialInfo

        const { timestamp } = frameData

        this.history = [{ ...point, timestamp }]

        const { onSessionStart } = handlers
        onSessionStart &&
            onSessionStart(event, getPanInfo(initialInfo, this.history))

        // Listen in the capture phase so a descendant calling
        // stopPropagation() (e.g. in its own pointerup handler) can't
        // prevent the gesture from ending. See #2794.
        const eventOptions = { passive: true, capture: true }
        this.removeListeners = pipe(
            addPointerEvent(
                this.contextWindow,
                "pointermove",
                this.handlePointerMove,
                eventOptions
            ),
            addPointerEvent(
                this.contextWindow,
                "pointerup",
                this.handlePointerUp,
                eventOptions
            ),
            addPointerEvent(
                this.contextWindow,
                "pointercancel",
                this.handlePointerUp,
                eventOptions
            )
        )

        // Start scroll tracking if element provided
        if (element) {
            this.startScrollTracking(element)
        }
    }

    /**
     * Start tracking scroll on ancestors and window.
     */
    private startScrollTracking(element: HTMLElement): void {
        // Store initial scroll positions for scrollable ancestors
        let current = element.parentElement
        while (current) {
            const style = getComputedStyle(current)
            if (
                overflowStyles.has(style.overflowX) ||
                overflowStyles.has(style.overflowY)
            ) {
                this.scrollPositions.set(current, {
                    x: current.scrollLeft,
                    y: current.scrollTop,
                })
            }
            current = current.parentElement
        }

        // Track window scroll
        this.scrollPositions.set(window, {
            x: window.scrollX,
            y: window.scrollY,
        })

        // Capture listener catches element scroll events as they bubble
        window.addEventListener("scroll", this.onElementScroll, {
            capture: true,
        })

        // Direct window scroll listener (window scroll doesn't bubble)
        window.addEventListener("scroll", this.onWindowScroll)

        this.removeScrollListeners = () => {
            window.removeEventListener("scroll", this.onElementScroll, {
                capture: true,
            })
            window.removeEventListener("scroll", this.onWindowScroll)
        }
    }

    private onElementScroll = (event: Event): void => {
        this.handleScroll(event.target as Element)
    }

    private onWindowScroll = (): void => {
        this.handleScroll(window)
    }

    /**
     * Handle scroll compensation during drag.
     *
     * For element scroll: adjusts history origin since pageX/pageY doesn't change.
     * For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
     */
    private handleScroll(target: Element | Window): void {
        const initial = this.scrollPositions.get(target)
        if (!initial) return

        const isWindow = target === window
        const current = isWindow
            ? { x: window.scrollX, y: window.scrollY }
            : {
                  x: (target as Element).scrollLeft,
                  y: (target as Element).scrollTop,
              }

        const delta = { x: current.x - initial.x, y: current.y - initial.y }
        if (delta.x === 0 && delta.y === 0) return

        if (isWindow) {
            // Window scroll: pageX/pageY changes, so update lastMoveEventInfo
            if (this.lastMoveEventInfo) {
                this.lastMoveEventInfo.point.x += delta.x
                this.lastMoveEventInfo.point.y += delta.y
            }
        } else {
            // Element scroll: pageX/pageY unchanged, so adjust history origin
            if (this.history.length > 0) {
                this.history[0].x -= delta.x
                this.history[0].y -= delta.y
            }
        }

        this.scrollPositions.set(target, current)
        frame.update(this.updatePoint, true)
    }

    private updatePoint = () => {
        if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return

        // Re-transform raw point through current transformPagePoint so
        // animated parent transforms (e.g. rotation) are picked up each frame
        if (this.lastRawMoveEventInfo) {
            this.lastMoveEventInfo = transformPoint(
                this.lastRawMoveEventInfo,
                this.transformPagePoint
            )
        }

        const info = getPanInfo(this.lastMoveEventInfo, this.history)
        const isPanStarted = this.startEvent !== null

        // Only start panning if the offset is larger than 3 pixels. If we make it
        // any larger than this we'll want to reset the pointer history
        // on the first update to avoid visual snapping to the cursor.
        const isDistancePastThreshold =
            distance2D(info.offset, { x: 0, y: 0 }) >= this.distanceThreshold

        if (!isPanStarted && !isDistancePastThreshold) return

        const { point } = info
        const { timestamp } = frameData
        this.history.push({ ...point, timestamp })

        const { onStart, onMove } = this.handlers

        if (!isPanStarted) {
            onStart && onStart(this.lastMoveEvent, info)
            this.startEvent = this.lastMoveEvent
        }

        onMove && onMove(this.lastMoveEvent, info)
    }

    private handlePointerMove = (event: PointerEvent, info: EventInfo) => {
        this.lastMoveEvent = event
        this.lastRawMoveEventInfo = info
        this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint)

        // Throttle mouse move event to once per frame
        frame.update(this.updatePoint, true)
    }

    private handlePointerUp = (event: PointerEvent, info: EventInfo) => {
        this.end()

        const { onEnd, onSessionEnd, resumeAnimation } = this.handlers

        // Resume animation if dragSnapToOrigin is set OR if no drag started (user just clicked)
        // This ensures constraint animations continue when interrupted by a click
        if (this.dragSnapToOrigin || !this.startEvent) {
            resumeAnimation && resumeAnimation()
        }
        if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return

        const panInfo = getPanInfo(
            event.type === "pointercancel"
                ? this.lastMoveEventInfo
                : transformPoint(info, this.transformPagePoint),
            this.history
        )

        if (this.startEvent && onEnd) {
            onEnd(event, panInfo)
        }

        onSessionEnd && onSessionEnd(event, panInfo)
    }

    updateHandlers(handlers: Partial<PanSessionHandlers>) {
        this.handlers = handlers
    }

    end() {
        this.removeListeners && this.removeListeners()
        this.removeScrollListeners && this.removeScrollListeners()
        this.scrollPositions.clear()
        cancelFrame(this.updatePoint)
    }
}

function transformPoint(
    info: EventInfo,
    transformPagePoint?: (point: Point) => Point
) {
    return transformPagePoint ? { point: transformPagePoint(info.point) } : info
}

function subtractPoint(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y }
}

function getPanInfo({ point }: EventInfo, history: TimestampedPoint[]) {
    return {
        point,
        delta: subtractPoint(point, lastDevicePoint(history)),
        offset: subtractPoint(point, startDevicePoint(history)),
        velocity: getVelocity(history, 0.1),
    }
}

function startDevicePoint(history: TimestampedPoint[]): TimestampedPoint {
    return history[0]
}

function lastDevicePoint(history: TimestampedPoint[]): TimestampedPoint {
    return history[history.length - 1]
}

function getVelocity(history: TimestampedPoint[], timeDelta: number): Point {
    if (history.length < 2) {
        return { x: 0, y: 0 }
    }

    let i = history.length - 1
    let timestampedPoint: TimestampedPoint | null = null
    const lastPoint = lastDevicePoint(history)
    while (i >= 0) {
        timestampedPoint = history[i]
        if (
            lastPoint.timestamp - timestampedPoint.timestamp >
            secondsToMilliseconds(timeDelta)
        ) {
            break
        }
        i--
    }

    if (!timestampedPoint) {
        return { x: 0, y: 0 }
    }

    /**
     * If the selected point is the pointer-down origin (history[0]),
     * there are better movement points available, and the time gap
     * is suspiciously large (>2x timeDelta), use the next point instead.
     * This prevents stale pointer-down points from diluting velocity
     * in hold-then-flick gestures.
     */
    if (
        timestampedPoint === history[0] &&
        history.length > 2 &&
        lastPoint.timestamp - timestampedPoint.timestamp >
            secondsToMilliseconds(timeDelta) * 2
    ) {
        timestampedPoint = history[1]
    }

    const time = millisecondsToSeconds(
        lastPoint.timestamp - timestampedPoint.timestamp
    )
    if (time === 0) {
        return { x: 0, y: 0 }
    }

    const currentVelocity = {
        x: (lastPoint.x - timestampedPoint.x) / time,
        y: (lastPoint.y - timestampedPoint.y) / time,
    }

    if (currentVelocity.x === Infinity) {
        currentVelocity.x = 0
    }
    if (currentVelocity.y === Infinity) {
        currentVelocity.y = 0
    }

    return currentVelocity
}

import {
    easeInOut,
    easingDefinitionToFunction,
    EasingFunction,
    isEasingArray,
} from "motion-utils"
import { interpolate } from "../../utils/interpolate"
import { defaultOffset } from "../keyframes/offsets/default"
import { convertOffsetToTimes } from "../keyframes/offsets/time"
import {
    AnimationState,
    AnyResolvedKeyframe,
    KeyframeGenerator,
    ValueAnimationOptions,
} from "../types"

export function defaultEasing(
    values: any[],
    easing?: EasingFunction
): EasingFunction[] {
    return values.map(() => easing || easeInOut).splice(0, values.length - 1)
}

export function keyframes<T extends AnyResolvedKeyframe>({
    duration = 300,
    keyframes: keyframeValues,
    times,
    ease = "easeInOut",
}: ValueAnimationOptions<T>): KeyframeGenerator<T> {
    /**
     * Easing functions can be externally defined as strings. Here we convert them
     * into actual functions.
     */
    const easingFunctions = isEasingArray(ease)
        ? ease.map(easingDefinitionToFunction)
        : easingDefinitionToFunction(ease)

    /**
     * This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
     * to reduce GC during animation.
     */
    const state: AnimationState<T> = {
        done: false,
        value: keyframeValues[0],
    }

    /**
     * Create a times array based on the provided 0-1 offsets
     */
    const absoluteTimes = convertOffsetToTimes(
        // Only use the provided offsets if they're the correct length
        // TODO Maybe we should warn here if there's a length mismatch
        times && times.length === keyframeValues.length
            ? times
            : defaultOffset(keyframeValues),
        duration
    )

    const mapTimeToKeyframe = interpolate<T>(absoluteTimes, keyframeValues, {
        ease: Array.isArray(easingFunctions)
            ? easingFunctions
            : defaultEasing(keyframeValues, easingFunctions),
    })

    return {
        calculatedDuration: duration,
        next: (t: number) => {
            state.value = mapTimeToKeyframe(t)
            state.done = t >= duration
            return state
        },
    }
}

import { mixNumber } from "../../utils/mix/number"
import { percent, px } from "../../value/types/numbers/units"
import type { AnyResolvedKeyframe } from "../../animation/types"
import {
    progress as calcProgress,
    circOut,
    EasingFunction,
    noop,
} from "motion-utils"
import type { ResolvedValues } from "../../node/types"
import { cornerRadiusProps } from "../../utils/border-radius"

const numBorders = cornerRadiusProps.length

const asNumber = (value: AnyResolvedKeyframe) =>
    typeof value === "string" ? parseFloat(value) : value

const isPx = (value: AnyResolvedKeyframe) =>
    typeof value === "number" || px.test(value)

export function mixValues(
    target: ResolvedValues,
    follow: ResolvedValues,
    lead: ResolvedValues,
    progress: number,
    shouldCrossfadeOpacity: boolean,
    isOnlyMember: boolean
) {
    if (shouldCrossfadeOpacity) {
        target.opacity = mixNumber(
            0,
            (lead.opacity as number) ?? 1,
            easeCrossfadeIn(progress)
        )
        target.opacityExit = mixNumber(
            (follow.opacity as number) ?? 1,
            0,
            easeCrossfadeOut(progress)
        )
    } else if (isOnlyMember) {
        target.opacity = mixNumber(
            (follow.opacity as number) ?? 1,
            (lead.opacity as number) ?? 1,
            progress
        )
    }

    /**
     * Mix border radius
     */
    for (let i = 0; i < numBorders; i++) {
        const borderLabel = cornerRadiusProps[i]
        let followRadius = getRadius(follow, borderLabel)
        let leadRadius = getRadius(lead, borderLabel)

        if (followRadius === undefined && leadRadius === undefined) continue

        followRadius ||= 0
        leadRadius ||= 0

        const canMix =
            followRadius === 0 ||
            leadRadius === 0 ||
            isPx(followRadius) === isPx(leadRadius)

        if (canMix) {
            target[borderLabel] = Math.max(
                mixNumber(
                    asNumber(followRadius),
                    asNumber(leadRadius),
                    progress
                ),
                0
            )

            if (percent.test(leadRadius) || percent.test(followRadius)) {
                target[borderLabel] += "%"
            }
        } else {
            target[borderLabel] = leadRadius
        }
    }

    /**
     * Mix rotation
     */
    if (follow.rotate || lead.rotate) {
        target.rotate = mixNumber(
            (follow.rotate as number) || 0,
            (lead.rotate as number) || 0,
            progress
        )
    }
}

function getRadius(values: ResolvedValues, radiusName: string) {
    return values[radiusName] !== undefined
        ? values[radiusName]
        : values.borderRadius
}

const easeCrossfadeIn = /*@__PURE__*/ compress(0, 0.5, circOut)
const easeCrossfadeOut = /*@__PURE__*/ compress(0.5, 0.95, noop)

function compress(
    min: number,
    max: number,
    easing: EasingFunction
): EasingFunction {
    return (p: number) => {
        // Could replace ifs with clamp
        if (p < min) return 0
        if (p > max) return 1
        return easing(calcProgress(min, max, p))
    }
}

import { complex } from "."
import { floatRegex } from "../utils/float-regex"

/**
 * Properties that should default to 1 or 100%
 */
const maxDefaults = new Set(["brightness", "contrast", "saturate", "opacity"])

function applyDefaultFilter(v: string) {
    const [name, value] = v.slice(0, -1).split("(")

    if (name === "drop-shadow") return v

    const [number] = value.match(floatRegex) || []
    if (!number) return v

    const unit = value.replace(number, "")
    let defaultValue = maxDefaults.has(name) ? 1 : 0
    if (number !== value) defaultValue *= 100

    return name + "(" + defaultValue + unit + ")"
}

const functionRegex = /\b([a-z-]*)\(.*?\)/gu

export const filter = {
    ...complex,
    getAnimatableNone: (v: string) => {
        const functions = v.match(functionRegex)
        return functions ? functions.map(applyDefaultFilter).join(" ") : v
    },
}

import { progress } from "motion-utils"
import { mixNumber } from "../../../utils/mix/number"

export function fillOffset(offset: number[], remaining: number): void {
    const min = offset[offset.length - 1]
    for (let i = 1; i <= remaining; i++) {
        const offsetProgress = progress(0, remaining, i)
        offset.push(mixNumber(min, 1, offsetProgress))
    }
}

import { transformProps } from "./keys-transform"
import type { MotionNodeOptions } from "../../node/types"
import {
    scaleCorrectors,
    addScaleCorrector,
} from "../../projection/styles/scale-correction"

export { scaleCorrectors, addScaleCorrector }

export function isForcedMotionValue(
    key: string,
    { layout, layoutId }: MotionNodeOptions
) {
    return (
        transformProps.has(key) ||
        key.startsWith("origin") ||
        ((layout || layoutId !== undefined) &&
            (!!scaleCorrectors[key] || key === "opacity"))
    )
}

export class WithPromise {
    protected _finished: Promise<void>

    resolve: VoidFunction

    constructor() {
        this.updateFinished()
    }

    get finished() {
        return this._finished
    }

    protected updateFinished() {
        this._finished = new Promise<void>((resolve) => {
            this.resolve = resolve
        })
    }

    protected notifyFinished() {
        this.resolve()
    }

    /**
     * Allows the animation to be awaited.
     *
     * @deprecated Use `finished` instead.
     */
    then(onResolve: VoidFunction, onReject?: VoidFunction) {
        return this.finished.then(onResolve, onReject)
    }
}

import { addUniqueItem, removeItem } from "motion-utils"
import type { IProjectionNode } from "../node/types"

export class NodeStack {
    lead?: IProjectionNode
    prevLead?: IProjectionNode
    members: IProjectionNode[] = []

    add(node: IProjectionNode) {
        addUniqueItem(this.members, node)

        for (let i = this.members.length - 1; i >= 0; i--) {
            const member = this.members[i]
            if (member === node || member === this.lead || member === this.prevLead) continue
            const inst = member.instance as HTMLElement | undefined
            if ((!inst || inst.isConnected === false) && !member.snapshot) {
                removeItem(this.members, member)
                member.unmount()
            }
        }

        node.scheduleRender()
    }

    remove(node: IProjectionNode) {
        removeItem(this.members, node)
        if (node === this.prevLead) this.prevLead = undefined
        if (node === this.lead) {
            const prevLead = this.members[this.members.length - 1]
            if (prevLead) this.promote(prevLead)
        }
    }

    relegate(node: IProjectionNode) {
        for (let i = this.members.indexOf(node) - 1; i >= 0; i--) {
            const member = this.members[i]
            if (member.isPresent !== false && (member.instance as HTMLElement)?.isConnected !== false) {
                this.promote(member)
                return true
            }
        }
        return false
    }

    promote(node: IProjectionNode, preserveFollowOpacity?: boolean) {
        const prevLead = this.lead
        if (node === prevLead) return

        this.prevLead = prevLead
        this.lead = node
        node.show()

        if (prevLead) {
            prevLead.updateSnapshot()
            node.scheduleRender()

            const { layoutDependency: prevDep } = prevLead.options
            const { layoutDependency: nextDep } = node.options

            if (prevDep === undefined || prevDep !== nextDep) {
                node.resumeFrom = prevLead
                if (preserveFollowOpacity) prevLead.preserveOpacity = true

                if (prevLead.snapshot) {
                    node.snapshot = prevLead.snapshot
                    node.snapshot.latestValues =
                        prevLead.animationValues || prevLead.latestValues
                }

                if (node.root?.isUpdating) node.isLayoutDirty = true
            }
            if (node.options.crossfade === false) prevLead.hide()
        }
    }

    exitAnimationComplete() {
        this.members.forEach((member) => {
            member.options.onExitComplete?.()
            member.resumingFrom?.options.onExitComplete?.()
        })
    }

    scheduleRender() {
        this.members.forEach(
            (member) => member.instance && member.scheduleRender(false)
        )
    }

    removeLeadSnapshot() {
        if (this.lead?.snapshot) this.lead.snapshot = undefined
    }
}

import { Axis, Box, Delta, Point } from "motion-utils"
import { mixNumber } from "../../utils/mix/number"
import { ResolvedValues } from "../../render/types"
import { hasTransform } from "../utils/has-transform"

/**
 * Scales a point based on a factor and an originPoint
 */
export function scalePoint(point: number, scale: number, originPoint: number) {
    const distanceFromOrigin = point - originPoint
    const scaled = scale * distanceFromOrigin
    return originPoint + scaled
}

/**
 * Applies a translate/scale delta to a point
 */
export function applyPointDelta(
    point: number,
    translate: number,
    scale: number,
    originPoint: number,
    boxScale?: number
): number {
    if (boxScale !== undefined) {
        point = scalePoint(point, boxScale, originPoint)
    }

    return scalePoint(point, scale, originPoint) + translate
}

/**
 * Applies a translate/scale delta to an axis
 */
export function applyAxisDelta(
    axis: Axis,
    translate: number = 0,
    scale: number = 1,
    originPoint: number,
    boxScale?: number
): void {
    axis.min = applyPointDelta(
        axis.min,
        translate,
        scale,
        originPoint,
        boxScale
    )

    axis.max = applyPointDelta(
        axis.max,
        translate,
        scale,
        originPoint,
        boxScale
    )
}

/**
 * Applies a translate/scale delta to a box
 */
export function applyBoxDelta(box: Box, { x, y }: Delta): void {
    applyAxisDelta(box.x, x.translate, x.scale, x.originPoint)
    applyAxisDelta(box.y, y.translate, y.scale, y.originPoint)
}

const TREE_SCALE_SNAP_MIN = 0.999999999999
const TREE_SCALE_SNAP_MAX = 1.0000000000001

/**
 * Apply a tree of deltas to a box. We do this to calculate the effect of all the transforms
 * in a tree upon our box before then calculating how to project it into our desired viewport-relative box
 *
 * This is the final nested loop within updateLayoutDelta for future refactoring
 */
export function applyTreeDeltas(
    box: Box,
    treeScale: Point,
    treePath: any[],
    isSharedTransition: boolean = false
) {
    const treeLength = treePath.length
    if (!treeLength) return

    // Reset the treeScale
    treeScale.x = treeScale.y = 1

    let node: any
    let delta: Delta | undefined

    for (let i = 0; i < treeLength; i++) {
        node = treePath[i]
        delta = node.projectionDelta

        /**
         * TODO: Prefer to remove this, but currently we have motion components with
         * display: contents in Framer.
         */
        const { visualElement } = node.options
        if (
            visualElement &&
            visualElement.props.style &&
            visualElement.props.style.display === "contents"
        ) {
            continue
        }

        if (
            isSharedTransition &&
            node.options.layoutScroll &&
            node.scroll &&
            node !== node.root
        ) {
            translateAxis(box.x, -node.scroll.offset.x)
            translateAxis(box.y, -node.scroll.offset.y)
        }

        if (delta) {
            // Incoporate each ancestor's scale into a cumulative treeScale for this component
            treeScale.x *= delta.x.scale
            treeScale.y *= delta.y.scale

            // Apply each ancestor's calculated delta into this component's recorded layout box
            applyBoxDelta(box, delta)
        }

        if (isSharedTransition && hasTransform(node.latestValues)) {
            transformBox(box, node.latestValues, node.layout?.layoutBox)
        }
    }

    /**
     * Snap tree scale back to 1 if it's within a non-perceivable threshold.
     * This will help reduce useless scales getting rendered.
     */
    if (
        treeScale.x < TREE_SCALE_SNAP_MAX &&
        treeScale.x > TREE_SCALE_SNAP_MIN
    ) {
        treeScale.x = 1.0
    }
    if (
        treeScale.y < TREE_SCALE_SNAP_MAX &&
        treeScale.y > TREE_SCALE_SNAP_MIN
    ) {
        treeScale.y = 1.0
    }
}

export function translateAxis(axis: Axis, distance: number) {
    axis.min += distance
    axis.max += distance
}

/**
 * Apply a transform to an axis from the latest resolved motion values.
 * This function basically acts as a bridge between a flat motion value map
 * and applyAxisDelta
 */
export function transformAxis(
    axis: Axis,
    axisTranslate?: number,
    axisScale?: number,
    boxScale?: number,
    axisOrigin: number = 0.5
): void {
    const originPoint = mixNumber(axis.min, axis.max, axisOrigin)

    // Apply the axis delta to the final axis
    applyAxisDelta(axis, axisTranslate, axisScale, originPoint, boxScale)
}

function resolveAxisTranslate(
    value: number | string | undefined,
    axis: Axis
): number | undefined {
    if (typeof value === "string") {
        return (parseFloat(value) / 100) * (axis.max - axis.min)
    }
    return value as number | undefined
}

/**
 * Apply a transform to a box from the latest resolved motion values.
 */
export function transformBox(
    box: Box,
    transform: ResolvedValues,
    sourceBox?: Box
) {
    const resolveBox = sourceBox ?? box
    transformAxis(
        box.x,
        resolveAxisTranslate(transform.x, resolveBox.x),
        transform.scaleX as number,
        transform.scale as number,
        transform.originX as number
    )
    transformAxis(
        box.y,
        resolveAxisTranslate(transform.y, resolveBox.y),
        transform.scaleY as number,
        transform.scale as number,
        transform.originY as number
    )
}

/**
 * Converts string to camel case
 *
 * @param {string} string
 * @returns {string} A camelized string
 */
export const toCamelCase = <T extends string>(string: T) =>
  string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) =>
    p2 ? p2.toUpperCase() : p1.toLowerCase(),
  );

import { alpha as alphaType } from "../numbers"
import { percent } from "../numbers/units"
import { HSLA } from "../types"
import { sanitize } from "../utils/sanitize"
import { isColorString, splitColor } from "./utils"

export const hsla = {
    test: /*@__PURE__*/ isColorString("hsl", "hue"),
    parse: /*@__PURE__*/ splitColor<HSLA>("hue", "saturation", "lightness"),
    transform: ({ hue, saturation, lightness, alpha = 1 }: HSLA) => {
        return (
            "hsla(" +
            Math.round(hue) +
            ", " +
            percent.transform(sanitize(saturation)) +
            ", " +
            percent.transform(sanitize(lightness)) +
            ", " +
            sanitize(alphaType.transform(alpha)) +
            ")"
        )
    },
}

import { Axis, Box } from "motion-utils"
import { mixNumber } from "../../utils/mix/number"
import { percent } from "../../value/types/numbers/units"
import { ResolvedValues } from "../../render/types"
import { scalePoint } from "./delta-apply"

/**
 * Remove a delta from a point. This is essentially the steps of applyPointDelta in reverse
 */
export function removePointDelta(
    point: number,
    translate: number,
    scale: number,
    originPoint: number,
    boxScale?: number
): number {
    point -= translate
    point = scalePoint(point, 1 / scale, originPoint)

    if (boxScale !== undefined) {
        point = scalePoint(point, 1 / boxScale, originPoint)
    }

    return point
}

/**
 * Remove a delta from an axis. This is essentially the steps of applyAxisDelta in reverse
 */
export function removeAxisDelta(
    axis: Axis,
    translate: number | string = 0,
    scale: number = 1,
    origin: number = 0.5,
    boxScale?: number,
    originAxis: Axis = axis,
    sourceAxis: Axis = axis
): void {
    if (percent.test(translate)) {
        translate = parseFloat(translate as string)
        const relativeProgress = mixNumber(
            sourceAxis.min,
            sourceAxis.max,
            translate / 100
        )
        translate = relativeProgress - sourceAxis.min
    }

    if (typeof translate !== "number") return

    let originPoint = mixNumber(originAxis.min, originAxis.max, origin)
    if (axis === originAxis) originPoint -= translate

    axis.min = removePointDelta(
        axis.min,
        translate,
        scale,
        originPoint,
        boxScale
    )

    axis.max = removePointDelta(
        axis.max,
        translate,
        scale,
        originPoint,
        boxScale
    )
}

/**
 * Remove a transforms from an axis. This is essentially the steps of applyAxisTransforms in reverse
 * and acts as a bridge between motion values and removeAxisDelta
 */
export function removeAxisTransforms(
    axis: Axis,
    transforms: ResolvedValues,
    [key, scaleKey, originKey]: string[],
    origin?: Axis,
    sourceAxis?: Axis
) {
    removeAxisDelta(
        axis,
        transforms[key] as number,
        transforms[scaleKey] as number,
        transforms[originKey] as number,
        transforms.scale as number,
        origin,
        sourceAxis
    )
}

/**
 * The names of the motion values we want to apply as translation, scale and origin.
 */
const xKeys = ["x", "scaleX", "originX"]
const yKeys = ["y", "scaleY", "originY"]

/**
 * Remove a transforms from an box. This is essentially the steps of applyAxisBox in reverse
 * and acts as a bridge between motion values and removeAxisDelta
 */
export function removeBoxTransforms(
    box: Box,
    transforms: ResolvedValues,
    originBox?: Box,
    sourceBox?: Box
): void {
    removeAxisTransforms(
        box.x,
        transforms,
        xKeys,
        originBox ? originBox.x : undefined,
        sourceBox ? sourceBox.x : undefined
    )
    removeAxisTransforms(
        box.y,
        transforms,
        yKeys,
        originBox ? originBox.y : undefined,
        sourceBox ? sourceBox.y : undefined
    )
}

/**
 * Pipe
 * Compose other transformers to run linearily
 * pipe(min(20), max(40))
 * @param  {...functions} transformers
 * @return {function}
 */
export const pipe = (...transformers: Function[]) =>
    transformers.reduce((a, b) => (v: any) => b(a(v)))

/**
 * Converts string to kebab case
 *
 * @param {string} string
 * @returns {string} A kebabized string
 */
export const toKebabCase = (string: string) =>
  string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Merges classes into a single string
 *
 * @param {array} classes
 * @returns {string} A string of classes
 */
export const mergeClasses = <ClassType = string | undefined | null>(...classes: ClassType[]) =>
  classes
    .filter((className, index, array) => {
      return (
        Boolean(className) &&
        (className as string).trim() !== '' &&
        array.indexOf(className) === index
      );
    })
    .join(' ')
    .trim();

import type { MotionStyle } from "../../VisualElement"
import { camelToDash } from "../../dom/utils/camel-to-dash"
import { renderHTML } from "../../html/utils/render"
import { SVGRenderState } from "../types"
import { camelCaseAttributes } from "./camel-case-attrs"

export function renderSVG(
    element: SVGElement,
    renderState: SVGRenderState,
    _styleProp?: MotionStyle,
    projection?: any
) {
    renderHTML(element as any, renderState, undefined, projection)

    for (const key in renderState.attrs) {
        element.setAttribute(
            !camelCaseAttributes.has(key) ? camelToDash(key) : key,
            renderState.attrs[key] as string
        )
    }
}

import { animations } from "../../../motion/features/animations"
import { drag } from "../../../motion/features/drag"
import { gestureAnimations } from "../../../motion/features/gestures"
import { layout } from "../../../motion/features/layout"

export const featureBundle = {
    ...animations,
    ...gestureAnimations,
    ...drag,
    ...layout,
}

import { resolveVariant } from "../../render/utils/resolve-dynamic-variants"
import type { AnimationDefinition } from "../../node/types"
import type { VisualElement } from "../../render/VisualElement"
import type { VisualElementAnimationOptions } from "./types"
import { animateTarget } from "./visual-element-target"
import { animateVariant } from "./visual-element-variant"

export function animateVisualElement(
    visualElement: VisualElement,
    definition: AnimationDefinition,
    options: VisualElementAnimationOptions = {}
) {
    visualElement.notify("AnimationStart", definition)
    let animation: Promise<any>

    if (Array.isArray(definition)) {
        const animations = definition.map((variant) =>
            animateVariant(visualElement, variant, options)
        )
        animation = Promise.all(animations)
    } else if (typeof definition === "string") {
        animation = animateVariant(visualElement, definition, options)
    } else {
        const resolvedDefinition =
            typeof definition === "function"
                ? resolveVariant(visualElement, definition, options.custom)
                : definition

        animation = Promise.all(
            animateTarget(visualElement, resolvedDefinition, options)
        )
    }

    return animation.then(() => {
        visualElement.notify("AnimationComplete", definition)
    })
}

import { cubicBezierAsString } from "./cubic-bezier"

export const supportedWaapiEasing = {
    linear: "linear",
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    circIn: /*@__PURE__*/ cubicBezierAsString([0, 0.65, 0.55, 1]),
    circOut: /*@__PURE__*/ cubicBezierAsString([0.55, 0, 1, 0.45]),
    backIn: /*@__PURE__*/ cubicBezierAsString([0.31, 0.01, 0.66, -0.59]),
    backOut: /*@__PURE__*/ cubicBezierAsString([0.33, 1.53, 0.69, 0.99]),
}

import { color } from "../color"
import { filter } from "../complex/filter"
import { mask } from "../complex/mask"
import { numberValueTypes } from "./number"
import { ValueTypeMap } from "./types"

/**
 * A map of default value types for common values
 */
export const defaultValueTypes: ValueTypeMap = {
    ...numberValueTypes,

    // Color props
    color,
    backgroundColor: color,
    outlineColor: color,
    fill: color,
    stroke: color,

    // Border props
    borderColor: color,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: color,
    borderLeftColor: color,
    filter,
    WebkitFilter: filter,
    mask,
    WebkitMask: mask,
}

/**
 * Gets the default ValueType for the provided value key
 */
export const getDefaultValueType = (key: string) => defaultValueTypes[key]

/**
 * Converts seconds to milliseconds
 *
 * @param seconds - Time in seconds.
 * @return milliseconds - Converted time in milliseconds.
 */

/*#__NO_SIDE_EFFECTS__*/
export const secondsToMilliseconds = (seconds: number) => seconds * 1000

/*#__NO_SIDE_EFFECTS__*/
export const millisecondsToSeconds = (milliseconds: number) =>
    milliseconds / 1000

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [['path', { d: 'M20 6 9 17l-5-5', key: '1gmf2c' }]];

/**
 * @component @name Check
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/check
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Check = createLucideIcon('check', __iconNode);

export default Check;

/**
 * Check if a component has an accessibility prop
 *
 * @param {object} props
 * @returns {boolean} Whether the component has an accessibility prop
 */
export const hasA11yProp = (props: Record<string, any>) => {
  for (const prop in props) {
    if (prop.startsWith('aria-') || prop === 'role' || prop === 'title') {
      return true;
    }
  }

  return false;
};

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', key: '1357e3' }],
  ['path', { d: 'M3 3v5h5', key: '1xhq8a' }],
];

/**
 * @component @name RotateCcw
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMmE5IDkgMCAxIDAgOS05IDkuNzUgOS43NSAwIDAgMC02Ljc0IDIuNzRMMyA4IiAvPgogIDxwYXRoIGQ9Ik0zIDN2NWg1IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/rotate-ccw
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const RotateCcw = createLucideIcon('rotate-ccw', __iconNode);

export default RotateCcw;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', key: 'v9h5vc' }],
  ['path', { d: 'M21 3v5h-5', key: '1q7to0' }],
  ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', key: '3uifl3' }],
  ['path', { d: 'M8 16H3v5', key: '1cv678' }],
];

/**
 * @component @name RefreshCw
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMmE5IDkgMCAwIDEgOS05IDkuNzUgOS43NSAwIDAgMSA2Ljc0IDIuNzRMMjEgOCIgLz4KICA8cGF0aCBkPSJNMjEgM3Y1aC01IiAvPgogIDxwYXRoIGQ9Ik0yMSAxMmE5IDkgMCAwIDEtOSA5IDkuNzUgOS43NSAwIDAgMS02Ljc0LTIuNzRMMyAxNiIgLz4KICA8cGF0aCBkPSJNOCAxNkgzdjUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/refresh-cw
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const RefreshCw = createLucideIcon('refresh-cw', __iconNode);

export default RefreshCw;

import { positionalKeys } from "../../render/utils/keys-position"
import { MotionValue } from "../../value"
import { findDimensionValueType } from "../../value/types/dimensions"
import { AnyResolvedKeyframe } from "../types"
import { getVariableValue } from "../utils/css-variables-conversion"
import {
    containsCSSVariable,
    isCSSVariableToken,
} from "../utils/is-css-variable"
import {
    KeyframeResolver,
    OnKeyframesResolved,
    UnresolvedKeyframes,
} from "./KeyframesResolver"
import { WithRender } from "./types"
import { isNone } from "./utils/is-none"
import { makeNoneKeyframesAnimatable } from "./utils/make-none-animatable"
import { isNumOrPxType, positionalValues } from "./utils/unit-conversion"

export class DOMKeyframesResolver<
    T extends AnyResolvedKeyframe
> extends KeyframeResolver<T> {
    name: string
    element?: WithRender

    private removedTransforms?: [string, AnyResolvedKeyframe][]
    private measuredOrigin?: AnyResolvedKeyframe

    constructor(
        unresolvedKeyframes: UnresolvedKeyframes<AnyResolvedKeyframe>,
        onComplete: OnKeyframesResolved<T>,
        name?: string,
        motionValue?: MotionValue<T>,
        element?: WithRender
    ) {
        super(unresolvedKeyframes, onComplete, name, motionValue, element, true)
    }

    readKeyframes() {
        const { unresolvedKeyframes, element, name } = this

        if (!element || !element.current) return

        super.readKeyframes()

        /**
         * If any keyframe is a CSS variable, we need to find its value by sampling the element
         */
        for (let i = 0; i < unresolvedKeyframes.length; i++) {
            let keyframe = unresolvedKeyframes[i]

            if (typeof keyframe === "string") {
                keyframe = keyframe.trim()

                if (isCSSVariableToken(keyframe)) {
                    const resolved = getVariableValue(keyframe, element.current)

                    if (resolved !== undefined) {
                        unresolvedKeyframes[i] = resolved as T
                    }

                    if (i === unresolvedKeyframes.length - 1) {
                        this.finalKeyframe = keyframe as T
                    }
                }
            }
        }

        /**
         * Resolve "none" values. We do this potentially twice - once before and once after measuring keyframes.
         * This could be seen as inefficient but it's a trade-off to avoid measurements in more situations, which
         * have a far bigger performance impact.
         */
        this.resolveNoneKeyframes()

        /**
         * Check to see if unit type has changed. If so schedule jobs that will
         * temporarily set styles to the destination keyframes.
         * Skip if we have more than two keyframes or this isn't a positional value.
         * TODO: We can throw if there are multiple keyframes and the value type changes.
         */
        if (!positionalKeys.has(name) || unresolvedKeyframes.length !== 2) {
            return
        }

        const [origin, target] = unresolvedKeyframes
        const originType = findDimensionValueType(origin)
        const targetType = findDimensionValueType(target)

        /**
         * If one keyframe contains embedded CSS variables (e.g. in calc()) and the other
         * doesn't, we need to measure to convert to pixels. This handles GitHub issue #3410.
         */
        const originHasVar = containsCSSVariable(origin)
        const targetHasVar = containsCSSVariable(target)

        if (originHasVar !== targetHasVar && positionalValues[name]) {
            this.needsMeasurement = true
            return
        }

        /**
         * Either we don't recognise these value types or we can animate between them.
         */
        if (originType === targetType) return

        /**
         * If both values are numbers or pixels, we can animate between them by
         * converting them to numbers.
         */
        if (isNumOrPxType(originType) && isNumOrPxType(targetType)) {
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                const value = unresolvedKeyframes[i]
                if (typeof value === "string") {
                    unresolvedKeyframes[i] = parseFloat(value as string)
                }
            }
        } else if (positionalValues[name]) {
            /**
             * Else, the only way to resolve this is by measuring the element.
             */
            this.needsMeasurement = true
        }
    }

    resolveNoneKeyframes() {
        const { unresolvedKeyframes, name } = this

        const noneKeyframeIndexes: number[] = []
        for (let i = 0; i < unresolvedKeyframes.length; i++) {
            if (
                unresolvedKeyframes[i] === null ||
                isNone(unresolvedKeyframes[i])
            ) {
                noneKeyframeIndexes.push(i)
            }
        }

        if (noneKeyframeIndexes.length) {
            makeNoneKeyframesAnimatable(
                unresolvedKeyframes,
                noneKeyframeIndexes,
                name
            )
        }
    }

    measureInitialState() {
        const { element, unresolvedKeyframes, name } = this

        if (!element || !element.current) return

        if (name === "height") {
            this.suspendedScrollY = window.pageYOffset
        }

        this.measuredOrigin = positionalValues[name](
            element.measureViewportBox(),
            window.getComputedStyle(element.current)
        )

        unresolvedKeyframes[0] = this.measuredOrigin

        // Set final key frame to measure after next render
        const measureKeyframe =
            unresolvedKeyframes[unresolvedKeyframes.length - 1]

        if (measureKeyframe !== undefined) {
            element.getValue(name, measureKeyframe).jump(measureKeyframe, false)
        }
    }

    measureEndState() {
        const { element, name, unresolvedKeyframes } = this

        if (!element || !element.current) return

        const value = element.getValue(name)
        value && value.jump(this.measuredOrigin, false)

        const finalKeyframeIndex = unresolvedKeyframes.length - 1
        const finalKeyframe = unresolvedKeyframes[finalKeyframeIndex]

        unresolvedKeyframes[finalKeyframeIndex] = positionalValues[name](
            element.measureViewportBox(),
            window.getComputedStyle(element.current)
        ) as any

        if (finalKeyframe !== null && this.finalKeyframe === undefined) {
            this.finalKeyframe = finalKeyframe as T
        }

        // If we removed transform values, reapply them before the next render
        if (this.removedTransforms?.length) {
            this.removedTransforms.forEach(
                ([unsetTransformName, unsetTransformValue]) => {
                    element
                        .getValue(unsetTransformName)!
                        .set(unsetTransformValue)
                }
            )
        }

        this.resolveNoneKeyframes()
    }
}

import { frame } from "../../frameloop"
import { MotionValue } from "../../value"
import { AnyResolvedKeyframe } from "../types"
import { WithRender } from "./types"
import { fillWildcards } from "./utils/fill-wildcards"
import { removeNonTranslationalTransform } from "./utils/unit-conversion"

export type UnresolvedKeyframes<T extends AnyResolvedKeyframe> = Array<T | null>

export type ResolvedKeyframes<T extends AnyResolvedKeyframe> = Array<T>

const toResolve = new Set<KeyframeResolver>()
let isScheduled = false
let anyNeedsMeasurement = false
let isForced = false

function measureAllKeyframes() {
    if (anyNeedsMeasurement) {
        const resolversToMeasure = Array.from(toResolve).filter(
            (resolver: KeyframeResolver) => resolver.needsMeasurement
        )
        const elementsToMeasure = new Set(
            resolversToMeasure.map((resolver) => resolver.element)
        )
        const transformsToRestore = new Map<
            WithRender,
            [string, AnyResolvedKeyframe][]
        >()

        /**
         * Write pass
         * If we're measuring elements we want to remove bounding box-changing transforms.
         */
        elementsToMeasure.forEach((element: WithRender) => {
            const removedTransforms = removeNonTranslationalTransform(
                element as any
            )

            if (!removedTransforms.length) return

            transformsToRestore.set(element, removedTransforms)

            element.render()
        })

        // Read
        resolversToMeasure.forEach((resolver) => resolver.measureInitialState())

        // Write
        elementsToMeasure.forEach((element: WithRender) => {
            element.render()

            const restore = transformsToRestore.get(element)
            if (restore) {
                restore.forEach(([key, value]) => {
                    element.getValue(key)?.set(value)
                })
            }
        })

        // Read
        resolversToMeasure.forEach((resolver) => resolver.measureEndState())

        // Write
        resolversToMeasure.forEach((resolver) => {
            if (resolver.suspendedScrollY !== undefined) {
                window.scrollTo(0, resolver.suspendedScrollY)
            }
        })
    }

    anyNeedsMeasurement = false
    isScheduled = false

    toResolve.forEach((resolver) => resolver.complete(isForced))
    toResolve.clear()
}

function readAllKeyframes() {
    toResolve.forEach((resolver) => {
        resolver.readKeyframes()

        if (resolver.needsMeasurement) {
            anyNeedsMeasurement = true
        }
    })
}

export function flushKeyframeResolvers() {
    isForced = true
    readAllKeyframes()
    measureAllKeyframes()
    isForced = false
}

export type OnKeyframesResolved<T extends AnyResolvedKeyframe> = (
    resolvedKeyframes: ResolvedKeyframes<T>,
    finalKeyframe: T,
    forced: boolean
) => void

export class KeyframeResolver<T extends AnyResolvedKeyframe = any> {
    name?: string
    element?: WithRender
    finalKeyframe?: T
    suspendedScrollY?: number

    protected unresolvedKeyframes: UnresolvedKeyframes<AnyResolvedKeyframe>

    private motionValue?: MotionValue<T>
    private onComplete: OnKeyframesResolved<T>

    state: "pending" | "scheduled" | "complete" = "pending"

    /**
     * Track whether this resolver is async. If it is, it'll be added to the
     * resolver queue and flushed in the next frame. Resolvers that aren't going
     * to trigger read/write thrashing don't need to be async.
     */
    private isAsync = false

    /**
     * Track whether this resolver needs to perform a measurement
     * to resolve its keyframes.
     */
    needsMeasurement = false

    constructor(
        unresolvedKeyframes: UnresolvedKeyframes<AnyResolvedKeyframe>,
        onComplete: OnKeyframesResolved<T>,
        name?: string,
        motionValue?: MotionValue<T>,
        element?: WithRender,
        isAsync = false
    ) {
        this.unresolvedKeyframes = [...unresolvedKeyframes]
        this.onComplete = onComplete
        this.name = name
        this.motionValue = motionValue
        this.element = element
        this.isAsync = isAsync
    }

    scheduleResolve() {
        this.state = "scheduled"

        if (this.isAsync) {
            toResolve.add(this)

            if (!isScheduled) {
                isScheduled = true
                frame.read(readAllKeyframes)
                frame.resolveKeyframes(measureAllKeyframes)
            }
        } else {
            this.readKeyframes()
            this.complete()
        }
    }

    readKeyframes() {
        const { unresolvedKeyframes, name, element, motionValue } = this

        // If initial keyframe is null we need to read it from the DOM
        if (unresolvedKeyframes[0] === null) {
            const currentValue = motionValue?.get()

            // TODO: This doesn't work if the final keyframe is a wildcard
            const finalKeyframe =
                unresolvedKeyframes[unresolvedKeyframes.length - 1]

            if (currentValue !== undefined) {
                unresolvedKeyframes[0] = currentValue
            } else if (element && name) {
                const valueAsRead = element.readValue(name, finalKeyframe)

                if (valueAsRead !== undefined && valueAsRead !== null) {
                    unresolvedKeyframes[0] = valueAsRead
                }
            }

            if (unresolvedKeyframes[0] === undefined) {
                unresolvedKeyframes[0] = finalKeyframe
            }

            if (motionValue && currentValue === undefined) {
                motionValue.set(unresolvedKeyframes[0] as T)
            }
        }

        fillWildcards(unresolvedKeyframes)
    }

    setFinalKeyframe() {}
    measureInitialState() {}
    renderEndStyles() {}
    measureEndState() {}

    complete(isForcedComplete = false) {
        this.state = "complete"

        this.onComplete(
            this.unresolvedKeyframes as ResolvedKeyframes<T>,
            this.finalKeyframe as T,
            isForcedComplete
        )

        toResolve.delete(this)
    }

    cancel() {
        if (this.state === "scheduled") {
            toResolve.delete(this)
            this.state = "pending"
        }
    }

    resume() {
        if (this.state === "pending") this.scheduleResolve()
    }
}

import { EventInfo, isPrimaryPointer } from "motion-dom"

export type EventListenerWithPointInfo = (
    e: PointerEvent,
    info: EventInfo
) => void

export function extractEventInfo(event: PointerEvent): EventInfo {
    return {
        point: {
            x: event.pageX,
            y: event.pageY,
        },
    }
}

export const addPointerInfo =
    (handler: EventListenerWithPointInfo): EventListener =>
    (event: PointerEvent) =>
        isPrimaryPointer(event) && handler(event, extractEventInfo(event))

import { MotionGlobalConfig, secondsToMilliseconds } from "motion-utils"
import { AsyncMotionValueAnimation } from "../AsyncMotionValueAnimation"
import { JSAnimation } from "../JSAnimation"
import type {
    AnyResolvedKeyframe,
    ValueAnimationOptions,
    ValueTransition,
} from "../types"
import type { UnresolvedKeyframes } from "../keyframes/KeyframesResolver"
import { getValueTransition } from "../utils/get-value-transition"
import { makeAnimationInstant } from "../utils/make-animation-instant"
import { getDefaultTransition } from "../utils/default-transitions"
import { getFinalKeyframe } from "../keyframes/get-final"
import { isTransitionDefined } from "../utils/is-transition-defined"
import { frame } from "../../frameloop"
import type { MotionValue, StartAnimation } from "../../value"
import type { VisualElement } from "../../render/VisualElement"

export const animateMotionValue =
    <V extends AnyResolvedKeyframe>(
        name: string,
        value: MotionValue<V>,
        target: V | UnresolvedKeyframes<V>,
        transition: ValueTransition & { elapsed?: number } = {},
        element?: VisualElement<any>,
        isHandoff?: boolean
    ): StartAnimation =>
    (onComplete) => {
        const valueTransition = getValueTransition(transition, name) || {}

        /**
         * Most transition values are currently completely overwritten by value-specific
         * transitions. In the future it'd be nicer to blend these transitions. But for now
         * delay actually does inherit from the root transition if not value-specific.
         */
        const delay = valueTransition.delay || transition.delay || 0

        /**
         * Elapsed isn't a public transition option but can be passed through from
         * optimized appear effects in milliseconds.
         */
        let { elapsed = 0 } = transition
        elapsed = elapsed - secondsToMilliseconds(delay)

        const options: ValueAnimationOptions = {
            keyframes: Array.isArray(target) ? target : [null, target],
            ease: "easeOut",
            velocity: value.getVelocity(),
            ...valueTransition,
            delay: -elapsed,
            onUpdate: (v) => {
                value.set(v)
                valueTransition.onUpdate && valueTransition.onUpdate(v)
            },
            onComplete: () => {
                onComplete()
                valueTransition.onComplete && valueTransition.onComplete()
            },
            name,
            motionValue: value,
            element: isHandoff ? undefined : element,
        }

        /**
         * If there's no transition defined for this value, we can generate
         * unique transition settings for this value.
         */
        if (!isTransitionDefined(valueTransition)) {
            Object.assign(options, getDefaultTransition(name, options))
        }

        /**
         * Both WAAPI and our internal animation functions use durations
         * as defined by milliseconds, while our external API defines them
         * as seconds.
         */
        options.duration &&= secondsToMilliseconds(options.duration)
        options.repeatDelay &&= secondsToMilliseconds(options.repeatDelay)

        /**
         * Support deprecated way to set initial value. Prefer keyframe syntax.
         */
        if (options.from !== undefined) {
            options.keyframes[0] = options.from as any
        }

        let shouldSkip = false

        if (
            (options as any).type === false ||
            (options.duration === 0 && !options.repeatDelay)
        ) {
            makeAnimationInstant(options)

            if (options.delay === 0) {
                shouldSkip = true
            }
        }

        if (
            MotionGlobalConfig.instantAnimations ||
            MotionGlobalConfig.skipAnimations ||
            element?.shouldSkipAnimations ||
            valueTransition.skipAnimations
        ) {
            shouldSkip = true
            makeAnimationInstant(options)
            options.delay = 0
        }

        /**
         * If the transition type or easing has been explicitly set by the user
         * then we don't want to allow flattening the animation.
         */
        options.allowFlatten = !valueTransition.type && !valueTransition.ease

        /**
         * If we can or must skip creating the animation, and apply only
         * the final keyframe, do so. We also check once keyframes are resolved but
         * this early check prevents the need to create an animation at all.
         */
        if (shouldSkip && !isHandoff && value.get() !== undefined) {
            const finalKeyframe = getFinalKeyframe<V>(
                options.keyframes as V[],
                valueTransition
            )

            if (finalKeyframe !== undefined) {
                frame.update(() => {
                    options.onUpdate!(finalKeyframe)
                    options.onComplete!()
                })

                return
            }
        }

        return valueTransition.isSync
            ? new JSAnimation(options)
            : new AsyncMotionValueAnimation(options)
    }

import { getFeatureDefinitions, setFeatureDefinitions } from "motion-dom"
import { MotionProps } from "../types"
import { FeatureDefinitions } from "./types"

const featureProps = {
    animation: [
        "animate",
        "variants",
        "whileHover",
        "whileTap",
        "exit",
        "whileInView",
        "whileFocus",
        "whileDrag",
    ],
    exit: ["exit"],
    drag: ["drag", "dragControls"],
    focus: ["whileFocus"],
    hover: ["whileHover", "onHoverStart", "onHoverEnd"],
    tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
    pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
    inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
    layout: ["layout", "layoutId"],
}

let isInitialized = false

/**
 * Initialize feature definitions with isEnabled checks.
 * This must be called before any motion components are rendered.
 */
export function initFeatureDefinitions() {
    if (isInitialized) return

    const initialFeatureDefinitions: Partial<FeatureDefinitions> = {}

    for (const key in featureProps) {
        initialFeatureDefinitions[
            key as keyof typeof initialFeatureDefinitions
        ] = {
            isEnabled: (props: MotionProps) =>
                featureProps[key as keyof typeof featureProps].some(
                    (name: string) => !!props[name as keyof typeof props]
                ),
        }
    }

    setFeatureDefinitions(initialFeatureDefinitions)
    isInitialized = true
}

/**
 * Get the current feature definitions, initializing if needed.
 */
export function getInitializedFeatureDefinitions(): Partial<FeatureDefinitions> {
    initFeatureDefinitions()
    return getFeatureDefinitions()
}

import { color } from "../color"
import { complex } from "../complex"
import { dimensionValueTypes } from "../dimensions"
import { testValueType } from "../test"

/**
 * A list of all ValueTypes
 */
const valueTypes = [...dimensionValueTypes, color, complex]

/**
 * Tests a value against the list of ValueTypes
 */
export const findValueType = (v: any) => valueTypes.find(testValueType(v))

import { clamp } from "motion-utils"
import { alpha as alphaType, number } from "../numbers"
import { RGBA } from "../types"
import { sanitize } from "../utils/sanitize"
import { isColorString, splitColor } from "./utils"

const clampRgbUnit = (v: number) => clamp(0, 255, v)
export const rgbUnit = {
    ...number,
    transform: (v: number) => Math.round(clampRgbUnit(v)),
}

export const rgba = {
    test: /*@__PURE__*/ isColorString("rgb", "red"),
    parse: /*@__PURE__*/ splitColor<RGBA>("red", "green", "blue"),
    transform: ({ red, green, blue, alpha = 1 }: RGBA) =>
        "rgba(" +
        rgbUnit.transform(red) +
        ", " +
        rgbUnit.transform(green) +
        ", " +
        rgbUnit.transform(blue) +
        ", " +
        sanitize(alphaType.transform(alpha)) +
        ")",
}

import { WindowResizeHandler } from "./types"

const windowCallbacks = new Set<WindowResizeHandler>()

let windowResizeHandler: VoidFunction | undefined

function createWindowResizeHandler() {
    windowResizeHandler = () => {
        const info = {
            get width() {
                return window.innerWidth
            },
            get height() {
                return window.innerHeight
            },
        }

        windowCallbacks.forEach((callback) => callback(info))
    }

    window.addEventListener("resize", windowResizeHandler)
}

export function resizeWindow(callback: WindowResizeHandler) {
    windowCallbacks.add(callback)

    if (!windowResizeHandler) createWindowResizeHandler()

    return () => {
        windowCallbacks.delete(callback)

        if (
            !windowCallbacks.size &&
            typeof windowResizeHandler === "function"
        ) {
            window.removeEventListener("resize", windowResizeHandler)
            windowResizeHandler = undefined
        }
    }
}

import { Feature, resolveVariant } from "motion-dom"

let id = 0

export class ExitAnimationFeature extends Feature<unknown> {
    private id: number = id++
    private isExitComplete = false

    update() {
        if (!this.node.presenceContext) return

        const { isPresent, onExitComplete } = this.node.presenceContext
        const { isPresent: prevIsPresent } = this.node.prevPresenceContext || {}

        if (!this.node.animationState || isPresent === prevIsPresent) {
            return
        }

        if (isPresent && prevIsPresent === false) {
            /**
             * When re-entering, if the exit animation already completed
             * (element is at rest), reset to initial values so the enter
             * animation replays from the correct position.
             */
            if (this.isExitComplete) {
                const { initial, custom } = this.node.getProps()

                if (
                    typeof initial === "string" ||
                    (typeof initial === "object" &&
                        initial !== null &&
                        !Array.isArray(initial))
                ) {
                    const resolved = resolveVariant(
                        this.node,
                        initial,
                        custom
                    )
                    if (resolved) {
                        const { transition, transitionEnd, ...target } =
                            resolved
                        for (const key in target) {
                            this.node
                                .getValue(key)
                                ?.jump(
                                    target[
                                        key as keyof typeof target
                                    ] as any
                                )
                        }
                    }
                }

                this.node.animationState.reset()
                this.node.animationState.animateChanges()
            } else {
                this.node.animationState.setActive("exit", false)
            }

            this.isExitComplete = false
            return
        }

        const exitAnimation = this.node.animationState.setActive(
            "exit",
            !isPresent
        )

        if (onExitComplete && !isPresent) {
            exitAnimation.then(() => {
                this.isExitComplete = true
                onExitComplete(this.id)
            })
        }
    }

    mount() {
        const { register, onExitComplete } = this.node.presenceContext || {}

        if (onExitComplete) {
            onExitComplete(this.id)
        }

        if (register) {
            this.unmount = register(this.id)
        }
    }

    unmount() {}
}

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M15 3h6v6', key: '1q9fwt' }],
  ['path', { d: 'M10 14 21 3', key: 'gplh6r' }],
  ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', key: 'a6xqqp' }],
];

/**
 * @component @name ExternalLink
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgM2g2djYiIC8+CiAgPHBhdGggZD0iTTEwIDE0IDIxIDMiIC8+CiAgPHBhdGggZD0iTTE4IDEzdjZhMiAyIDAgMCAxLTIgMkg1YTIgMiAwIDAgMS0yLTJWOGEyIDIgMCAwIDEgMi0yaDYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/external-link
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const ExternalLink = createLucideIcon('external-link', __iconNode);

export default ExternalLink;

import { Axis, AxisDelta, Box, Delta } from "motion-utils"

export const createAxisDelta = (): AxisDelta => ({
    translate: 0,
    scale: 1,
    origin: 0,
    originPoint: 0,
})

export const createDelta = (): Delta => ({
    x: createAxisDelta(),
    y: createAxisDelta(),
})

export const createAxis = (): Axis => ({ min: 0, max: 0 })

export const createBox = (): Box => ({
    x: createAxis(),
    y: createAxis(),
})

import { Feature } from "motion-dom"
import { MotionProps } from "../../types"
import { observeIntersection } from "./observers"

const thresholdNames = {
    some: 0,
    all: 1,
}

export class InViewFeature extends Feature<Element> {
    private hasEnteredView = false

    private isInView = false

    private stopObserver?: () => void

    private startObserver() {
        this.stopObserver?.()

        const { viewport = {} } = this.node.getProps()
        const { root, margin: rootMargin, amount = "some", once } = viewport

        const options = {
            root: root ? root.current : undefined,
            rootMargin,
            threshold:
                typeof amount === "number" ? amount : thresholdNames[amount],
        }

        const onIntersectionUpdate = (entry: IntersectionObserverEntry) => {
            const { isIntersecting } = entry

            /**
             * If there's been no change in the viewport state, early return.
             */
            if (this.isInView === isIntersecting) return

            this.isInView = isIntersecting

            /**
             * Handle hasEnteredView. If this is only meant to run once, and
             * element isn't visible, early return. Otherwise set hasEnteredView to true.
             */
            if (once && !isIntersecting && this.hasEnteredView) {
                return
            } else if (isIntersecting) {
                this.hasEnteredView = true
            }

            if (this.node.animationState) {
                this.node.animationState.setActive(
                    "whileInView",
                    isIntersecting
                )
            }

            /**
             * Use the latest committed props rather than the ones in scope
             * when this observer is created
             */
            const { onViewportEnter, onViewportLeave } = this.node.getProps()
            const callback = isIntersecting ? onViewportEnter : onViewportLeave
            callback && callback(entry)
        }

        this.stopObserver = observeIntersection(
            this.node.current!,
            options,
            onIntersectionUpdate
        )
    }

    mount() {
        this.startObserver()
    }

    update() {
        if (typeof IntersectionObserver === "undefined") return

        const { props, prevProps } = this.node
        const hasOptionsChanged = ["amount", "margin", "root"].some(
            hasViewportOptionChanged(props, prevProps)
        )

        if (hasOptionsChanged) {
            this.startObserver()
        }
    }

    unmount() {
        this.stopObserver?.()
        this.hasEnteredView = false
        this.isInView = false
    }
}

function hasViewportOptionChanged(
    { viewport = {} }: MotionProps,
    { viewport: prevViewport = {} }: MotionProps = {}
) {
    return (name: keyof typeof viewport) =>
        viewport[name] !== prevViewport[name]
}

import { analyseComplexValue } from "../../../value/types/complex"
import { getAnimatableNone } from "../../../value/types/utils/animatable-none"
import { AnyResolvedKeyframe } from "../../types"
import { UnresolvedKeyframes } from "../KeyframesResolver"

/**
 * If we encounter keyframes like "none" or "0" and we also have keyframes like
 * "#fff" or "200px 200px" we want to find a keyframe to serve as a template for
 * the "none" keyframes. In this case "#fff" or "200px 200px" - then these get turned into
 * zero equivalents, i.e. "#fff0" or "0px 0px".
 */
const invalidTemplates = new Set(["auto", "none", "0"])

export function makeNoneKeyframesAnimatable(
    unresolvedKeyframes: UnresolvedKeyframes<AnyResolvedKeyframe>,
    noneKeyframeIndexes: number[],
    name?: string
) {
    let i = 0
    let animatableTemplate: string | undefined = undefined
    while (i < unresolvedKeyframes.length && !animatableTemplate) {
        const keyframe = unresolvedKeyframes[i]
        if (
            typeof keyframe === "string" &&
            !invalidTemplates.has(keyframe) &&
            analyseComplexValue(keyframe).values.length
        ) {
            animatableTemplate = unresolvedKeyframes[i] as string
        }
        i++
    }

    if (animatableTemplate && name) {
        for (const noneIndex of noneKeyframeIndexes) {
            unresolvedKeyframes[noneIndex] = getAnimatableNone(
                name,
                animatableTemplate
            )
        }
    }
}

type IntersectionHandler = (entry: IntersectionObserverEntry) => void

interface ElementIntersectionObservers {
    [key: string]: IntersectionObserver
}

/**
 * Map an IntersectionHandler callback to an element. We only ever make one handler for one
 * element, so even though these handlers might all be triggered by different
 * observers, we can keep them in the same map.
 */
const observerCallbacks = new WeakMap<Element, IntersectionHandler>()

/**
 * Multiple observers can be created for multiple element/document roots. Each with
 * different settings. So here we store dictionaries of observers to each root,
 * using serialised settings (threshold/margin) as lookup keys.
 */
const observers = new WeakMap<
    Element | Document,
    ElementIntersectionObservers
>()

const fireObserverCallback = (entry: IntersectionObserverEntry) => {
    const callback = observerCallbacks.get(entry.target)
    callback && callback(entry)
}

const fireAllObserverCallbacks: IntersectionObserverCallback = (entries) => {
    entries.forEach(fireObserverCallback)
}

function initIntersectionObserver({
    root,
    ...options
}: IntersectionObserverInit): IntersectionObserver {
    const lookupRoot = root || document

    /**
     * If we don't have an observer lookup map for this root, create one.
     */
    if (!observers.has(lookupRoot)) {
        observers.set(lookupRoot, {})
    }
    const rootObservers = observers.get(lookupRoot)!

    const key = JSON.stringify(options)

    /**
     * If we don't have an observer for this combination of root and settings,
     * create one.
     */
    if (!rootObservers[key]) {
        rootObservers[key] = new IntersectionObserver(
            fireAllObserverCallbacks,
            { root, ...options }
        )
    }

    return rootObservers[key]
}

export function observeIntersection(
    element: Element,
    options: IntersectionObserverInit,
    callback: IntersectionHandler
) {
    const rootInteresectionObserver = initIntersectionObserver(options)

    observerCallbacks.set(element, callback)
    rootInteresectionObserver.observe(element)

    return () => {
        observerCallbacks.delete(element)
        rootInteresectionObserver.unobserve(element)
    }
}

import { complex } from "../../value/types/complex"
import { mixNumber } from "../../utils/mix/number"
import type { ScaleCorrectorDefinition } from "./types"

export const correctBoxShadow: ScaleCorrectorDefinition = {
    correct: (latest: string, { treeScale, projectionDelta }) => {
        const original = latest
        const shadow = complex.parse(latest)

        // TODO: Doesn't support multiple shadows
        if (shadow.length > 5) return original

        const template = complex.createTransformer(latest)
        const offset = typeof shadow[0] !== "number" ? 1 : 0

        // Calculate the overall context scale
        const xScale = projectionDelta!.x.scale * treeScale!.x
        const yScale = projectionDelta!.y.scale * treeScale!.y

        // Scale x/y
        ;(shadow[0 + offset] as number) /= xScale
        ;(shadow[1 + offset] as number) /= yScale

        /**
         * Ideally we'd correct x and y scales individually, but because blur and
         * spread apply to both we have to take a scale average and apply that instead.
         * We could potentially improve the outcome of this by incorporating the ratio between
         * the two scales.
         */
        const averageScale = mixNumber(xScale, yScale, 0.5)

        // Blur
        if (typeof shadow[2 + offset] === "number")
            (shadow[2 + offset] as number) /= averageScale

        // Spread
        if (typeof shadow[3 + offset] === "number")
            (shadow[3 + offset] as number) /= averageScale

        return template(shadow)
    },
}

import type {
    AnimationDefinition,
    TargetAndTransition,
    VariantLabels,
} from "../../node/types"
import type { AnimationType } from "../types"
import type { VisualElementAnimationOptions } from "../../animation/interfaces/types"
import { animateVisualElement } from "../../animation/interfaces/visual-element"
import { calcChildStagger } from "../../animation/utils/calc-child-stagger"
import { getVariantContext } from "./get-variant-context"
import { isAnimationControls } from "./is-animation-controls"
import { isKeyframesTarget } from "./is-keyframes-target"
import { isVariantLabel } from "./is-variant-label"
import { resolveVariant } from "./resolve-dynamic-variants"
import { shallowCompare } from "./shallow-compare"
import { variantPriorityOrder } from "./variant-props"

export type { VisualElementAnimationOptions }

export interface AnimationState {
    animateChanges: (type?: AnimationType) => Promise<any>
    setActive: (
        type: AnimationType,
        isActive: boolean,
        options?: VisualElementAnimationOptions
    ) => Promise<any>
    setAnimateFunction: (fn: any) => void
    getState: () => { [key: string]: AnimationTypeState }
    reset: () => void
}

interface DefinitionAndOptions {
    animation: AnimationDefinition
    options?: VisualElementAnimationOptions
}

export type AnimationList = string[] | TargetAndTransition[]

const reversePriorityOrder = [...variantPriorityOrder].reverse()
const numAnimationTypes = variantPriorityOrder.length

/**
 * Type for the animate function that can be injected.
 * This allows the animation implementation to be provided by the framework layer.
 */
export type AnimateFunction = (animations: DefinitionAndOptions[]) => Promise<any>

function createAnimateFunction(visualElement: any): AnimateFunction {
    return (animations: DefinitionAndOptions[]) => {
        return Promise.all(
            animations.map(({ animation, options }) =>
                animateVisualElement(visualElement, animation, options)
            )
        )
    }
}

export function createAnimationState(visualElement: any): AnimationState {
    let animate = createAnimateFunction(visualElement)
    let state = createState()
    let isInitialRender = true
    /**
     * Track whether the animation state has been reset (e.g. via StrictMode
     * double-invocation or Suspense unmount/remount). On the first
     * animateChanges() call after a reset we need to behave like the initial
     * render for variant-inheritance checks, even though isInitialRender is
     * already false.
     */
    let wasReset = false

    /**
     * This function will be used to reduce the animation definitions for
     * each active animation type into an object of resolved values for it.
     */
    const buildResolvedTypeValues =
        (type: AnimationType) =>
        (
            acc: { [key: string]: any },
            definition: string | TargetAndTransition | undefined
        ) => {
            const resolved = resolveVariant(
                visualElement,
                definition,
                type === "exit"
                    ? visualElement.presenceContext?.custom
                    : undefined
            )

            if (resolved) {
                const { transition, transitionEnd, ...target } = resolved
                acc = { ...acc, ...target, ...transitionEnd }
            }

            return acc
        }

    /**
     * This just allows us to inject mocked animation functions
     * @internal
     */
    function setAnimateFunction(
        makeAnimator: (visualElement: any) => AnimateFunction
    ) {
        animate = makeAnimator(visualElement)
    }

    /**
     * When we receive new props, we need to:
     * 1. Create a list of protected keys for each type. This is a directory of
     *    value keys that are currently being "handled" by types of a higher priority
     *    so that whenever an animation is played of a given type, these values are
     *    protected from being animated.
     * 2. Determine if an animation type needs animating.
     * 3. Determine if any values have been removed from a type and figure out
     *    what to animate those to.
     */
    function animateChanges(changedActiveType?: AnimationType) {
        const { props } = visualElement
        const context = getVariantContext(visualElement.parent) || {}

        /**
         * A list of animations that we'll build into as we iterate through the animation
         * types. This will get executed at the end of the function.
         */
        const animations: DefinitionAndOptions[] = []

        /**
         * Keep track of which values have been removed. Then, as we hit lower priority
         * animation types, we can check if they contain removed values and animate to that.
         */
        const removedKeys = new Set<string>()

        /**
         * A dictionary of all encountered keys. This is an object to let us build into and
         * copy it without iteration. Each time we hit an animation type we set its protected
         * keys - the keys its not allowed to animate - to the latest version of this object.
         */
        let encounteredKeys: { [key: string]: any } = {}

        /**
         * If a variant has been removed at a given index, and this component is controlling
         * variant animations, we want to ensure lower-priority variants are forced to animate.
         */
        let removedVariantIndex = Infinity

        /**
         * Iterate through all animation types in reverse priority order. For each, we want to
         * detect which values it's handling and whether or not they've changed (and therefore
         * need to be animated). If any values have been removed, we want to detect those in
         * lower priority props and flag for animation.
         */
        for (let i = 0; i < numAnimationTypes; i++) {
            const type = reversePriorityOrder[i]
            const typeState = state[type]
            const prop =
                props[type] !== undefined
                    ? props[type]
                    : context[type as keyof typeof context]
            const propIsVariant = isVariantLabel(prop)

            /**
             * If this type has *just* changed isActive status, set activeDelta
             * to that status. Otherwise set to null.
             */
            const activeDelta =
                type === changedActiveType ? typeState.isActive : null

            if (activeDelta === false) removedVariantIndex = i

            /**
             * If this prop is an inherited variant, rather than been set directly on the
             * component itself, we want to make sure we allow the parent to trigger animations.
             *
             * TODO: Can probably change this to a !isControllingVariants check
             */
            let isInherited =
                prop === context[type as keyof typeof context] &&
                prop !== props[type] &&
                propIsVariant

            if (
                isInherited &&
                (isInitialRender || wasReset) &&
                visualElement.manuallyAnimateOnMount
            ) {
                isInherited = false
            }

            /**
             * Set all encountered keys so far as the protected keys for this type. This will
             * be any key that has been animated or otherwise handled by active, higher-priortiy types.
             */
            typeState.protectedKeys = { ...encounteredKeys }

            // Check if we can skip analysing this prop early
            if (
                // If it isn't active and hasn't *just* been set as inactive
                (!typeState.isActive && activeDelta === null) ||
                // If we didn't and don't have any defined prop for this animation type
                (!prop && !typeState.prevProp) ||
                // Or if the prop doesn't define an animation
                isAnimationControls(prop) ||
                typeof prop === "boolean"
            ) {
                continue
            }

            /**
             * If exit is already active and wasn't just activated, skip
             * re-processing to prevent interrupting running exit animations.
             * Re-resolving exit with a changed custom value can start new
             * value animations that stop the originals, leaving the exit
             * animation promise unresolved and the component stuck in the DOM.
             */
            if (type === "exit" && typeState.isActive && activeDelta !== true) {
                if (typeState.prevResolvedValues) {
                    encounteredKeys = {
                        ...encounteredKeys,
                        ...typeState.prevResolvedValues,
                    }
                }
                continue
            }

            /**
             * As we go look through the values defined on this type, if we detect
             * a changed value or a value that was removed in a higher priority, we set
             * this to true and add this prop to the animation list.
             */
            const variantDidChange = checkVariantsDidChange(
                typeState.prevProp,
                prop
            )

            let shouldAnimateType =
                variantDidChange ||
                // If we're making this variant active, we want to always make it active
                (type === changedActiveType &&
                    typeState.isActive &&
                    !isInherited &&
                    propIsVariant) ||
                // If we removed a higher-priority variant (i is in reverse order)
                (i > removedVariantIndex && propIsVariant)

            let handledRemovedValues = false

            /**
             * As animations can be set as variant lists, variants or target objects, we
             * coerce everything to an array if it isn't one already
             */
            const definitionList = Array.isArray(prop) ? prop : [prop]

            /**
             * Build an object of all the resolved values. We'll use this in the subsequent
             * animateChanges calls to determine whether a value has changed.
             */
            let resolvedValues = definitionList.reduce(
                buildResolvedTypeValues(type),
                {}
            )

            if (activeDelta === false) resolvedValues = {}

            /**
             * Now we need to loop through all the keys in the prev prop and this prop,
             * and decide:
             * 1. If the value has changed, and needs animating
             * 2. If it has been removed, and needs adding to the removedKeys set
             * 3. If it has been removed in a higher priority type and needs animating
             * 4. If it hasn't been removed in a higher priority but hasn't changed, and
             *    needs adding to the type's protectedKeys list.
             */
            const { prevResolvedValues = {} } = typeState

            const allKeys = {
                ...prevResolvedValues,
                ...resolvedValues,
            }
            const markToAnimate = (key: string) => {
                shouldAnimateType = true
                if (removedKeys.has(key)) {
                    handledRemovedValues = true
                    removedKeys.delete(key)
                }
                typeState.needsAnimating[key] = true

                const motionValue = visualElement.getValue(key)
                if (motionValue) motionValue.liveStyle = false
            }

            for (const key in allKeys) {
                const next = resolvedValues[key]
                const prev = prevResolvedValues[key]

                // If we've already handled this we can just skip ahead
                if (encounteredKeys.hasOwnProperty(key)) continue

                /**
                 * If the value has changed, we probably want to animate it.
                 */
                let valueHasChanged = false
                if (isKeyframesTarget(next) && isKeyframesTarget(prev)) {
                    valueHasChanged =
                        !shallowCompare(next, prev) || variantDidChange
                } else {
                    valueHasChanged = next !== prev
                }

                if (valueHasChanged) {
                    if (next !== undefined && next !== null) {
                        // If next is defined and doesn't equal prev, it needs animating
                        markToAnimate(key)
                    } else {
                        // If it's undefined, it's been removed.
                        removedKeys.add(key)
                    }
                } else if (next !== undefined && removedKeys.has(key)) {
                    /**
                     * If next hasn't changed and it isn't undefined, we want to check if it's
                     * been removed by a higher priority
                     */
                    markToAnimate(key)
                } else {
                    /**
                     * If it hasn't changed, we add it to the list of protected values
                     * to ensure it doesn't get animated.
                     */
                    typeState.protectedKeys[key] = true
                }
            }

            /**
             * Update the typeState so next time animateChanges is called we can compare the
             * latest prop and resolvedValues to these.
             */
            typeState.prevProp = prop
            typeState.prevResolvedValues = resolvedValues

            if (typeState.isActive) {
                encounteredKeys = { ...encounteredKeys, ...resolvedValues }
            }

            if (
                (isInitialRender || wasReset) &&
                visualElement.blockInitialAnimation
            ) {
                shouldAnimateType = false
            }

            /**
             * If this is an inherited prop we want to skip this animation
             * unless the inherited variants haven't changed on this render.
             */
            const willAnimateViaParent = isInherited && variantDidChange
            const needsAnimating = !willAnimateViaParent || handledRemovedValues
            if (shouldAnimateType && needsAnimating) {
                animations.push(
                    ...definitionList.map((animation) => {
                        const options: VisualElementAnimationOptions = { type }

                        /**
                         * If we're performing the initial animation, but we're not
                         * rendering at the same time as the variant-controlling parent,
                         * we want to use the parent's transition to calculate the stagger.
                         */
                        if (
                            typeof animation === "string" &&
                            (isInitialRender || wasReset) &&
                            !willAnimateViaParent &&
                            visualElement.manuallyAnimateOnMount &&
                            visualElement.parent
                        ) {
                            const { parent } = visualElement
                            const parentVariant = resolveVariant(
                                parent,
                                animation
                            )

                            if (parent.enteringChildren && parentVariant) {
                                const { delayChildren } =
                                    parentVariant.transition || {}
                                options.delay = calcChildStagger(
                                    parent.enteringChildren,
                                    visualElement,
                                    delayChildren
                                )
                            }
                        }

                        return {
                            animation: animation as AnimationDefinition,
                            options,
                        }
                    })
                )
            }
        }

        /**
         * If there are some removed value that haven't been dealt with,
         * we need to create a new animation that falls back either to the value
         * defined in the style prop, or the last read value.
         */
        if (removedKeys.size) {
            const fallbackAnimation: TargetAndTransition = {}

            /**
             * If the initial prop contains a transition we can use that, otherwise
             * allow the animation function to use the visual element's default.
             */
            if (typeof props.initial !== "boolean") {
                const initialTransition = resolveVariant(
                    visualElement,
                    Array.isArray(props.initial)
                        ? props.initial[0]
                        : props.initial
                )

                if (initialTransition && initialTransition.transition) {
                    fallbackAnimation.transition = initialTransition.transition
                }
            }

            removedKeys.forEach((key) => {
                const fallbackTarget = visualElement.getBaseTarget(key)

                const motionValue = visualElement.getValue(key)
                if (motionValue) motionValue.liveStyle = true

                // @ts-expect-error - @mattgperry to figure if we should do something here
                fallbackAnimation[key] = fallbackTarget ?? null
            })

            animations.push({ animation: fallbackAnimation })
        }

        let shouldAnimate = Boolean(animations.length)

        if (
            isInitialRender &&
            (props.initial === false || props.initial === props.animate) &&
            !visualElement.manuallyAnimateOnMount
        ) {
            shouldAnimate = false
        }

        isInitialRender = false
        wasReset = false
        return shouldAnimate ? animate(animations) : Promise.resolve()
    }

    /**
     * Change whether a certain animation type is active.
     */
    function setActive(type: AnimationType, isActive: boolean) {
        // If the active state hasn't changed, we can safely do nothing here
        if (state[type].isActive === isActive) return Promise.resolve()

        // Propagate active change to children
        visualElement.variantChildren?.forEach((child: any) =>
            child.animationState?.setActive(type, isActive)
        )

        state[type].isActive = isActive

        const animations = animateChanges(type)

        for (const key in state) {
            state[key as keyof typeof state].protectedKeys = {}
        }

        return animations
    }

    return {
        animateChanges,
        setActive,
        setAnimateFunction,
        getState: () => state,
        reset: () => {
            state = createState()
            wasReset = true
        },
    }
}

export function checkVariantsDidChange(prev: any, next: any) {
    if (typeof next === "string") {
        return next !== prev
    } else if (Array.isArray(next)) {
        return !shallowCompare(next, prev)
    }

    return false
}

export interface AnimationTypeState {
    isActive: boolean
    protectedKeys: { [key: string]: true }
    needsAnimating: { [key: string]: boolean }
    prevResolvedValues: { [key: string]: any }
    prevProp?: VariantLabels | TargetAndTransition
}

function createTypeState(isActive = false): AnimationTypeState {
    return {
        isActive,
        protectedKeys: {},
        needsAnimating: {},
        prevResolvedValues: {},
    }
}

function createState() {
    return {
        animate: createTypeState(true),
        whileInView: createTypeState(),
        whileHover: createTypeState(),
        whileTap: createTypeState(),
        whileDrag: createTypeState(),
        whileFocus: createTypeState(),
        exit: createTypeState(),
    }
}

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M10 16h.01', key: '1bzywj' }],
  [
    'path',
    {
      d: 'M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      key: '18tbho',
    },
  ],
  ['path', { d: 'M21.946 12.013H2.054', key: 'zqlbp7' }],
  ['path', { d: 'M6 16h.01', key: '1pmjb7' }],
];

/**
 * @component @name HardDrive
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAgMTZoLjAxIiAvPgogIDxwYXRoIGQ9Ik0yLjIxMiAxMS41NzdhMiAyIDAgMCAwLS4yMTIuODk2VjE4YTIgMiAwIDAgMCAyIDJoMTZhMiAyIDAgMCAwIDItMnYtNS41MjdhMiAyIDAgMCAwLS4yMTItLjg5NkwxOC41NSA1LjExQTIgMiAwIDAgMCAxNi43NiA0SDcuMjRhMiAyIDAgMCAwLTEuNzkgMS4xMXoiIC8+CiAgPHBhdGggZD0iTTIxLjk0NiAxMi4wMTNIMi4wNTQiIC8+CiAgPHBhdGggZD0iTTYgMTZoLjAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/hard-drive
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const HardDrive = createLucideIcon('hard-drive', __iconNode);

export default HardDrive;

import { ElementOrSelector } from "../utils/resolve-elements"
import { isDragActive } from "./drag/state/is-active"
import { EventOptions } from "./types"
import { setupGesture } from "./utils/setup"

/**
 * A function to be called when a hover gesture starts.
 *
 * This function can optionally return a function that will be called
 * when the hover gesture ends.
 *
 * @public
 */
export type OnHoverStartEvent = (
    element: Element,
    event: PointerEvent
) => void | OnHoverEndEvent

/**
 * A function to be called when a hover gesture ends.
 *
 * @public
 */
export type OnHoverEndEvent = (event: PointerEvent) => void

function isValidHover(event: PointerEvent) {
    return !(event.pointerType === "touch" || isDragActive())
}

/**
 * Create a hover gesture. hover() is different to .addEventListener("pointerenter")
 * in that it has an easier syntax, filters out polyfilled touch events, interoperates
 * with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
 *
 * @public
 */
export function hover(
    elementOrSelector: ElementOrSelector,
    onHoverStart: OnHoverStartEvent,
    options: EventOptions = {}
): VoidFunction {
    const [elements, eventOptions, cancel] = setupGesture(
        elementOrSelector,
        options
    )

    elements.forEach((element) => {
        let isPressed = false
        let deferredHoverEnd = false
        let hoverEndCallback: OnHoverEndEvent | undefined

        const removePointerLeave = () => {
            element.removeEventListener(
                "pointerleave",
                onPointerLeave as EventListener
            )
        }

        const endHover = (event: PointerEvent) => {
            if (hoverEndCallback) {
                hoverEndCallback(event)
                hoverEndCallback = undefined
            }
            removePointerLeave()
        }

        const onPointerUp = (event: Event) => {
            isPressed = false
            window.removeEventListener(
                "pointerup",
                onPointerUp as EventListener
            )
            window.removeEventListener(
                "pointercancel",
                onPointerUp as EventListener
            )

            if (deferredHoverEnd) {
                deferredHoverEnd = false
                endHover(event as PointerEvent)
            }
        }

        const onPointerDown = () => {
            isPressed = true
            window.addEventListener(
                "pointerup",
                onPointerUp as EventListener,
                eventOptions
            )
            window.addEventListener(
                "pointercancel",
                onPointerUp as EventListener,
                eventOptions
            )
        }

        const onPointerLeave = (leaveEvent: PointerEvent) => {
            if (leaveEvent.pointerType === "touch") return

            if (isPressed) {
                deferredHoverEnd = true
                return
            }

            endHover(leaveEvent)
        }

        const onPointerEnter = (enterEvent: PointerEvent) => {
            if (!isValidHover(enterEvent)) return

            deferredHoverEnd = false

            const onHoverEnd = onHoverStart(
                element as Element,
                enterEvent
            )

            if (typeof onHoverEnd !== "function") return

            hoverEndCallback = onHoverEnd

            element.addEventListener(
                "pointerleave",
                onPointerLeave as EventListener,
                eventOptions
            )
        }

        element.addEventListener(
            "pointerenter",
            onPointerEnter as EventListener,
            eventOptions
        )
        element.addEventListener(
            "pointerdown",
            onPointerDown as EventListener,
            eventOptions
        )
    })

    return cancel
}

import { isMotionValue } from "../../value/utils/is-motion-value"
import type { MotionValue } from "../../value"
import type { AnyResolvedKeyframe } from "../../animation/types"
import { DOMKeyframesResolver } from "../../animation/keyframes/DOMKeyframesResolver"
import type { MotionNodeOptions } from "../../node/types"
import type { DOMVisualElementOptions } from "./types"
import type { HTMLRenderState } from "../html/types"
import { VisualElement, MotionStyle } from "../VisualElement"

export abstract class DOMVisualElement<
    Instance extends HTMLElement | SVGElement = HTMLElement,
    State extends HTMLRenderState = HTMLRenderState,
    Options extends DOMVisualElementOptions = DOMVisualElementOptions
> extends VisualElement<Instance, State, Options> {
    sortInstanceNodePosition(a: Instance, b: Instance): number {
        /**
         * compareDocumentPosition returns a bitmask, by using the bitwise &
         * we're returning true if 2 in that bitmask is set to true. 2 is set
         * to true if b preceeds a.
         */
        return a.compareDocumentPosition(b) & 2 ? 1 : -1
    }

    getBaseTargetFromProps(
        props: MotionNodeOptions,
        key: string
    ): AnyResolvedKeyframe | MotionValue<any> | undefined {
        const style = (props as MotionNodeOptions & { style?: MotionStyle }).style
        return style ? (style[key] as string) : undefined
    }

    removeValueFromRenderState(
        key: string,
        { vars, style }: HTMLRenderState
    ): void {
        delete vars[key]
        delete style[key]
    }

    KeyframeResolver = DOMKeyframesResolver

    childSubscription?: VoidFunction
    handleChildMotionValue() {
        if (this.childSubscription) {
            this.childSubscription()
            delete this.childSubscription
        }

        const { children } = this.props as MotionNodeOptions & { children?: MotionValue | any }
        if (isMotionValue(children)) {
            this.childSubscription = children.on("change", (latest) => {
                if (this.current) {
                    this.current.textContent = `${latest}`
                }
            })
        }
    }
}

import { frame } from "../../frameloop"
import { getValueTransition } from "../utils/get-value-transition"
import { resolveTransition } from "../utils/resolve-transition"
import { positionalKeys } from "../../render/utils/keys-position"
import { setTarget } from "../../render/utils/setters"
import { addValueToWillChange } from "../../value/will-change/add-will-change"
import { getOptimisedAppearId } from "../optimized-appear/get-appear-id"
import { animateMotionValue } from "./motion-value"
import type { MotionPath } from "../types"
import type { VisualElementAnimationOptions } from "./types"
import type { AnimationPlaybackControlsWithThen } from "../types"
import type { TargetAndTransition } from "../../node/types"
import type { AnimationTypeState } from "../../render/utils/animation-state"
import type { VisualElement } from "../../render/VisualElement"

/**
 * Decide whether we should block this animation. Previously, we achieved this
 * just by checking whether the key was listed in protectedKeys, but this
 * posed problems if an animation was triggered by afterChildren and protectedKeys
 * had been set to true in the meantime.
 */
function shouldBlockAnimation(
    { protectedKeys, needsAnimating }: AnimationTypeState,
    key: string
) {
    const shouldBlock =
        protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true

    needsAnimating[key] = false
    return shouldBlock
}

export function animateTarget(
    visualElement: VisualElement,
    targetAndTransition: TargetAndTransition,
    { delay = 0, transitionOverride, type }: VisualElementAnimationOptions = {}
): AnimationPlaybackControlsWithThen[] {
    let {
        transition,
        transitionEnd,
        ...target
    } = targetAndTransition

    const defaultTransition = visualElement.getDefaultTransition()
    transition = transition
        ? resolveTransition(transition, defaultTransition)
        : defaultTransition

    const reduceMotion = (transition as { reduceMotion?: boolean })?.reduceMotion
    const skipAnimations = transition?.skipAnimations

    if (transitionOverride) transition = transitionOverride

    const animations: AnimationPlaybackControlsWithThen[] = []

    const animationTypeState =
        type &&
        visualElement.animationState &&
        visualElement.animationState.getState()[type]

    const path = (transition as { path?: MotionPath } | undefined)?.path
    if (path) {
        // path mutates `target` to claim x/y; loop below skips them.
        path.animateVisualElement(
            visualElement,
            target,
            transition,
            delay,
            animations
        )
    }

    for (const key in target) {
        const value = visualElement.getValue(
            key,
            visualElement.latestValues[key] ?? null
        )
        const valueTarget = target[key as keyof typeof target]

        if (
            valueTarget === undefined ||
            (animationTypeState &&
                shouldBlockAnimation(animationTypeState, key))
        ) {
            continue
        }

        const valueTransition = {
            delay,
            ...getValueTransition(transition || {}, key),
        }

        if (skipAnimations) valueTransition.skipAnimations = true

        /**
         * If the value is already at the defined target, skip the animation.
         * We still re-assert the value via frame.update to take precedence
         * over any stale transitionEnd callbacks from previous animations.
         */
        const currentValue = value.get()
        if (
            currentValue !== undefined &&
            !value.isAnimating() &&
            !Array.isArray(valueTarget) &&
            valueTarget === currentValue &&
            !valueTransition.velocity
        ) {
            frame.update(() => value.set(valueTarget as any))
            continue
        }

        /**
         * If this is the first time a value is being animated, check
         * to see if we're handling off from an existing animation.
         */
        let isHandoff = false
        if (window.MotionHandoffAnimation) {
            const appearId = getOptimisedAppearId(visualElement)

            if (appearId) {
                const startTime = window.MotionHandoffAnimation(
                    appearId,
                    key,
                    frame
                )

                if (startTime !== null) {
                    valueTransition.startTime = startTime
                    isHandoff = true
                }
            }
        }

        addValueToWillChange(visualElement, key)

        const shouldReduceMotion =
            reduceMotion ?? visualElement.shouldReduceMotion

        value.start(
            animateMotionValue(
                key,
                value,
                valueTarget,
                shouldReduceMotion && positionalKeys.has(key)
                    ? { type: false }
                    : valueTransition,
                visualElement,
                isHandoff
            )
        )

        const animation = value.animation

        if (animation) {
            animations.push(animation)
        }
    }

    if (transitionEnd) {
        const applyTransitionEnd = () =>
            frame.update(() => {
                transitionEnd && setTarget(visualElement, transitionEnd)
            })

        if (animations.length) {
            Promise.all(animations).then(applyTransitionEnd)
        } else {
            applyTransitionEnd()
        }
    }

    return animations
}

const keyboardAccessibleElements = new Set([
    "BUTTON",
    "INPUT",
    "SELECT",
    "TEXTAREA",
    "A",
])

/**
 * Checks if an element is natively keyboard accessible (focusable).
 * Used by the press gesture to determine if we need to add tabIndex.
 */
export function isElementKeyboardAccessible(element: Element) {
    return (
        keyboardAccessibleElements.has(element.tagName) ||
        (element as HTMLElement).isContentEditable === true
    )
}

const textInputElements = new Set(["INPUT", "SELECT", "TEXTAREA"])

/**
 * Checks if an element has text selection or direct interaction behavior
 * that should block drag gestures from starting.
 *
 * This specifically targets form controls where the user might want to select
 * text or interact with the control (e.g., sliders, dropdowns).
 *
 * Buttons and links are NOT included because they don't have click-and-move
 * actions of their own - they only respond to click events, so dragging
 * should still work when initiated from these elements.
 */
export function isElementTextInput(element: Element) {
    return (
        textInputElements.has(element.tagName) ||
        (element as HTMLElement).isContentEditable === true
    )
}

import type { MotionNodeOptions } from "../../../node/types"
import { buildHTMLStyles } from "../../html/utils/build-styles"
import { ResolvedValues } from "../../types"
import { SVGRenderState } from "../types"
import { buildSVGPath } from "./path"

/**
 * CSS Motion Path properties that should remain as CSS styles on SVG elements.
 */
const cssMotionPathProperties = [
    "offsetDistance",
    "offsetPath",
    "offsetRotate",
    "offsetAnchor",
]

/**
 * Build SVG visual attributes, like cx and style.transform
 */
export function buildSVGAttrs(
    state: SVGRenderState,
    {
        attrX,
        attrY,
        attrScale,
        pathLength,
        pathSpacing = 1,
        pathOffset = 0,
        // This is object creation, which we try to avoid per-frame.
        ...latest
    }: ResolvedValues,
    isSVGTag: boolean,
    transformTemplate?: MotionNodeOptions["transformTemplate"],
    styleProp?: Record<string, any>
) {
    buildHTMLStyles(state, latest, transformTemplate)

    /**
     * For svg tags we just want to make sure viewBox is animatable and treat all the styles
     * as normal HTML tags.
     */
    if (isSVGTag) {
        if (state.style.viewBox) {
            state.attrs.viewBox = state.style.viewBox
        }
        return
    }

    state.attrs = state.style
    state.style = {}
    const { attrs, style } = state

    /**
     * However, we apply transforms as CSS transforms.
     * So if we detect a transform, transformOrigin we take it from attrs and copy it into style.
     */
    if (attrs.transform) {
        style.transform = attrs.transform
        delete attrs.transform
    }
    if (style.transform || attrs.transformOrigin) {
        style.transformOrigin = attrs.transformOrigin ?? "50% 50%"
        delete attrs.transformOrigin
    }

    if (style.transform) {
        /**
         * SVG's element transform-origin uses its own median as a reference.
         * Therefore, transformBox becomes a fill-box
         */
        style.transformBox = (styleProp?.transformBox as string) ?? "fill-box"
        delete attrs.transformBox
    }

    for (const key of cssMotionPathProperties) {
        if (attrs[key] !== undefined) {
            style[key] = attrs[key]
            delete attrs[key]
        }
    }

    // Render attrX/attrY/attrScale as attributes
    if (attrX !== undefined) attrs.x = attrX
    if (attrY !== undefined) attrs.y = attrY
    if (attrScale !== undefined) attrs.scale = attrScale

    // Build SVG path if one has been defined
    if (pathLength !== undefined) {
        buildSVGPath(
            attrs,
            pathLength as number,
            pathSpacing as number,
            pathOffset as number,
            false
        )
    }
}

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
      key: '1a8usu',
    },
  ],
  ['path', { d: 'm15 5 4 4', key: '1mk7zo' }],
];

/**
 * @component @name Pencil
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEuMTc0IDYuODEyYTEgMSAwIDAgMC0zLjk4Ni0zLjk4N0wzLjg0MiAxNi4xNzRhMiAyIDAgMCAwLS41LjgzbC0xLjMyMSA0LjM1MmEuNS41IDAgMCAwIC42MjMuNjIybDQuMzUzLTEuMzJhMiAyIDAgMCAwIC44My0uNDk3eiIgLz4KICA8cGF0aCBkPSJtMTUgNSA0IDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/pencil
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Pencil = createLucideIcon('pencil', __iconNode);

export default Pencil;

import type { Box } from "motion-utils"
import type { AnyResolvedKeyframe } from "../../animation/types"
import { isCSSVariableName } from "../../animation/utils/is-css-variable"
import type { MotionNodeOptions } from "../../node/types"
import { transformProps } from "../utils/keys-transform"
import {
    defaultTransformValue,
    readTransformValue,
} from "../dom/parse-transform"
import { measureViewportBox } from "../../projection/utils/measure"
import { DOMVisualElement } from "../dom/DOMVisualElement"
import type { DOMVisualElementOptions } from "../dom/types"
import type { ResolvedValues, MotionConfigContextProps } from "../types"
import type { VisualElement } from "../VisualElement"
import { HTMLRenderState } from "./types"
import { buildHTMLStyles } from "./utils/build-styles"
import { renderHTML } from "./utils/render"
import { scrapeMotionValuesFromProps } from "./utils/scrape-motion-values"

export function getComputedStyle(element: HTMLElement) {
    return window.getComputedStyle(element)
}

export class HTMLVisualElement extends DOMVisualElement<
    HTMLElement,
    HTMLRenderState,
    DOMVisualElementOptions
> {
    type = "html"

    readValueFromInstance(
        instance: HTMLElement,
        key: string
    ): AnyResolvedKeyframe | null | undefined {
        if (transformProps.has(key)) {
            return this.projection?.isProjecting
                ? defaultTransformValue(key)
                : readTransformValue(instance, key)
        } else {
            const computedStyle = getComputedStyle(instance)
            const value =
                (isCSSVariableName(key)
                    ? computedStyle.getPropertyValue(key)
                    : computedStyle[key as keyof typeof computedStyle]) || 0

            return typeof value === "string" ? value.trim() : (value as number)
        }
    }

    measureInstanceViewportBox(
        instance: HTMLElement,
        { transformPagePoint }: MotionNodeOptions & Partial<MotionConfigContextProps>
    ): Box {
        return measureViewportBox(instance, transformPagePoint)
    }

    build(
        renderState: HTMLRenderState,
        latestValues: ResolvedValues,
        props: MotionNodeOptions
    ) {
        buildHTMLStyles(renderState, latestValues, props.transformTemplate)
    }

    scrapeMotionValuesFromProps(
        props: MotionNodeOptions,
        prevProps: MotionNodeOptions,
        visualElement: VisualElement
    ) {
        return scrapeMotionValuesFromProps(props, prevProps, visualElement)
    }

    renderInstance = renderHTML
}

import { Axis, AxisDelta, Box, Delta } from "motion-utils"
import { calcLength } from "./delta-calc"

function isAxisDeltaZero(delta: AxisDelta) {
    return delta.translate === 0 && delta.scale === 1
}

export function isDeltaZero(delta: Delta) {
    return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y)
}

export function axisEquals(a: Axis, b: Axis) {
    return a.min === b.min && a.max === b.max
}

export function boxEquals(a: Box, b: Box) {
    return axisEquals(a.x, b.x) && axisEquals(a.y, b.y)
}

export function axisEqualsRounded(a: Axis, b: Axis) {
    return (
        Math.round(a.min) === Math.round(b.min) &&
        Math.round(a.max) === Math.round(b.max)
    )
}

export function boxEqualsRounded(a: Box, b: Box) {
    return axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y)
}

export function aspectRatio(box: Box): number {
    return calcLength(box.x) / calcLength(box.y)
}

export function axisDeltaEquals(a: AxisDelta, b: AxisDelta) {
    return (
        a.translate === b.translate &&
        a.scale === b.scale &&
        a.originPoint === b.originPoint
    )
}

import { Axis, AxisDelta, Box, Delta, Point } from "motion-utils"
import { mixNumber } from "../../utils/mix/number"
import { ResolvedValues } from "../../render/types"

const SCALE_PRECISION = 0.0001
const SCALE_MIN = 1 - SCALE_PRECISION
const SCALE_MAX = 1 + SCALE_PRECISION
const TRANSLATE_PRECISION = 0.01
const TRANSLATE_MIN = 0 - TRANSLATE_PRECISION
const TRANSLATE_MAX = 0 + TRANSLATE_PRECISION

export function calcLength(axis: Axis) {
    return axis.max - axis.min
}

export function isNear(
    value: number,
    target: number,
    maxDistance: number
): boolean {
    return Math.abs(value - target) <= maxDistance
}

export function calcAxisDelta(
    delta: AxisDelta,
    source: Axis,
    target: Axis,
    origin: number = 0.5
) {
    delta.origin = origin
    delta.originPoint = mixNumber(source.min, source.max, delta.origin)
    delta.scale = calcLength(target) / calcLength(source)
    delta.translate =
        mixNumber(target.min, target.max, delta.origin) - delta.originPoint

    if (
        (delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX) ||
        isNaN(delta.scale)
    ) {
        delta.scale = 1.0
    }

    if (
        (delta.translate >= TRANSLATE_MIN &&
            delta.translate <= TRANSLATE_MAX) ||
        isNaN(delta.translate)
    ) {
        delta.translate = 0.0
    }
}

export function calcBoxDelta(
    delta: Delta,
    source: Box,
    target: Box,
    origin?: ResolvedValues
): void {
    calcAxisDelta(
        delta.x,
        source.x,
        target.x,
        origin ? (origin.originX as number) : undefined
    )
    calcAxisDelta(
        delta.y,
        source.y,
        target.y,
        origin ? (origin.originY as number) : undefined
    )
}

export function calcRelativeAxis(
    target: Axis,
    relative: Axis,
    parent: Axis,
    anchor: number = 0
) {
    const anchorPoint = anchor
        ? mixNumber(parent.min, parent.max, anchor)
        : parent.min
    target.min = anchorPoint + relative.min
    target.max = target.min + calcLength(relative)
}

export function calcRelativeBox(
    target: Box,
    relative: Box,
    parent: Box,
    anchor?: Point
) {
    calcRelativeAxis(target.x, relative.x, parent.x, anchor?.x)
    calcRelativeAxis(target.y, relative.y, parent.y, anchor?.y)
}

export function calcRelativeAxisPosition(
    target: Axis,
    layout: Axis,
    parent: Axis,
    anchor: number = 0
) {
    const anchorPoint = anchor
        ? mixNumber(parent.min, parent.max, anchor)
        : parent.min
    target.min = layout.min - anchorPoint
    target.max = target.min + calcLength(layout)
}

export function calcRelativePosition(
    target: Box,
    layout: Box,
    parent: Box,
    anchor?: Point
) {
    calcRelativeAxisPosition(target.x, layout.x, parent.x, anchor?.x)
    calcRelativeAxisPosition(target.y, layout.y, parent.y, anchor?.y)
}

import { Feature, type VisualElement } from "motion-dom"
import { noop } from "motion-utils"
import { VisualElementDragControls } from "./VisualElementDragControls"

export class DragGesture extends Feature<HTMLElement> {
    controls: VisualElementDragControls

    removeGroupControls: Function = noop
    removeListeners: Function = noop

    constructor(node: VisualElement<HTMLElement>) {
        super(node)
        this.controls = new VisualElementDragControls(node)
    }

    mount() {
        // If we've been provided a DragControls for manual control over the drag gesture,
        // subscribe this component to it on mount.
        const { dragControls } = this.node.getProps()

        if (dragControls) {
            this.removeGroupControls = dragControls.subscribe(this.controls)
        }

        this.removeListeners = this.controls.addListeners() || noop
    }

    update() {
        const { dragControls } = this.node.getProps()
        const { dragControls: prevDragControls } = this.node.prevProps || {}

        if (dragControls !== prevDragControls) {
            this.removeGroupControls()
            if (dragControls) {
                this.removeGroupControls = dragControls.subscribe(this.controls)
            }
        }
    }

    unmount() {
        this.removeGroupControls()
        this.removeListeners()
        /**
         * In React 19, during list reorder reconciliation, components may
         * briefly unmount and remount while the drag is still active. If we're
         * actively dragging, we should NOT end the pan session - it will
         * continue tracking pointer events via its window-level listeners.
         *
         * The pan session will be properly cleaned up when:
         * 1. The drag ends naturally (pointerup/pointercancel)
         * 2. The component is truly removed from the DOM
         */
        if (!this.controls.isDragging) {
            this.controls.endPanSession()
        }
    }
}

import { memo } from "motion-utils"
import {
    AnyResolvedKeyframe,
    ValueAnimationOptionsWithRenderContext,
} from "../../types"
import { acceleratedValues } from "../utils/accelerated-values"
import { hasBrowserOnlyColors } from "../utils/is-browser-color"

const colorProperties = new Set([
    "color",
    "backgroundColor",
    "outlineColor",
    "fill",
    "stroke",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
])

const supportsWaapi = /*@__PURE__*/ memo(() =>
    Object.hasOwnProperty.call(Element.prototype, "animate")
)

export function supportsBrowserAnimation<T extends AnyResolvedKeyframe>(
    options: ValueAnimationOptionsWithRenderContext<T>
) {
    const {
        motionValue,
        name,
        repeatDelay,
        repeatType,
        damping,
        type,
        keyframes,
    } = options

    const subject = motionValue?.owner?.current

    /**
     * We use this check instead of isHTMLElement() because we explicitly
     * **don't** want elements in different timing contexts (i.e. popups)
     * to be accelerated, as it's not possible to sync these animations
     * properly with those driven from the main window frameloop.
     */
    if (!(subject instanceof HTMLElement)) {
        return false
    }

    const { onUpdate, transformTemplate } = motionValue!.owner!.getProps()

    return (
        supportsWaapi() &&
        name &&
        /**
         * Force WAAPI for color properties with browser-only color formats
         * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
         */
        (acceleratedValues.has(name) ||
            (colorProperties.has(name) &&
                hasBrowserOnlyColors(keyframes))) &&
        (name !== "transform" || !transformTemplate) &&
        /**
         * If we're outputting values to onUpdate then we can't use WAAPI as there's
         * no way to read the value from WAAPI every frame.
         */
        !onUpdate &&
        !repeatDelay &&
        repeatType !== "mirror" &&
        damping !== 0 &&
        type !== "inertia"
    )
}

import { px } from "../../value/types/numbers/units"
import type { Axis } from "motion-utils"
import type { ScaleCorrectorDefinition } from "./types"

export function pixelsToPercent(pixels: number, axis: Axis): number {
    if (axis.max === axis.min) return 0
    return (pixels / (axis.max - axis.min)) * 100
}

/**
 * We always correct borderRadius as a percentage rather than pixels to reduce paints.
 * For example, if you are projecting a box that is 100px wide with a 10px borderRadius
 * into a box that is 200px wide with a 20px borderRadius, that is actually a 10%
 * borderRadius in both states. If we animate between the two in pixels that will trigger
 * a paint each time. If we animate between the two in percentage we'll avoid a paint.
 */
export const correctBorderRadius: ScaleCorrectorDefinition = {
    correct: (latest, node) => {
        if (!node.target) return latest

        /**
         * If latest is a string, if it's a percentage we can return immediately as it's
         * going to be stretched appropriately. Otherwise, if it's a pixel, convert it to a number.
         */
        if (typeof latest === "string") {
            if (px.test(latest)) {
                latest = parseFloat(latest)
            } else {
                return latest
            }
        }

        /**
         * If latest is a number, it's a pixel value. We use the current viewportBox to calculate that
         * pixel value as a percentage of each axis
         */
        const x = pixelsToPercent(latest, node.target.x)
        const y = pixelsToPercent(latest, node.target.y)

        return `${x}% ${y}%`
    },
}

import { warning } from "motion-utils"
import { hex } from "../../value/types/color/hex"
import { hsla } from "../../value/types/color/hsla"
import { hslaToRgba } from "../../value/types/color/hsla-to-rgba"
import { rgba } from "../../value/types/color/rgba"
import { Color, HSLA, RGBA } from "../../value/types/types"
import { mixImmediate } from "./immediate"
import { mixNumber } from "./number"

// Linear color space blending
// Explained https://www.youtube.com/watch?v=LKnqECcg6Gw
// Demonstrated http://codepen.io/osublake/pen/xGVVaN
export const mixLinearColor = (from: number, to: number, v: number) => {
    const fromExpo = from * from
    const expo = v * (to * to - fromExpo) + fromExpo
    return expo < 0 ? 0 : Math.sqrt(expo)
}

const colorTypes = [hex, rgba, hsla]
const getColorType = (v: Color | string) =>
    colorTypes.find((type) => type.test(v))

function asRGBA(color: Color | string) {
    const type = getColorType(color)

    warning(
        Boolean(type),
        `'${color}' is not an animatable color. Use the equivalent color code instead.`,
        "color-not-animatable"
    )

    if (!Boolean(type)) return false

    let model = type!.parse(color)

    if (type === hsla) {
        // TODO Remove this cast - needed since Motion's stricter typing
        model = hslaToRgba(model as HSLA)
    }

    return model as RGBA
}

export const mixColor = (from: Color | string, to: Color | string) => {
    const fromRGBA = asRGBA(from)
    const toRGBA = asRGBA(to)

    if (!fromRGBA || !toRGBA) {
        return mixImmediate(from, to)
    }

    const blended = { ...fromRGBA }

    return (v: number) => {
        blended.red = mixLinearColor(fromRGBA.red, toRGBA.red, v)
        blended.green = mixLinearColor(fromRGBA.green, toRGBA.green, v)
        blended.blue = mixLinearColor(fromRGBA.blue, toRGBA.blue, v)
        blended.alpha = mixNumber(fromRGBA.alpha, toRGBA.alpha, v)
        return rgba.transform!(blended)
    }
}

import { transformPropOrder } from "../utils/keys-transform"

const radToDeg = (rad: number) => (rad * 180) / Math.PI

type MatrixParser = (values: number[]) => number

type MatrixParsers = Record<
    (typeof transformPropOrder)[number],
    number | MatrixParser
>

const rotate = (v: number[]) => {
    const angle = radToDeg(Math.atan2(v[1], v[0]))
    return rebaseAngle(angle)
}

const matrix2dParsers: MatrixParsers = {
    x: 4,
    y: 5,
    translateX: 4,
    translateY: 5,
    scaleX: 0,
    scaleY: 3,
    scale: (v) => (Math.abs(v[0]) + Math.abs(v[3])) / 2,
    rotate,
    rotateZ: rotate,
    skewX: (v) => radToDeg(Math.atan(v[1])),
    skewY: (v) => radToDeg(Math.atan(v[2])),
    skew: (v) => (Math.abs(v[1]) + Math.abs(v[2])) / 2,
} as const

const rebaseAngle = (angle: number) => {
    angle = angle % 360
    if (angle < 0) angle += 360
    return angle
}

const rotateZ = rotate

const scaleX = (v: number[]) => Math.sqrt(v[0] * v[0] + v[1] * v[1])
const scaleY = (v: number[]) => Math.sqrt(v[4] * v[4] + v[5] * v[5])

const matrix3dParsers: MatrixParsers = {
    x: 12,
    y: 13,
    z: 14,
    translateX: 12,
    translateY: 13,
    translateZ: 14,
    scaleX,
    scaleY,
    scale: (v) => (scaleX(v) + scaleY(v)) / 2,
    rotateX: (v) => rebaseAngle(radToDeg(Math.atan2(v[6], v[5]))),
    rotateY: (v) => rebaseAngle(radToDeg(Math.atan2(-v[2], v[0]))),
    rotateZ,
    rotate: rotateZ,
    skewX: (v) => radToDeg(Math.atan(v[4])),
    skewY: (v) => radToDeg(Math.atan(v[1])),
    skew: (v) => (Math.abs(v[1]) + Math.abs(v[4])) / 2,
} as const

export function defaultTransformValue(name: string): number {
    return name.includes("scale") ? 1 : 0
}

export function parseValueFromTransform(
    transform: string | undefined,
    name: string
): number {
    if (!transform || transform === "none") {
        return defaultTransformValue(name)
    }

    const matrix3dMatch = transform.match(/^matrix3d\(([-\d.e\s,]+)\)$/u)

    let parsers: MatrixParsers
    let match: RegExpMatchArray | null

    if (matrix3dMatch) {
        parsers = matrix3dParsers
        match = matrix3dMatch
    } else {
        const matrix2dMatch = transform.match(/^matrix\(([-\d.e\s,]+)\)$/u)

        parsers = matrix2dParsers
        match = matrix2dMatch
    }

    if (!match) {
        return defaultTransformValue(name)
    }

    const valueParser = parsers[name]
    const values = match[1].split(",").map(convertTransformToNumber)

    return typeof valueParser === "function"
        ? valueParser(values)
        : values[valueParser]
}

export const readTransformValue = (instance: HTMLElement, name: string) => {
    const { transform = "none" } = getComputedStyle(instance)
    return parseValueFromTransform(transform, name)
}

function convertTransformToNumber(value: string): number {
    return parseFloat(value.trim())
}

import { addUniqueItem, removeItem } from "motion-utils"
import { compareByDepth, WithDepth } from "./compare-by-depth"

export class FlatTree {
    private children: WithDepth[] = []

    private isDirty: boolean = false

    add(child: WithDepth) {
        addUniqueItem(this.children, child)
        this.isDirty = true
    }

    remove(child: WithDepth) {
        removeItem(this.children, child)
        this.isDirty = true
    }

    forEach(callback: (child: WithDepth) => void) {
        this.isDirty && this.children.sort(compareByDepth)
        this.isDirty = false
        this.children.forEach(callback)
    }
}

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
      key: '1oefj6',
    },
  ],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5', key: 'wfsgrz' }],
];

/**
 * @component @name File
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/file
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const File = createLucideIcon('file', __iconNode);

export default File;

import { Feature, frame, type PanInfo } from "motion-dom"
import { noop } from "motion-utils"
import { addPointerEvent } from "../../events/add-pointer-event"
import { getContextWindow } from "../../utils/get-context-window"
import { PanSession } from "./PanSession"

type PanEventHandler = (event: PointerEvent, info: PanInfo) => void
const asyncHandler =
    (handler?: PanEventHandler) => (event: PointerEvent, info: PanInfo) => {
        if (handler) {
            frame.update(() => handler(event, info), false, true)
        }
    }

export class PanGesture extends Feature<Element> {
    private session?: PanSession

    private removePointerDownListener: Function = noop

    onPointerDown(pointerDownEvent: PointerEvent) {
        this.session = new PanSession(
            pointerDownEvent,
            this.createPanHandlers(),
            {
                transformPagePoint: this.node.getTransformPagePoint(),
                contextWindow: getContextWindow(this.node),
            }
        )
    }

    createPanHandlers() {
        const { onPanSessionStart, onPanStart, onPan, onPanEnd } =
            this.node.getProps()

        return {
            onSessionStart: asyncHandler(onPanSessionStart),
            onStart: asyncHandler(onPanStart),
            onMove: asyncHandler(onPan),
            onEnd: (event: PointerEvent, info: PanInfo) => {
                delete this.session
                if (onPanEnd) {
                    frame.postRender(() => onPanEnd(event, info))
                }
            },
        }
    }

    mount() {
        this.removePointerDownListener = addPointerEvent(
            this.node.current!,
            "pointerdown",
            (event: PointerEvent) => this.onPointerDown(event)
        )
    }

    update() {
        this.session && this.session.updateHandlers(this.createPanHandlers())
    }

    unmount() {
        this.removePointerDownListener()
        this.session && this.session.end()
    }
}

import { isCSSVariableName } from "../../animation/utils/is-css-variable"
import { cornerRadiusProps } from "../../utils/border-radius"
import { correctBorderRadius } from "./scale-border-radius"
import { correctBoxShadow } from "./scale-box-shadow"
import type { ScaleCorrectorMap } from "./types"

export const scaleCorrectors: ScaleCorrectorMap = {
    borderRadius: {
        ...correctBorderRadius,
        applyTo: [...cornerRadiusProps],
    },
    borderTopLeftRadius: correctBorderRadius,
    borderTopRightRadius: correctBorderRadius,
    borderBottomLeftRadius: correctBorderRadius,
    borderBottomRightRadius: correctBorderRadius,
    boxShadow: correctBoxShadow,
}

export function addScaleCorrector(correctors: ScaleCorrectorMap) {
    for (const key in correctors) {
        scaleCorrectors[key] = correctors[key]
        if (isCSSVariableName(key)) {
            scaleCorrectors[key].isCSSVariable = true
        }
    }
}

import { ResolvedValues } from "../../types"

const dashKeys = {
    offset: "stroke-dashoffset",
    array: "stroke-dasharray",
}

const camelKeys = {
    offset: "strokeDashoffset",
    array: "strokeDasharray",
}

/**
 * Build SVG path properties. Uses the path's measured length to convert
 * our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
 * and stroke-dasharray attributes.
 *
 * This function is mutative to reduce per-frame GC.
 *
 * Note: We use unitless values for stroke-dasharray and stroke-dashoffset
 * because Safari incorrectly scales px values when the page is zoomed.
 */
export function buildSVGPath(
    attrs: ResolvedValues,
    length: number,
    spacing = 1,
    offset = 0,
    useDashCase: boolean = true
): void {
    // Normalise path length by setting SVG attribute pathLength to 1
    attrs.pathLength = 1

    // We use dash case when setting attributes directly to the DOM node and camel case
    // when defining props on a React component.
    const keys = useDashCase ? dashKeys : camelKeys

    // Build the dash offset (unitless to avoid Safari zoom bug)
    attrs[keys.offset] = `${-offset}`

    // Build the dash array (unitless to avoid Safari zoom bug)
    attrs[keys.array] = `${length} ${spacing}`
}

import { MotionGlobalConfig } from "motion-utils"
import { stepsOrder } from "./order"
import { createRenderStep } from "./render-step"
import { Batcher, FrameData, Process, Steps } from "./types"

const maxElapsed = 40

export function createRenderBatcher(
    scheduleNextBatch: (callback: Function) => void,
    allowKeepAlive: boolean
) {
    let runNextFrame = false
    let useDefaultElapsed = true

    const state: FrameData = {
        delta: 0.0,
        timestamp: 0.0,
        isProcessing: false,
    }

    const flagRunNextFrame = () => (runNextFrame = true)

    const steps = stepsOrder.reduce((acc, key) => {
        acc[key] = createRenderStep(flagRunNextFrame)
        return acc
    }, {} as Steps)

    const {
        setup,
        read,
        resolveKeyframes,
        preUpdate,
        update,
        preRender,
        render,
        postRender,
    } = steps

    const processBatch = () => {
        const useManualTiming = MotionGlobalConfig.useManualTiming
        const timestamp = useManualTiming
            ? state.timestamp
            : performance.now()
        runNextFrame = false

        if (!useManualTiming) {
            state.delta = useDefaultElapsed
                ? 1000 / 60
                : Math.max(Math.min(timestamp - state.timestamp, maxElapsed), 1)
        }

        state.timestamp = timestamp
        state.isProcessing = true

        // Unrolled render loop for better per-frame performance
        setup.process(state)
        read.process(state)
        resolveKeyframes.process(state)
        preUpdate.process(state)
        update.process(state)
        preRender.process(state)
        render.process(state)
        postRender.process(state)

        state.isProcessing = false

        if (runNextFrame && allowKeepAlive) {
            useDefaultElapsed = false
            scheduleNextBatch(processBatch)
        }
    }

    const wake = () => {
        runNextFrame = true
        useDefaultElapsed = true

        if (!state.isProcessing) {
            scheduleNextBatch(processBatch)
        }
    }

    const schedule = stepsOrder.reduce((acc, key) => {
        const step = steps[key]
        acc[key] = (process: Process, keepAlive = false, immediate = false) => {
            if (!runNextFrame) wake()

            return step.schedule(process, keepAlive, immediate)
        }
        return acc
    }, {} as Batcher)

    const cancel = (process: Process) => {
        for (let i = 0; i < stepsOrder.length; i++) {
            steps[stepsOrder[i]].cancel(process)
        }
    }

    return { schedule, cancel, state, steps }
}

import { AnyResolvedKeyframe } from "../../../animation/types"
import { CSSVariableToken } from "../../../animation/utils/is-css-variable"
import { color } from "../color"
import { Color } from "../types"
import { colorRegex } from "../utils/color-regex"
import { floatRegex } from "../utils/float-regex"
import { sanitize } from "../utils/sanitize"

function test(v: any) {
    return (
        isNaN(v) &&
        typeof v === "string" &&
        (v.match(floatRegex)?.length || 0) +
            (v.match(colorRegex)?.length || 0) >
            0
    )
}

const NUMBER_TOKEN = "number"
const COLOR_TOKEN = "color"
const VAR_TOKEN = "var"
const VAR_FUNCTION_TOKEN = "var("
const SPLIT_TOKEN = "${}"

export type ComplexValues = Array<
    CSSVariableToken | AnyResolvedKeyframe | Color
>

export interface ValueIndexes {
    color: number[]
    number: number[]
    var: number[]
}

export interface ComplexValueInfo {
    values: ComplexValues
    split: string[]
    indexes: ValueIndexes
    types: Array<keyof ValueIndexes>
}

// this regex consists of the `singleCssVariableRegex|rgbHSLValueRegex|digitRegex`
const complexRegex =
    /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu

export function analyseComplexValue(
    value: AnyResolvedKeyframe
): ComplexValueInfo {
    const originalValue = value.toString()

    const values: ComplexValues = []
    const indexes: ValueIndexes = {
        color: [],
        number: [],
        var: [],
    }
    const types: Array<keyof ValueIndexes> = []

    let i = 0
    const tokenised = originalValue.replace(complexRegex, (parsedValue) => {
        if (color.test(parsedValue)) {
            indexes.color.push(i)
            types.push(COLOR_TOKEN)
            values.push(color.parse(parsedValue))
        } else if (parsedValue.startsWith(VAR_FUNCTION_TOKEN)) {
            indexes.var.push(i)
            types.push(VAR_TOKEN)
            values.push(parsedValue)
        } else {
            indexes.number.push(i)
            types.push(NUMBER_TOKEN)
            values.push(parseFloat(parsedValue))
        }
        ++i
        return SPLIT_TOKEN
    })
    const split = tokenised.split(SPLIT_TOKEN)

    return { values, split, indexes, types }
}

function parseComplexValue(v: AnyResolvedKeyframe) {
    return analyseComplexValue(v).values
}

function buildTransformer({ split, types }: ComplexValueInfo) {
    const numSections = split.length
    return (v: Array<CSSVariableToken | Color | number | string>) => {
        let output = ""
        for (let i = 0; i < numSections; i++) {
            output += split[i]
            if (v[i] !== undefined) {
                const type = types[i]
                if (type === NUMBER_TOKEN) {
                    output += sanitize(v[i] as number)
                } else if (type === COLOR_TOKEN) {
                    output += color.transform(v[i] as Color)
                } else {
                    output += v[i]
                }
            }
        }

        return output
    }
}

function createTransformer(source: AnyResolvedKeyframe) {
    return buildTransformer(analyseComplexValue(source))
}

const convertNumbersToZero = (v: number | string) =>
    typeof v === "number" ? 0 : color.test(v) ? color.getAnimatableNone(v) : v

/**
 * Convert a parsed value to its zero equivalent, but preserve numbers
 * that act as divisors in CSS calc() expressions.
 *
 * analyseComplexValue extracts numbers from CSS strings and puts the
 * surrounding text into a `split` template array. For example:
 *   "calc(var(--gap) / 5)"  â†’  values: [var(--gap), 5]
 *                               split:  ["calc(", " / ", ")"]
 *
 * When building a zero-equivalent for animation, naively zeroing all
 * numbers turns the divisor into 0 â†’ "calc(var(--gap) / 0)" â†’ NaN.
 * We detect this by checking whether the text preceding a number
 * (split[i]) ends with "/" â€” the CSS calc division operator.
 */
const convertToZero = (
    value: ComplexValues[number],
    splitBefore: string
): ComplexValues[number] => {
    if (typeof value === "number") {
        return splitBefore?.trim().endsWith("/") ? value : 0
    }
    return convertNumbersToZero(value as string)
}

function getAnimatableNone(v: AnyResolvedKeyframe) {
    const info = analyseComplexValue(v)
    const transformer = buildTransformer(info)
    return transformer(
        info.values.map((value, i) => convertToZero(value, info.split[i]))
    )
}

export const complex = {
    test,
    parse: parseComplexValue,
    createTransformer,
    getAnimatableNone,
}

import { createElement, forwardRef } from 'react';
import { mergeClasses, toKebabCase, toPascalCase } from '@lucide/shared';
import { IconNode, LucideProps } from './types';
import Icon from './Icon';

/**
 * Create a Lucide icon component
 * @param {string} iconName
 * @param {array} iconNode
 * @returns {ForwardRefExoticComponent} LucideIcon
 */
const createLucideIcon = (iconName: string, iconNode: IconNode) => {
  const Component = forwardRef<SVGSVGElement, LucideProps>(({ className, ...props }, ref) =>
    createElement(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className,
      ),
      ...props,
    }),
  );

  Component.displayName = toPascalCase(iconName);

  return Component;
};

export default createLucideIcon;

import { Easing, isBezierDefinition } from "motion-utils"
import { supportsLinearEasing } from "../../../utils/supports/linear-easing"
import { generateLinearEasing } from "../utils/linear"
import { cubicBezierAsString } from "./cubic-bezier"
import { supportedWaapiEasing } from "./supported"

export function mapEasingToNativeEasing(
    easing: Easing | Easing[] | undefined,
    duration: number
): undefined | string | string[] {
    if (!easing) {
        return undefined
    } else if (typeof easing === "function") {
        return supportsLinearEasing()
            ? generateLinearEasing(easing, duration)
            : "ease-out"
    } else if (isBezierDefinition(easing)) {
        return cubicBezierAsString(easing)
    } else if (Array.isArray(easing)) {
        return easing.map(
            (segmentEasing) =>
                (mapEasingToNativeEasing(segmentEasing, duration) as string) ||
                supportedWaapiEasing.easeOut
        )
    } else {
        return supportedWaapiEasing[easing as keyof typeof supportedWaapiEasing]
    }
}

/*
  Bezier function generator
  This has been modified from GaÃ«tan Renaudeau's BezierEasing
  https://github.com/gre/bezier-easing/blob/master/src/index.js
  https://github.com/gre/bezier-easing/blob/master/LICENSE
  
  I've removed the newtonRaphsonIterate algo because in benchmarking it
  wasn't noticeably faster than binarySubdivision, indeed removing it
  usually improved times, depending on the curve.
  I also removed the lookup table, as for the added bundle size and loop we're
  only cutting ~4 or so subdivision iterations. I bumped the max iterations up
  to 12 to compensate and this still tended to be faster for no perceivable
  loss in accuracy.
  Usage
    const easeOut = cubicBezier(.17,.67,.83,.67);
    const x = easeOut(0.5); // returns 0.627...
*/

import { noop } from "../noop"

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
const calcBezier = (t: number, a1: number, a2: number) =>
    (((1.0 - 3.0 * a2 + 3.0 * a1) * t + (3.0 * a2 - 6.0 * a1)) * t + 3.0 * a1) *
    t

const subdivisionPrecision = 0.0000001
const subdivisionMaxIterations = 12

function binarySubdivide(
    x: number,
    lowerBound: number,
    upperBound: number,
    mX1: number,
    mX2: number
) {
    let currentX: number
    let currentT: number
    let i: number = 0

    do {
        currentT = lowerBound + (upperBound - lowerBound) / 2.0
        currentX = calcBezier(currentT, mX1, mX2) - x
        if (currentX > 0.0) {
            upperBound = currentT
        } else {
            lowerBound = currentT
        }
    } while (
        Math.abs(currentX) > subdivisionPrecision &&
        ++i < subdivisionMaxIterations
    )

    return currentT
}

/*#__NO_SIDE_EFFECTS__*/
export function cubicBezier(
    mX1: number,
    mY1: number,
    mX2: number,
    mY2: number
) {
    // If this is a linear gradient, return linear easing
    if (mX1 === mY1 && mX2 === mY2) return noop

    const getTForX = (aX: number) => binarySubdivide(aX, 0, 1, mX1, mX2)

    // If animation is at start/end, return t without easing
    return (t: number) =>
        t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2)
}

import { addUniqueItem, removeItem } from "./array"

type GenericHandler = (...args: any) => void

export class SubscriptionManager<Handler extends GenericHandler> {
    private subscriptions: Handler[] = []

    add(handler: Handler): VoidFunction {
        addUniqueItem(this.subscriptions, handler)
        return () => removeItem(this.subscriptions, handler)
    }

    notify(
        a?: Parameters<Handler>[0],
        b?: Parameters<Handler>[1],
        c?: Parameters<Handler>[2]
    ) {
        const numSubscriptions = this.subscriptions.length

        if (!numSubscriptions) return

        if (numSubscriptions === 1) {
            /**
             * If there's only a single handler we can just call it without invoking a loop.
             */
            this.subscriptions[0](a, b, c)
        } else {
            for (let i = 0; i < numSubscriptions; i++) {
                /**
                 * Check whether the handler exists before firing as it's possible
                 * the subscriptions were modified during this loop running.
                 */
                const handler = this.subscriptions[i]
                handler && handler(a, b, c)
            }
        }
    }

    getSize() {
        return this.subscriptions.length
    }

    clear() {
        this.subscriptions.length = 0
    }
}

import { MotionGlobalConfig, noop } from "motion-utils"
import { time } from "../frameloop/sync-time"
import { JSAnimation } from "./JSAnimation"
import { getFinalKeyframe } from "./keyframes/get-final"
import {
    KeyframeResolver as DefaultKeyframeResolver,
    flushKeyframeResolvers,
    ResolvedKeyframes,
} from "./keyframes/KeyframesResolver"
import { NativeAnimationExtended } from "./NativeAnimationExtended"
import {
    AnimationPlaybackControls,
    AnyResolvedKeyframe,
    TimelineWithFallback,
    ValueAnimationOptions,
} from "./types"
import { canAnimate } from "./utils/can-animate"
import { makeAnimationInstant } from "./utils/make-animation-instant"
import { WithPromise } from "./utils/WithPromise"
import { supportsBrowserAnimation } from "./waapi/supports/waapi"

/**
 * Maximum time allowed between an animation being created and it being
 * resolved for us to use the latter as the start time.
 *
 * This is to ensure that while we prefer to "start" an animation as soon
 * as it's triggered, we also want to avoid a visual jump if there's a big delay
 * between these two moments.
 */
const MAX_RESOLVE_DELAY = 40

type OptionsWithoutKeyframes<T extends AnyResolvedKeyframe> = Omit<
    ValueAnimationOptions<T>,
    "keyframes"
>

export class AsyncMotionValueAnimation<T extends AnyResolvedKeyframe>
    extends WithPromise
    implements AnimationPlaybackControls
{
    private createdAt: number

    private resolvedAt: number | undefined

    private _animation: AnimationPlaybackControls | undefined

    private pendingTimeline: TimelineWithFallback | undefined

    private keyframeResolver: DefaultKeyframeResolver | undefined

    private stopTimeline: VoidFunction | undefined

    constructor({
        autoplay = true,
        delay = 0,
        type = "keyframes",
        repeat = 0,
        repeatDelay = 0,
        repeatType = "loop",
        keyframes,
        name,
        motionValue,
        element,
        ...options
    }: ValueAnimationOptions<T>) {
        super()

        this.createdAt = time.now()

        const optionsWithDefaults: OptionsWithoutKeyframes<T> = {
            autoplay,
            delay,
            type,
            repeat,
            repeatDelay,
            repeatType,
            name,
            motionValue,
            element,
            ...options,
        }

        const KeyframeResolver =
            element?.KeyframeResolver || DefaultKeyframeResolver

        this.keyframeResolver = new KeyframeResolver(
            keyframes,
            (
                resolvedKeyframes: ResolvedKeyframes<T>,
                finalKeyframe: T,
                forced: boolean
            ) =>
                this.onKeyframesResolved(
                    resolvedKeyframes,
                    finalKeyframe,
                    optionsWithDefaults,
                    !forced
                ),
            name,
            motionValue,
            element
        )
        this.keyframeResolver?.scheduleResolve()
    }

    onKeyframesResolved(
        keyframes: ResolvedKeyframes<T>,
        finalKeyframe: T,
        options: OptionsWithoutKeyframes<T>,
        sync: boolean
    ) {
        this.keyframeResolver = undefined

        const { name, type, velocity, delay, isHandoff, onUpdate } = options
        this.resolvedAt = time.now()

        /**
         * If we can't animate this value with the resolved keyframes
         * then we should complete it immediately.
         */
        let canAnimateValue = true
        if (!canAnimate(keyframes, name, type, velocity)) {
            canAnimateValue = false

            if (MotionGlobalConfig.instantAnimations || !delay) {
                onUpdate?.(getFinalKeyframe(keyframes, options, finalKeyframe))
            }

            keyframes[0] = keyframes[keyframes.length - 1]

            makeAnimationInstant(options)
            options.repeat = 0
        }

        /**
         * Resolve startTime for the animation.
         *
         * This method uses the createdAt and resolvedAt to calculate the
         * animation startTime. *Ideally*, we would use the createdAt time as t=0
         * as the following frame would then be the first frame of the animation in
         * progress, which would feel snappier.
         *
         * However, if there's a delay (main thread work) between the creation of
         * the animation and the first committed frame, we prefer to use resolvedAt
         * to avoid a sudden jump into the animation.
         */
        const startTime = sync
            ? !this.resolvedAt
                ? this.createdAt
                : this.resolvedAt - this.createdAt > MAX_RESOLVE_DELAY
                ? this.resolvedAt
                : this.createdAt
            : undefined

        const resolvedOptions = {
            startTime,
            finalKeyframe,
            ...options,
            keyframes,
        }

        /**
         * Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
         * WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
         * optimised animation.
         *
         * Also skip WAAPI when keyframes aren't animatable, as the resolved
         * values may not be valid CSS and would trigger browser warnings.
         */
        const useWaapi =
            canAnimateValue &&
            !isHandoff &&
            supportsBrowserAnimation(resolvedOptions)
        const element = resolvedOptions.motionValue?.owner?.current

        let animation: AnimationPlaybackControls
        if (useWaapi) {
            try {
                animation = new NativeAnimationExtended({
                    ...resolvedOptions,
                    element,
                } as any)
            } catch {
                animation = new JSAnimation(resolvedOptions)
            }
        } else {
            animation = new JSAnimation(resolvedOptions)
        }

        animation.finished.then(() => {
            this.notifyFinished()
        }).catch(noop)

        if (this.pendingTimeline) {
            this.stopTimeline = animation.attachTimeline(this.pendingTimeline)
            this.pendingTimeline = undefined
        }

        this._animation = animation
    }

    get finished() {
        if (!this._animation) {
            return this._finished
        } else {
            return this.animation.finished
        }
    }

    then(onResolve: VoidFunction, _onReject?: VoidFunction) {
        return this.finished.finally(onResolve).then(() => {})
    }

    get animation(): AnimationPlaybackControls {
        if (!this._animation) {
            this.keyframeResolver?.resume()
            flushKeyframeResolvers()
        }

        return this._animation!
    }

    get duration() {
        return this.animation.duration
    }

    get iterationDuration() {
        return this.animation.iterationDuration
    }

    get time() {
        return this.animation.time
    }

    set time(newTime: number) {
        this.animation.time = newTime
    }

    get speed() {
        return this.animation.speed
    }

    get state() {
        return this.animation.state
    }

    set speed(newSpeed: number) {
        this.animation.speed = newSpeed
    }

    get startTime() {
        return this.animation.startTime
    }

    attachTimeline(timeline: TimelineWithFallback) {
        if (this._animation) {
            this.stopTimeline = this.animation.attachTimeline(timeline)
        } else {
            this.pendingTimeline = timeline
        }

        return () => this.stop()
    }

    play() {
        this.animation.play()
    }

    pause() {
        this.animation.pause()
    }

    complete() {
        this.animation.complete()
    }

    cancel() {
        if (this._animation) {
            this.animation.cancel()
        }

        this.keyframeResolver?.cancel()
    }

    /**
     * Bound to support return animation.stop pattern
     */
    stop = () => {
        if (this._animation) {
            this._animation.stop()
            this.stopTimeline?.()
        }

        this.keyframeResolver?.cancel()
    }
}

import { createProjectionNode } from "./create-projection-node"
import { DocumentProjectionNode } from "./DocumentProjectionNode"
import { IProjectionNode } from "./types"

export const rootProjectionNode: { current: IProjectionNode | undefined } = {
    current: undefined,
}

export const HTMLProjectionNode = createProjectionNode<HTMLElement>({
    measureScroll: (instance) => ({
        x: instance.scrollLeft,
        y: instance.scrollTop,
    }),
    defaultParent: () => {
        if (!rootProjectionNode.current) {
            const documentNode = new DocumentProjectionNode({})
            documentNode.mount(window)
            documentNode.setOptions({ layoutScroll: true })
            rootProjectionNode.current = documentNode
        }
        return rootProjectionNode.current
    },
    resetTransform: (instance, value) => {
        instance.style.transform = value !== undefined ? value : "none"
    },
    checkIsScrollRoot: (instance) =>
        Boolean(window.getComputedStyle(instance).position === "fixed"),
})

import { motionValue } from "../../value"
import { resolveVariant } from "./resolve-dynamic-variants"
import { isKeyframesTarget } from "./is-keyframes-target"
import type { AnimationDefinition } from "../../node/types"
import type {
    AnyResolvedKeyframe,
    UnresolvedValueKeyframe,
    ValueKeyframesDefinition,
} from "../../animation/types"
import type { VisualElement } from "../VisualElement"

/**
 * Set VisualElement's MotionValue, creating a new MotionValue for it if
 * it doesn't exist.
 */
function setMotionValue(
    visualElement: VisualElement,
    key: string,
    value: AnyResolvedKeyframe
) {
    if (visualElement.hasValue(key)) {
        visualElement.getValue(key)!.set(value)
    } else {
        visualElement.addValue(key, motionValue(value))
    }
}

function resolveFinalValueInKeyframes(
    v: ValueKeyframesDefinition
): UnresolvedValueKeyframe {
    // TODO maybe throw if v.length - 1 is placeholder token?
    return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v
}

export function setTarget(
    visualElement: VisualElement,
    definition: AnimationDefinition
) {
    const resolved = resolveVariant(visualElement, definition)
    let { transitionEnd = {}, transition = {}, ...target } = resolved || {}

    target = { ...target, ...transitionEnd }

    for (const key in target) {
        const value = resolveFinalValueInKeyframes(
            target[key as keyof typeof target] as any
        )
        setMotionValue(visualElement, key, value as AnyResolvedKeyframe)
    }
}

import { BoundingBox, Box, TransformPoint } from "motion-utils"

/**
 * Bounding boxes tend to be defined as top, left, right, bottom. For various operations
 * it's easier to consider each axis individually. This function returns a bounding box
 * as a map of single-axis min/max values.
 */
export function convertBoundingBoxToBox({
    top,
    left,
    right,
    bottom,
}: BoundingBox): Box {
    return {
        x: { min: left, max: right },
        y: { min: top, max: bottom },
    }
}

export function convertBoxToBoundingBox({ x, y }: Box): BoundingBox {
    return { top: y.min, right: x.max, bottom: y.max, left: x.min }
}

/**
 * Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
 * provided by Framer to allow measured points to be corrected for device scaling. This is used
 * when measuring DOM elements and DOM event points.
 */
export function transformBoxPoints(
    point: BoundingBox,
    transformPoint?: TransformPoint
) {
    if (!transformPoint) return point
    const topLeft = transformPoint({ x: point.left, y: point.top })
    const bottomRight = transformPoint({ x: point.right, y: point.bottom })

    return {
        top: topLeft.y,
        left: topLeft.x,
        bottom: bottomRight.y,
        right: bottomRight.x,
    }
}

import { isPressing } from "./state"

/**
 * Filter out events that are not "Enter" keys.
 */
function filterEvents(callback: (event: KeyboardEvent) => void) {
    return (event: KeyboardEvent) => {
        if (event.key !== "Enter") return
        callback(event)
    }
}

function firePointerEvent(target: EventTarget, type: "down" | "up" | "cancel") {
    target.dispatchEvent(
        new PointerEvent("pointer" + type, { isPrimary: true, bubbles: true })
    )
}

export const enableKeyboardPress = (
    focusEvent: FocusEvent,
    eventOptions: AddEventListenerOptions
) => {
    const element = focusEvent.currentTarget as HTMLElement
    if (!element) return

    const handleKeydown = filterEvents(() => {
        if (isPressing.has(element)) return

        firePointerEvent(element, "down")

        const handleKeyup = filterEvents(() => {
            firePointerEvent(element, "up")
        })

        const handleBlur = () => firePointerEvent(element, "cancel")

        element.addEventListener("keyup", handleKeyup, eventOptions)
        element.addEventListener("blur", handleBlur, eventOptions)
    })

    element.addEventListener("keydown", handleKeydown, eventOptions)

    /**
     * Add an event listener that fires on blur to remove the keydown events.
     */
    element.addEventListener(
        "blur",
        () => element.removeEventListener("keydown", handleKeydown),
        eventOptions
    )
}

/**
 * Taken from https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/compose-refs.tsx
 */
import * as React from "react"

type PossibleRef<T> = React.Ref<T> | undefined

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef<T>(ref: PossibleRef<T>, value: T): void | (() => void) {
    if (typeof ref === "function") {
        return ref(value)
    } else if (ref !== null && ref !== undefined) {
        ;(ref as React.MutableRefObject<T>).current = value
    }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
    return (node) => {
        let hasCleanup = false
        const cleanups = refs.map((ref) => {
            const cleanup = setRef(ref, node)
            if (!hasCleanup && typeof cleanup === "function") {
                hasCleanup = true
            }
            return cleanup
        })
        // React <19 will log an error to the console if a callback ref returns a
        // value. We don't use ref cleanups internally so this will only happen if a
        // user's ref callback returns a value, which we only expect if they are
        // using the cleanup functionality added in React 19.
        if (hasCleanup) {
            return () => {
                for (let i = 0; i < cleanups.length; i++) {
                    const cleanup = cleanups[i]
                    if (typeof cleanup === "function") {
                        cleanup()
                    } else {
                        setRef(refs[i], null)
                    }
                }
            }
        }
    }
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
function useComposedRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useCallback(composeRefs(...refs), refs)
}

export { useComposedRefs }

import { Feature, addDomEvent } from "motion-dom"
import { pipe } from "motion-utils"

export class FocusGesture extends Feature<Element> {
    private isActive = false

    onFocus() {
        let isFocusVisible = false

        /**
         * If this element doesn't match focus-visible then don't
         * apply whileHover. But, if matches throws that focus-visible
         * is not a valid selector then in that browser outline styles will be applied
         * to the element by default and we want to match that behaviour with whileFocus.
         */
        try {
            isFocusVisible = this.node.current!.matches(":focus-visible")
        } catch (e) {
            isFocusVisible = true
        }

        if (!isFocusVisible || !this.node.animationState) return

        this.node.animationState.setActive("whileFocus", true)
        this.isActive = true
    }

    onBlur() {
        if (!this.isActive || !this.node.animationState) return
        this.node.animationState.setActive("whileFocus", false)
        this.isActive = false
    }

    mount() {
        this.unmount = pipe(
            addDomEvent(this.node.current!, "focus", () => this.onFocus()),
            addDomEvent(this.node.current!, "blur", () => this.onBlur())
        ) as VoidFunction
    }

    unmount() {}
}

import type { AnyResolvedKeyframe } from "../../animation/types"
import type { MotionValue } from "../../value"
import type { MotionNodeOptions } from "../../node/types"
import { transformProps } from "../utils/keys-transform"
import { getDefaultValueType } from "../../value/types/maps/defaults"
import { createBox } from "../../projection/geometry/models"
import { DOMVisualElement } from "../dom/DOMVisualElement"
import type { DOMVisualElementOptions } from "../dom/types"
import { camelToDash } from "../dom/utils/camel-to-dash"
import type { ResolvedValues } from "../types"
import type { VisualElement, MotionStyle } from "../VisualElement"
import { SVGRenderState } from "./types"
import { buildSVGAttrs } from "./utils/build-attrs"
import { camelCaseAttributes } from "./utils/camel-case-attrs"
import { isSVGTag } from "./utils/is-svg-tag"
import { renderSVG } from "./utils/render"
import { scrapeMotionValuesFromProps } from "./utils/scrape-motion-values"
export class SVGVisualElement extends DOMVisualElement<
    SVGElement,
    SVGRenderState,
    DOMVisualElementOptions
> {
    type = "svg"

    isSVGTag = false

    getBaseTargetFromProps(
        props: MotionNodeOptions,
        key: string
    ): AnyResolvedKeyframe | MotionValue<any> | undefined {
        return props[key as keyof MotionNodeOptions]
    }

    readValueFromInstance(instance: SVGElement, key: string) {
        if (transformProps.has(key)) {
            const defaultType = getDefaultValueType(key)
            return defaultType ? defaultType.default || 0 : 0
        }
        key = !camelCaseAttributes.has(key) ? camelToDash(key) : key
        return instance.getAttribute(key)
    }

    measureInstanceViewportBox = createBox

    scrapeMotionValuesFromProps(
        props: MotionNodeOptions,
        prevProps: MotionNodeOptions,
        visualElement: VisualElement
    ) {
        return scrapeMotionValuesFromProps(props, prevProps, visualElement)
    }

    build(
        renderState: SVGRenderState,
        latestValues: ResolvedValues,
        props: MotionNodeOptions
    ) {
        buildSVGAttrs(
            renderState,
            latestValues,
            this.isSVGTag,
            props.transformTemplate,
            (props as any).style
        )
    }

    renderInstance(
        instance: SVGElement,
        renderState: SVGRenderState,
        styleProp?: MotionStyle | undefined,
        projection?: any
    ): void {
        renderSVG(instance, renderState, styleProp, projection)
    }

    mount(instance: SVGElement) {
        this.isSVGTag = isSVGTag(instance.tagName)
        super.mount(instance)
    }
}

import {
    invariant,
    millisecondsToSeconds,
    noop,
    secondsToMilliseconds,
} from "motion-utils"
import { setStyle } from "../render/dom/style-set"
import { supportsScrollTimeline } from "../utils/supports/scroll-timeline"
import { getFinalKeyframe } from "./keyframes/get-final"
import {
    AnimationPlaybackControlsWithThen,
    AnyResolvedKeyframe,
    DOMValueAnimationOptions,
    TimelineWithFallback,
} from "./types"
import { WithPromise } from "./utils/WithPromise"
import { startWaapiAnimation } from "./waapi/start-waapi-animation"
import { applyGeneratorOptions } from "./waapi/utils/apply-generator"

export interface NativeAnimationOptions<V extends AnyResolvedKeyframe = number>
    extends DOMValueAnimationOptions<V> {
    pseudoElement?: string
    startTime?: number
}

/**
 * NativeAnimation implements AnimationPlaybackControls for the browser's Web Animations API.
 */
export class NativeAnimation<T extends AnyResolvedKeyframe>
    extends WithPromise
    implements AnimationPlaybackControlsWithThen
{
    /**
     * The interfaced Web Animation API animation
     */
    protected animation: Animation

    protected finishedTime: number | null = null

    protected options: NativeAnimationOptions

    private allowFlatten: boolean

    private isStopped = false

    private isPseudoElement: boolean

    /**
     * Tracks a manually-set start time that takes precedence over WAAPI's
     * dynamic startTime. This is cleared when play() or time setter is called,
     * allowing WAAPI to take over timing.
     */
    protected manualStartTime: number | null = null

    constructor(options?: NativeAnimationOptions) {
        super()

        if (!options) return

        const {
            element,
            name,
            keyframes,
            pseudoElement,
            allowFlatten = false,
            finalKeyframe,
            onComplete,
        } = options as any

        this.isPseudoElement = Boolean(pseudoElement)

        this.allowFlatten = allowFlatten
        this.options = options

        invariant(
            typeof options.type !== "string",
            `Mini animate() doesn't support "type" as a string.`,
            "mini-spring"
        )

        const transition = applyGeneratorOptions(options)

        this.animation = startWaapiAnimation(
            element,
            name,
            keyframes,
            transition,
            pseudoElement
        )

        if (transition.autoplay === false) {
            this.animation.pause()
        }

        this.animation.onfinish = () => {
            this.finishedTime = this.time

            if (!pseudoElement) {
                const keyframe = getFinalKeyframe(
                    keyframes as any,
                    this.options as any,
                    finalKeyframe,
                    this.speed
                )
                if (this.updateMotionValue) {
                    this.updateMotionValue(keyframe)
                }

                /**
                 * If we can, we want to commit the final style as set by the user,
                 * rather than the computed keyframe value supplied by the animation.
                 * We always do this, even when a motion value is present, to prevent
                 * a visual flash in Firefox where the WAAPI animation's fill is removed
                 * during cancel() before the scheduled render can apply the correct value.
                 */
                setStyle(element, name, keyframe)

                this.animation.cancel()
            }

            onComplete?.()
            this.notifyFinished()
        }
    }

    updateMotionValue?(value?: T): void

    play() {
        if (this.isStopped) return

        this.manualStartTime = null
        this.animation.play()

        if (this.state === "finished") {
            this.updateFinished()
        }
    }

    pause() {
        this.animation.pause()
    }

    complete() {
        this.animation.finish?.()
    }

    cancel() {
        try {
            this.animation.cancel()
        } catch (e) {}
    }

    stop() {
        if (this.isStopped) return
        this.isStopped = true
        const { state } = this

        if (state === "idle" || state === "finished") {
            return
        }

        if (this.updateMotionValue) {
            this.updateMotionValue()
        } else {
            this.commitStyles()
        }

        if (!this.isPseudoElement) this.cancel()
    }

    /**
     * WAAPI doesn't natively have any interruption capabilities.
     *
     * In this method, we commit styles back to the DOM before cancelling
     * the animation.
     *
     * This is designed to be overridden by NativeAnimationExtended, which
     * will create a renderless JS animation and sample it twice to calculate
     * its current value, "previous" value, and therefore allow
     * Motion to also correctly calculate velocity for any subsequent animation
     * while deferring the commit until the next animation frame.
     */
    protected commitStyles() {
        const element = this.options?.element
        if (!this.isPseudoElement && element?.isConnected) {
            this.animation.commitStyles?.()
        }
    }

    get duration() {
        const duration =
            this.animation.effect?.getComputedTiming?.().duration || 0

        return millisecondsToSeconds(Number(duration))
    }

    get iterationDuration() {
        const { delay = 0 } = this.options || {}
        return this.duration + millisecondsToSeconds(delay)
    }

    get time() {
        return millisecondsToSeconds(Number(this.animation.currentTime) || 0)
    }

    set time(newTime: number) {
        const wasFinished = this.finishedTime !== null
        this.manualStartTime = null
        this.finishedTime = null
        this.animation.currentTime = secondsToMilliseconds(newTime)

        if (wasFinished) {
            this.animation.pause()
        }
    }

    /**
     * The playback speed of the animation.
     * 1 = normal speed, 2 = double speed, 0.5 = half speed.
     */
    get speed() {
        return this.animation.playbackRate
    }

    set speed(newSpeed: number) {
        // Allow backwards playback after finishing
        if (newSpeed < 0) this.finishedTime = null

        this.animation.playbackRate = newSpeed
    }

    get state() {
        return this.finishedTime !== null
            ? "finished"
            : this.animation.playState
    }

    get startTime() {
        return this.manualStartTime ?? Number(this.animation.startTime)
    }

    set startTime(newStartTime: number) {
        this.manualStartTime = this.animation.startTime = newStartTime
    }

    /**
     * Attaches a timeline to the animation, for instance the `ScrollTimeline`.
     */
    attachTimeline({
        timeline,
        rangeStart,
        rangeEnd,
        observe,
    }: TimelineWithFallback): VoidFunction {
        if (this.allowFlatten) {
            this.animation.effect?.updateTiming({ easing: "linear" })
        }

        this.animation.onfinish = null

        if (timeline && supportsScrollTimeline()) {
            this.animation.timeline = timeline as any

            if (rangeStart) (this.animation as any).rangeStart = rangeStart
            if (rangeEnd) (this.animation as any).rangeEnd = rangeEnd

            return noop<void>
        } else {
            return observe(this)
        }
    }
}

import { invariant, isNumericalString } from "motion-utils"
import { AnyResolvedKeyframe } from "../types"
import { CSSVariableToken, isCSSVariableToken } from "./is-css-variable"

/**
 * Parse Framer's special CSS variable format into a CSS token and a fallback.
 *
 * ```
 * `var(--foo, #fff)` => [`--foo`, '#fff']
 * ```
 *
 * @param current
 */

const splitCSSVariableRegex =
    // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
    /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
export function parseCSSVariable(current: string) {
    const match = splitCSSVariableRegex.exec(current)
    if (!match) return [,]

    const [, token1, token2, fallback] = match
    return [`--${token1 ?? token2}`, fallback]
}

const maxDepth = 4
export function getVariableValue(
    current: CSSVariableToken,
    element: Element,
    depth = 1
): AnyResolvedKeyframe | undefined {
    invariant(
        depth <= maxDepth,
        `Max CSS variable fallback depth detected in property "${current}". This may indicate a circular fallback dependency.`,
        "max-css-var-depth"
    )

    const [token, fallback] = parseCSSVariable(current)

    // No CSS variable detected
    if (!token) return

    // Attempt to read this CSS variable off the element
    const resolved = window.getComputedStyle(element).getPropertyValue(token)

    if (resolved) {
        const trimmed = resolved.trim()
        return isNumericalString(trimmed) ? parseFloat(trimmed) : trimmed
    }

    return isCSSVariableToken(fallback)
        ? getVariableValue(fallback, element, depth + 1)
        : fallback
}

import { alpha, scale } from "../numbers"
import { degrees, progressPercentage, px } from "../numbers/units"
import { ValueTypeMap } from "./types"

export const transformValueTypes: ValueTypeMap = {
    rotate: degrees,
    /**
     * Internal channel for `transition.path` orientToPath. Composed onto
     * `rotate` at the transform-build sites so the user's `rotate` is
     * never read or overwritten. Not part of `transformPropOrder`.
     */
    pathRotation: degrees,
    rotateX: degrees,
    rotateY: degrees,
    rotateZ: degrees,
    scale,
    scaleX: scale,
    scaleY: scale,
    scaleZ: scale,
    skew: degrees,
    skewX: degrees,
    skewY: degrees,
    distance: px,
    translateX: px,
    translateY: px,
    translateZ: px,
    x: px,
    y: px,
    z: px,
    perspective: px,
    transformPerspective: px,
    opacity: alpha,
    originX: progressPercentage,
    originY: progressPercentage,
    originZ: px,
}

import {
    clamp,
    millisecondsToSeconds,
    secondsToMilliseconds,
    warning,
} from "motion-utils"
import {
    AnimationState,
    KeyframeGenerator,
    SpringOptions,
    Transition,
    ValueAnimationOptions,
} from "../types"
import { generateLinearEasing } from "../waapi/utils/linear"
import {
    calcGeneratorDuration,
    maxGeneratorDuration,
} from "./utils/calc-duration"
import { createGeneratorEasing } from "./utils/create-generator-easing"

const springDefaults = {
    // Default spring physics
    stiffness: 100,
    damping: 10,
    mass: 1.0,
    velocity: 0.0,

    // Default duration/bounce-based options
    duration: 800, // in ms
    bounce: 0.3,
    visualDuration: 0.3, // in seconds

    // Rest thresholds
    restSpeed: {
        granular: 0.01,
        default: 2,
    },
    restDelta: {
        granular: 0.005,
        default: 0.5,
    },

    // Limits
    minDuration: 0.01, // in seconds
    maxDuration: 10.0, // in seconds
    minDamping: 0.05,
    maxDamping: 1,
}

function calcAngularFreq(undampedFreq: number, dampingRatio: number) {
    return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio)
}

const rootIterations = 12
function approximateRoot(
    envelope: (num: number) => number,
    derivative: (num: number) => number,
    initialGuess: number
): number {
    let result = initialGuess
    for (let i = 1; i < rootIterations; i++) {
        result = result - envelope(result) / derivative(result)
    }
    return result
}

/**
 * This is ported from the Framer implementation of duration-based spring resolution.
 */
const safeMin = 0.001

function findSpring({
    duration = springDefaults.duration,
    bounce = springDefaults.bounce,
    velocity = springDefaults.velocity,
    mass = springDefaults.mass,
}: SpringOptions) {
    let envelope: (num: number) => number
    let derivative: (num: number) => number

    warning(
        duration <= secondsToMilliseconds(springDefaults.maxDuration),
        "Spring duration must be 10 seconds or less",
        "spring-duration-limit"
    )

    let dampingRatio = 1 - bounce

    /**
     * Restrict dampingRatio and duration to within acceptable ranges.
     */
    dampingRatio = clamp(
        springDefaults.minDamping,
        springDefaults.maxDamping,
        dampingRatio
    )
    duration = clamp(
        springDefaults.minDuration,
        springDefaults.maxDuration,
        millisecondsToSeconds(duration)
    )

    if (dampingRatio < 1) {
        /**
         * Underdamped spring
         */
        envelope = (undampedFreq) => {
            const exponentialDecay = undampedFreq * dampingRatio
            const delta = exponentialDecay * duration
            const a = exponentialDecay - velocity
            const b = calcAngularFreq(undampedFreq, dampingRatio)
            const c = Math.exp(-delta)
            return safeMin - (a / b) * c
        }

        derivative = (undampedFreq) => {
            const exponentialDecay = undampedFreq * dampingRatio
            const delta = exponentialDecay * duration
            const d = delta * velocity + velocity
            const e =
                Math.pow(dampingRatio, 2) * Math.pow(undampedFreq, 2) * duration
            const f = Math.exp(-delta)
            const g = calcAngularFreq(Math.pow(undampedFreq, 2), dampingRatio)
            const factor = -envelope(undampedFreq) + safeMin > 0 ? -1 : 1
            return (factor * ((d - e) * f)) / g
        }
    } else {
        /**
         * Critically-damped spring
         */
        envelope = (undampedFreq) => {
            const a = Math.exp(-undampedFreq * duration)
            const b = (undampedFreq - velocity) * duration + 1
            return -safeMin + a * b
        }

        derivative = (undampedFreq) => {
            const a = Math.exp(-undampedFreq * duration)
            const b = (velocity - undampedFreq) * (duration * duration)
            return a * b
        }
    }

    const initialGuess = 5 / duration
    const undampedFreq = approximateRoot(envelope, derivative, initialGuess)

    duration = secondsToMilliseconds(duration)
    if (isNaN(undampedFreq)) {
        return {
            stiffness: springDefaults.stiffness,
            damping: springDefaults.damping,
            duration,
        }
    } else {
        const stiffness = Math.pow(undampedFreq, 2) * mass
        return {
            stiffness,
            damping: dampingRatio * 2 * Math.sqrt(mass * stiffness),
            duration,
        }
    }
}

const durationKeys = ["duration", "bounce"]
const physicsKeys = ["stiffness", "damping", "mass"]

function isSpringType(options: SpringOptions, keys: string[]) {
    return keys.some((key) => (options as any)[key] !== undefined)
}

function getSpringOptions(options: SpringOptions) {
    let springOptions = {
        velocity: springDefaults.velocity,
        stiffness: springDefaults.stiffness,
        damping: springDefaults.damping,
        mass: springDefaults.mass,
        isResolvedFromDuration: false,
        ...options,
    }
    // stiffness/damping/mass overrides duration/bounce
    if (
        !isSpringType(options, physicsKeys) &&
        isSpringType(options, durationKeys)
    ) {
        // Time-defined springs should ignore inherited velocity.
        // Velocity from interrupted animations can cause findSpring()
        // to compute wildly different spring parameters, leading to
        // massive oscillation on small-range animations.
        springOptions.velocity = 0

        if (options.visualDuration) {
            const visualDuration = options.visualDuration
            const root = (2 * Math.PI) / (visualDuration * 1.2)
            const stiffness = root * root
            const damping =
                2 *
                clamp(0.05, 1, 1 - (options.bounce || 0)) *
                Math.sqrt(stiffness)

            springOptions = {
                ...springOptions,
                mass: springDefaults.mass,
                stiffness,
                damping,
            }
        } else {
            const derived = findSpring({ ...options, velocity: 0 })

            springOptions = {
                ...springOptions,
                ...derived,
                mass: springDefaults.mass,
            }
            springOptions.isResolvedFromDuration = true
        }
    }

    return springOptions
}

function spring(
    optionsOrVisualDuration:
        | ValueAnimationOptions<number>
        | number = springDefaults.visualDuration,
    bounce = springDefaults.bounce
): KeyframeGenerator<number> {
    const options =
        typeof optionsOrVisualDuration !== "object"
            ? ({
                  visualDuration: optionsOrVisualDuration,
                  keyframes: [0, 1],
                  bounce,
              } as ValueAnimationOptions<number>)
            : optionsOrVisualDuration

    let { restSpeed, restDelta } = options

    const origin = options.keyframes[0]
    const target = options.keyframes[options.keyframes.length - 1]

    /**
     * This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
     * to reduce GC during animation.
     */
    const state: AnimationState<number> = { done: false, value: origin }

    const {
        stiffness,
        damping,
        mass,
        duration,
        velocity,
        isResolvedFromDuration,
    } = getSpringOptions({
        ...options,
        velocity: -millisecondsToSeconds(options.velocity || 0),
    })

    const initialVelocity = velocity || 0.0
    const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))

    const initialDelta = target - origin
    const undampedAngularFreq = millisecondsToSeconds(
        Math.sqrt(stiffness / mass)
    )

    /**
     * If we're working on a granular scale, use smaller defaults for determining
     * when the spring is finished.
     *
     * These defaults have been selected emprically based on what strikes a good
     * ratio between feeling good and finishing as soon as changes are imperceptible.
     */
    const isGranularScale = Math.abs(initialDelta) < 5
    restSpeed ||= isGranularScale
        ? springDefaults.restSpeed.granular
        : springDefaults.restSpeed.default
    restDelta ||= isGranularScale
        ? springDefaults.restDelta.granular
        : springDefaults.restDelta.default

    let resolveSpring: (v: number) => number
    let resolveVelocity: (t: number) => number

    // Underdamped coefficients, hoisted for use in the inlined next() hot path
    let angularFreq: number
    let A: number
    let sinCoeff: number
    let cosCoeff: number

    if (dampingRatio < 1) {
        angularFreq = calcAngularFreq(undampedAngularFreq, dampingRatio)

        A =
            (initialVelocity +
                dampingRatio * undampedAngularFreq * initialDelta) /
            angularFreq

        // Underdamped spring
        resolveSpring = (t: number) => {
            const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t)

            return (
                target -
                envelope *
                    (A * Math.sin(angularFreq * t) +
                        initialDelta * Math.cos(angularFreq * t))
            )
        }

        // Analytical derivative of underdamped spring (px/ms)
        sinCoeff =
            dampingRatio * undampedAngularFreq * A + initialDelta * angularFreq
        cosCoeff =
            dampingRatio * undampedAngularFreq * initialDelta - A * angularFreq
        resolveVelocity = (t: number) => {
            const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t)
            return envelope *
                (sinCoeff * Math.sin(angularFreq * t) +
                    cosCoeff * Math.cos(angularFreq * t))
        }
    } else if (dampingRatio === 1) {
        // Critically damped spring
        resolveSpring = (t: number) =>
            target -
            Math.exp(-undampedAngularFreq * t) *
                (initialDelta +
                    (initialVelocity + undampedAngularFreq * initialDelta) * t)

        // Analytical derivative of critically damped spring (px/ms)
        const C = initialVelocity + undampedAngularFreq * initialDelta
        resolveVelocity = (t: number) =>
            Math.exp(-undampedAngularFreq * t) *
                (undampedAngularFreq * C * t - initialVelocity)
    } else {
        // Overdamped spring
        const dampedAngularFreq =
            undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1)

        resolveSpring = (t: number) => {
            const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t)

            // When performing sinh or cosh values can hit Infinity so we cap them here
            const freqForT = Math.min(dampedAngularFreq * t, 300)

            return (
                target -
                (envelope *
                    ((initialVelocity +
                        dampingRatio * undampedAngularFreq * initialDelta) *
                        Math.sinh(freqForT) +
                        dampedAngularFreq *
                            initialDelta *
                            Math.cosh(freqForT))) /
                    dampedAngularFreq
            )
        }

        // Analytical derivative of overdamped spring (px/ms)
        const P =
            (initialVelocity +
                dampingRatio * undampedAngularFreq * initialDelta) /
            dampedAngularFreq
        const sinhCoeff =
            dampingRatio * undampedAngularFreq * P - initialDelta * dampedAngularFreq
        const coshCoeff =
            dampingRatio * undampedAngularFreq * initialDelta - P * dampedAngularFreq
        resolveVelocity = (t: number) => {
            const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t)
            const freqForT = Math.min(dampedAngularFreq * t, 300)
            return envelope *
                (sinhCoeff * Math.sinh(freqForT) +
                    coshCoeff * Math.cosh(freqForT))
        }
    }

    const generator = {
        calculatedDuration: isResolvedFromDuration ? duration || null : null,
        velocity: (t: number) => secondsToMilliseconds(resolveVelocity(t)),
        next: (t: number) => {
            /**
             * For underdamped physics springs we need both position and
             * velocity each tick. Compute shared trig values once to avoid
             * duplicate Math.exp/sin/cos calls on the hot path.
             */
            if (!isResolvedFromDuration && dampingRatio < 1) {
                const envelope = Math.exp(
                    -dampingRatio * undampedAngularFreq * t
                )
                const sin = Math.sin(angularFreq * t)
                const cos = Math.cos(angularFreq * t)

                const current =
                    target -
                    envelope *
                        (A * sin + initialDelta * cos)
                const currentVelocity = secondsToMilliseconds(
                    envelope *
                        (sinCoeff * sin + cosCoeff * cos)
                )

                state.done =
                    Math.abs(currentVelocity) <= restSpeed! &&
                    Math.abs(target - current) <= restDelta!
                state.value = state.done ? target : current

                return state
            }

            const current = resolveSpring(t)

            if (!isResolvedFromDuration) {
                const currentVelocity = secondsToMilliseconds(
                    resolveVelocity(t)
                )
                state.done =
                    Math.abs(currentVelocity) <= restSpeed! &&
                    Math.abs(target - current) <= restDelta!
            } else {
                state.done = t >= duration!
            }

            state.value = state.done ? target : current

            return state
        },
        toString: () => {
            const calculatedDuration = Math.min(
                calcGeneratorDuration(generator),
                maxGeneratorDuration
            )

            const easing = generateLinearEasing(
                (progress: number) =>
                    generator.next(calculatedDuration * progress).value,
                calculatedDuration,
                30
            )

            return calculatedDuration + "ms " + easing
        },
        toTransition: () => {},
    }

    return generator
}

spring.applyToOptions = (options: Transition) => {
    const generatorOptions = createGeneratorEasing(options as any, 100, spring)

    options.ease = generatorOptions.ease
    options.duration = secondsToMilliseconds(generatorOptions.duration)
    options.type = "keyframes"
    return options
}

export { spring }

import { int } from "../int"
import { alpha } from "../numbers"
import { px } from "../numbers/units"
import { transformValueTypes } from "./transform"
import { ValueTypeMap } from "./types"

export const numberValueTypes: ValueTypeMap = {
    // Border props
    borderWidth: px,
    borderTopWidth: px,
    borderRightWidth: px,
    borderBottomWidth: px,
    borderLeftWidth: px,
    borderRadius: px,
    borderTopLeftRadius: px,
    borderTopRightRadius: px,
    borderBottomRightRadius: px,
    borderBottomLeftRadius: px,

    // Positioning props
    width: px,
    maxWidth: px,
    height: px,
    maxHeight: px,
    top: px,
    right: px,
    bottom: px,
    left: px,
    inset: px,
    insetBlock: px,
    insetBlockStart: px,
    insetBlockEnd: px,
    insetInline: px,
    insetInlineStart: px,
    insetInlineEnd: px,

    // Spacing props
    padding: px,
    paddingTop: px,
    paddingRight: px,
    paddingBottom: px,
    paddingLeft: px,
    paddingBlock: px,
    paddingBlockStart: px,
    paddingBlockEnd: px,
    paddingInline: px,
    paddingInlineStart: px,
    paddingInlineEnd: px,
    margin: px,
    marginTop: px,
    marginRight: px,
    marginBottom: px,
    marginLeft: px,
    marginBlock: px,
    marginBlockStart: px,
    marginBlockEnd: px,
    marginInline: px,
    marginInlineStart: px,
    marginInlineEnd: px,

    // Typography
    fontSize: px,

    // Misc
    backgroundPositionX: px,
    backgroundPositionY: px,

    ...transformValueTypes,
    zIndex: int,

    // SVG
    fillOpacity: alpha,
    strokeOpacity: alpha,
    numOctaves: int,
}

import { HSLA, RGBA } from "../types"

// Adapted from https://gist.github.com/mjackson/5311256
function hueToRgb(p: number, q: number, t: number) {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
}

export function hslaToRgba({ hue, saturation, lightness, alpha }: HSLA): RGBA {
    hue /= 360
    saturation /= 100
    lightness /= 100

    let red = 0
    let green = 0
    let blue = 0

    if (!saturation) {
        red = green = blue = lightness
    } else {
        const q =
            lightness < 0.5
                ? lightness * (1 + saturation)
                : lightness + saturation - lightness * saturation
        const p = 2 * lightness - q

        red = hueToRgb(p, q, hue + 1 / 3)
        green = hueToRgb(p, q, hue)
        blue = hueToRgb(p, q, hue - 1 / 3)
    }

    return {
        red: Math.round(red * 255),
        green: Math.round(green * 255),
        blue: Math.round(blue * 255),
        alpha,
    }
}

import { invariant } from "../../errors"
import { noop } from "../../noop"
import { anticipate } from "../anticipate"
import { backIn, backInOut, backOut } from "../back"
import { circIn, circInOut, circOut } from "../circ"
import { cubicBezier } from "../cubic-bezier"
import { easeIn, easeInOut, easeOut } from "../ease"
import { Easing, EasingFunction } from "../types"
import { isBezierDefinition } from "./is-bezier-definition"

const easingLookup = {
    linear: noop,
    easeIn,
    easeInOut,
    easeOut,
    circIn,
    circInOut,
    circOut,
    backIn,
    backInOut,
    backOut,
    anticipate,
}

const isValidEasing = (easing: Easing): easing is keyof typeof easingLookup => {
    return typeof easing === "string"
}

export const easingDefinitionToFunction = (
    definition: Easing
): EasingFunction => {
    if (isBezierDefinition(definition)) {
        // If cubic bezier definition, create bezier curve
        invariant(
            definition.length === 4,
            `Cubic bezier arrays must contain four numerical values.`,
            "cubic-bezier-length"
        )

        const [x1, y1, x2, y2] = definition
        return cubicBezier(x1, y1, x2, y2)
    } else if (isValidEasing(definition)) {
        // Else lookup from table
        invariant(
            easingLookup[definition] !== undefined,
            `Invalid easing type '${definition}'`,
            "invalid-easing-type"
        )
        return easingLookup[definition]
    }

    return definition
}

import {
    createAnimationState,
    Feature,
    isAnimationControls,
    type VisualElement,
} from "motion-dom"

export class AnimationFeature extends Feature<unknown> {
    unmountControls?: () => void

    /**
     * We dynamically generate the AnimationState manager as it contains a reference
     * to the underlying animation library. We only want to load that if we load this,
     * so people can optionally code split it out using the `m` component.
     */
    constructor(node: VisualElement) {
        super(node)
        node.animationState ||= createAnimationState(node)
    }

    updateAnimationControlsSubscription() {
        const { animate } = this.node.getProps()
        if (isAnimationControls(animate)) {
            this.unmountControls = animate.subscribe(this.node)
        }
    }

    /**
     * Subscribe any provided AnimationControls to the component's VisualElement
     */
    mount() {
        this.updateAnimationControlsSubscription()
    }

    update() {
        const { animate } = this.node.getProps()
        const { animate: prevAnimate } = this.node.prevProps || {}
        if (animate !== prevAnimate) {
            this.updateAnimationControlsSubscription()
        }
    }

    unmount() {
        this.node.animationState!.reset()
        this.unmountControls?.()
    }
}

import { calcLength, mixNumber, type DragElastic, type ResolvedConstraints } from "motion-dom"
import {
    Axis,
    BoundingBox,
    Box,
    progress as calcProgress,
    clamp,
    Point,
} from "motion-utils"

/**
 * Apply constraints to a point. These constraints are both physical along an
 * axis, and an elastic factor that determines how much to constrain the point
 * by if it does lie outside the defined parameters.
 */
export function applyConstraints(
    point: number,
    { min, max }: Partial<Axis>,
    elastic?: Axis
): number {
    if (min !== undefined && point < min) {
        // If we have a min point defined, and this is outside of that, constrain
        point = elastic
            ? mixNumber(min, point, elastic.min)
            : Math.max(point, min)
    } else if (max !== undefined && point > max) {
        // If we have a max point defined, and this is outside of that, constrain
        point = elastic
            ? mixNumber(max, point, elastic.max)
            : Math.min(point, max)
    }

    return point
}

/**
 * Calculates a min projection point based on a pointer, pointer progress
 * within the drag target, and constraints.
 *
 * For instance if an element was 100px width, we were dragging from 0.25
 * along this axis, the pointer is at 200px, and there were no constraints,
 * we would calculate a min projection point of 175px.
 */
export function calcConstrainedMinPoint(
    point: number,
    length: number,
    progress: number,
    constraints?: Partial<Axis>,
    elastic?: Axis
): number {
    // Calculate a min point for this axis and apply it to the current pointer
    const min = point - length * progress

    return constraints ? applyConstraints(min, constraints, elastic) : min
}

/**
 * Calculate constraints in terms of the viewport when defined relatively to the
 * measured axis. This is measured from the nearest edge, so a max constraint of 200
 * on an axis with a max value of 300 would return a constraint of 500 - axis length
 */
export function calcRelativeAxisConstraints(
    axis: Axis,
    min?: number,
    max?: number
): Partial<Axis> {
    return {
        min: min !== undefined ? axis.min + min : undefined,
        max:
            max !== undefined
                ? axis.max + max - (axis.max - axis.min)
                : undefined,
    }
}

/**
 * Calculate constraints in terms of the viewport when
 * defined relatively to the measured bounding box.
 */
export function calcRelativeConstraints(
    layoutBox: Box,
    { top, left, bottom, right }: Partial<BoundingBox>
): ResolvedConstraints {
    return {
        x: calcRelativeAxisConstraints(layoutBox.x, left, right),
        y: calcRelativeAxisConstraints(layoutBox.y, top, bottom),
    }
}

/**
 * Calculate viewport constraints when defined as another viewport-relative axis
 */
export function calcViewportAxisConstraints(
    layoutAxis: Axis,
    constraintsAxis: Axis
) {
    let min = constraintsAxis.min - layoutAxis.min
    let max = constraintsAxis.max - layoutAxis.max

    // If the constraints axis is actually smaller than the layout axis then we can
    // flip the constraints
    if (
        constraintsAxis.max - constraintsAxis.min <
        layoutAxis.max - layoutAxis.min
    ) {
        ;[min, max] = [max, min]
    }

    return { min, max }
}

/**
 * Calculate viewport constraints when defined as another viewport-relative box
 */
export function calcViewportConstraints(layoutBox: Box, constraintsBox: Box) {
    return {
        x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
        y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y),
    }
}

/**
 * Calculate a transform origin relative to the source axis, between 0-1, that results
 * in an asthetically pleasing scale/transform needed to project from source to target.
 */
export function calcOrigin(source: Axis, target: Axis): number {
    let origin = 0.5
    const sourceLength = calcLength(source)
    const targetLength = calcLength(target)

    if (targetLength > sourceLength) {
        origin = calcProgress(target.min, target.max - sourceLength, source.min)
    } else if (sourceLength > targetLength) {
        origin = calcProgress(source.min, source.max - targetLength, target.min)
    }

    return clamp(0, 1, origin)
}

/**
 * Calculate the relative progress of one constraints box relative to another.
 * Imagine a page scroll bar. At the top, this would return 0, at the bottom, 1.
 * Anywhere in-between, a value between 0 and 1.
 *
 * This also handles flipped constraints, for instance a draggable container within
 * a smaller viewport like a scrollable view.
 */
export function calcProgressWithinConstraints(
    layoutBox: Box,
    constraintsBox: Box
): Point {
    return {
        x: calcOrigin(layoutBox.x, constraintsBox.x),
        y: calcOrigin(layoutBox.y, constraintsBox.y),
    }
}

/**
 * Calculate the an axis position based on two axes and a progress value.
 */
export function calcPositionFromProgress(
    axis: Axis,
    constraints: Axis,
    progress: number
): Axis {
    const axisLength = axis.max - axis.min
    const min = mixNumber(
        constraints.min,
        constraints.max - axisLength,
        progress
    )
    return { min, max: min + axisLength }
}

/**
 * Rebase the calculated viewport constraints relative to the layout.min point.
 */
export function rebaseAxisConstraints(
    layout: Axis,
    constraints: Partial<Axis>
): Partial<Axis> {
    const relativeConstraints: Partial<Axis> = {}

    if (constraints.min !== undefined) {
        relativeConstraints.min = constraints.min - layout.min
    }

    if (constraints.max !== undefined) {
        relativeConstraints.max = constraints.max - layout.min
    }

    return relativeConstraints
}

export const defaultElastic = 0.35
/**
 * Accepts a dragElastic prop and returns resolved elastic values for each axis.
 */
export function resolveDragElastic(
    dragElastic: DragElastic = defaultElastic
): Box {
    if (dragElastic === false) {
        dragElastic = 0
    } else if (dragElastic === true) {
        dragElastic = defaultElastic
    }

    return {
        x: resolveAxisElastic(dragElastic, "left", "right"),
        y: resolveAxisElastic(dragElastic, "top", "bottom"),
    }
}

export function resolveAxisElastic(
    dragElastic: DragElastic,
    minLabel: string,
    maxLabel: string
): Axis {
    return {
        min: resolvePointElastic(dragElastic, minLabel),
        max: resolvePointElastic(dragElastic, maxLabel),
    }
}

export function resolvePointElastic(
    dragElastic: DragElastic,
    label: string
): number {
    return typeof dragElastic === "number"
        ? dragElastic
        : dragElastic[label as keyof typeof dragElastic] || 0
}

import { warning } from "motion-utils"
import { isGenerator } from "../generators/utils/is-generator"
import { ResolvedKeyframes } from "../keyframes/KeyframesResolver"
import { AnimationGeneratorType } from "../types"
import { isAnimatable } from "./is-animatable"

function hasKeyframesChanged(keyframes: ResolvedKeyframes<any>) {
    const current = keyframes[0]
    if (keyframes.length === 1) return true
    for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i] !== current) return true
    }
}

export function canAnimate(
    keyframes: ResolvedKeyframes<any>,
    name?: string,
    type?: AnimationGeneratorType,
    velocity?: number
) {
    /**
     * Check if we're able to animate between the start and end keyframes,
     * and throw a warning if we're attempting to animate between one that's
     * animatable and another that isn't.
     */
    const originKeyframe = keyframes[0]
    if (originKeyframe === null) {
        return false
    }

    /**
     * These aren't traditionally animatable but we do support them.
     * In future we could look into making this more generic or replacing
     * this function with mix() === mixImmediate
     */
    if (name === "display" || name === "visibility") return true

    const targetKeyframe = keyframes[keyframes.length - 1]
    const isOriginAnimatable = isAnimatable(originKeyframe, name)
    const isTargetAnimatable = isAnimatable(targetKeyframe, name)

    warning(
        isOriginAnimatable === isTargetAnimatable,
        `You are trying to animate ${name} from "${originKeyframe}" to "${targetKeyframe}". "${
            isOriginAnimatable ? targetKeyframe : originKeyframe
        }" is not an animatable value.`,
        "value-not-animatable"
    )

    // Always skip if any of these are true
    if (!isOriginAnimatable || !isTargetAnimatable) {
        return false
    }

    return (
        hasKeyframesChanged(keyframes) ||
        ((type === "spring" || isGenerator(type)) && velocity)
    )
}

import { motionValue } from "../../value"
import { isMotionValue } from "../../value/utils/is-motion-value"

type MotionStyleLike = Record<string, any>

/**
 * Updates motion values from props changes.
 * Uses `any` type for element to avoid circular dependencies with VisualElement.
 */
export function updateMotionValuesFromProps(
    element: any,
    next: MotionStyleLike,
    prev: MotionStyleLike
) {
    for (const key in next) {
        const nextValue = next[key]
        const prevValue = prev[key]

        if (isMotionValue(nextValue)) {
            /**
             * If this is a motion value found in props or style, we want to add it
             * to our visual element's motion value map.
             */
            element.addValue(key, nextValue)
        } else if (isMotionValue(prevValue)) {
            /**
             * If we're swapping from a motion value to a static value,
             * create a new motion value from that
             */
            element.addValue(key, motionValue(nextValue, { owner: element }))
        } else if (prevValue !== nextValue) {
            /**
             * If this is a flat value that has changed, update the motion value
             * or create one if it doesn't exist. We only want to do this if we're
             * not handling the value with our animation state.
             */
            if (element.hasValue(key)) {
                const existingValue = element.getValue(key)!

                if (existingValue.liveStyle === true) {
                    existingValue.jump(nextValue)
                } else if (!existingValue.hasAnimated) {
                    existingValue.set(nextValue)
                }
            } else {
                const latestValue = element.getStaticValue(key)
                element.addValue(
                    key,
                    motionValue(
                        latestValue !== undefined ? latestValue : nextValue,
                        { owner: element }
                    )
                )
            }
        }
    }

    // Handle removed values
    for (const key in prev) {
        if (next[key] === undefined) element.removeValue(key)
    }

    return next
}

/**
 * Generate a list of every possible transform key.
 */
export const transformPropOrder = [
    "transformPerspective",
    "x",
    "y",
    "z",
    "translateX",
    "translateY",
    "translateZ",
    "scale",
    "scaleX",
    "scaleY",
    "rotate",
    "rotateX",
    "rotateY",
    "rotateZ",
    "skew",
    "skewX",
    "skewY",
]

/**
 * A quick lookup for transform props.
 *
 * `pathRotation` is a transform for routing purposes (skipped from raw
 * style application, wired to the transform composite, flags transform
 * dirty) but is intentionally NOT in `transformPropOrder` â€” it is
 * composed onto `rotate` at the build sites, not serialized in its own
 * slot, and must stay out of the order-array consumers (parse-transform,
 * unit-conversion, keys-position).
 */
export const transformProps = /*@__PURE__*/ (() =>
    new Set([...transformPropOrder, "pathRotation"]))()

import { FrameData, Process, Step } from "./types"

export function createRenderStep(runNextFrame: () => void): Step {
    /**
     * We create and reuse two queues, one to queue jobs for the current frame
     * and one for the next. We reuse to avoid triggering GC after x frames.
     */
    let thisFrame = new Set<Process>()
    let nextFrame = new Set<Process>()

    /**
     * Track whether we're currently processing jobs in this step. This way
     * we can decide whether to schedule new jobs for this frame or next.
     */
    let isProcessing = false

    let flushNextFrame = false

    /**
     * A set of processes which were marked keepAlive when scheduled.
     */
    const toKeepAlive = new WeakSet<Process>()

    let latestFrameData: FrameData = {
        delta: 0.0,
        timestamp: 0.0,
        isProcessing: false,
    }

    function triggerCallback(callback: Process) {
        if (toKeepAlive.has(callback)) {
            step.schedule(callback)
            runNextFrame()
        }

        callback(latestFrameData)
    }

    const step: Step = {
        /**
         * Schedule a process to run on the next frame.
         */
        schedule: (callback, keepAlive = false, immediate = false) => {
            const addToCurrentFrame = immediate && isProcessing
            const queue = addToCurrentFrame ? thisFrame : nextFrame

            if (keepAlive) toKeepAlive.add(callback)

            queue.add(callback)

            return callback
        },

        /**
         * Cancel the provided callback from running on the next frame.
         */
        cancel: (callback) => {
            nextFrame.delete(callback)
            toKeepAlive.delete(callback)
        },

        /**
         * Execute all schedule callbacks.
         */
        process: (frameData) => {
            latestFrameData = frameData

            /**
             * If we're already processing we've probably been triggered by a flushSync
             * inside an existing process. Instead of executing, mark flushNextFrame
             * as true and ensure we flush the following frame at the end of this one.
             */
            if (isProcessing) {
                flushNextFrame = true
                return
            }

            isProcessing = true

            // Swap this frame and the next to avoid GC
            const prevFrame = thisFrame
            thisFrame = nextFrame
            nextFrame = prevFrame

            // Execute this frame
            thisFrame.forEach(triggerCallback)

            // Clear the frame so no callbacks remain. This is to avoid
            // memory leaks should this render step not run for a while.
            thisFrame.clear()

            isProcessing = false

            if (flushNextFrame) {
                flushNextFrame = false
                step.process(frameData)
            }
        },
    }

    return step
}

import { pipe, warning } from "motion-utils"
import { AnyResolvedKeyframe } from "../../animation/types"
import { isCSSVariableToken } from "../../animation/utils/is-css-variable"
import { color } from "../../value/types/color"
import {
    analyseComplexValue,
    complex,
    ComplexValueInfo,
    ComplexValues,
} from "../../value/types/complex"
import { HSLA, RGBA } from "../../value/types/types"
import { mixColor } from "./color"
import { mixImmediate } from "./immediate"
import { mixNumber as mixNumberImmediate } from "./number"
import { invisibleValues, mixVisibility } from "./visibility"

type MixableArray = Array<number | RGBA | HSLA | string>
interface MixableObject {
    [key: string]: AnyResolvedKeyframe | RGBA | HSLA
}

function mixNumber(a: number, b: number) {
    return (p: number) => mixNumberImmediate(a, b, p)
}

export function getMixer<T>(a: T) {
    if (typeof a === "number") {
        return mixNumber
    } else if (typeof a === "string") {
        return isCSSVariableToken(a)
            ? mixImmediate
            : color.test(a)
            ? mixColor
            : mixComplex
    } else if (Array.isArray(a)) {
        return mixArray
    } else if (typeof a === "object") {
        return color.test(a) ? mixColor : mixObject
    }

    return mixImmediate
}

export function mixArray(a: MixableArray, b: MixableArray) {
    const output = [...a]
    const numValues = output.length

    const blendValue = a.map((v, i) => getMixer(v)(v as any, b[i] as any))

    return (p: number) => {
        for (let i = 0; i < numValues; i++) {
            output[i] = blendValue[i](p) as any
        }
        return output
    }
}

export function mixObject(a: MixableObject, b: MixableObject) {
    const output = { ...a, ...b }
    const blendValue: { [key: string]: (v: number) => any } = {}

    for (const key in output) {
        if (a[key] !== undefined && b[key] !== undefined) {
            blendValue[key] = getMixer(a[key])(
                a[key] as any,
                b[key] as any
            ) as any
        }
    }

    return (v: number) => {
        for (const key in blendValue) {
            output[key] = blendValue[key](v)
        }
        return output
    }
}

function matchOrder(
    origin: ComplexValueInfo,
    target: ComplexValueInfo
): ComplexValues {
    const orderedOrigin: ComplexValues = []

    const pointers = { color: 0, var: 0, number: 0 }

    for (let i = 0; i < target.values.length; i++) {
        const type = target.types[i]
        const originIndex = origin.indexes[type][pointers[type]]
        const originValue = origin.values[originIndex] ?? 0

        orderedOrigin[i] = originValue

        pointers[type]++
    }

    return orderedOrigin
}

export const mixComplex = (
    origin: AnyResolvedKeyframe,
    target: AnyResolvedKeyframe
) => {
    const template = complex.createTransformer(target)
    const originStats = analyseComplexValue(origin)
    const targetStats = analyseComplexValue(target)
    const canInterpolate =
        originStats.indexes.var.length === targetStats.indexes.var.length &&
        originStats.indexes.color.length === targetStats.indexes.color.length &&
        originStats.indexes.number.length >= targetStats.indexes.number.length

    if (canInterpolate) {
        if (
            (invisibleValues.has(origin as string) &&
                !targetStats.values.length) ||
            (invisibleValues.has(target as string) &&
                !originStats.values.length)
        ) {
            return mixVisibility(origin as string, target as string)
        }

        return pipe(
            mixArray(matchOrder(originStats, targetStats), targetStats.values),
            template
        )
    } else {
        warning(
            true,
            `Complex values '${origin}' and '${target}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`,
            "complex-values-different"
        )

        return mixImmediate(origin, target)
    }
}

import {
    addValueToWillChange,
    animateMotionValue,
    calcLength,
    convertBoundingBoxToBox,
    convertBoxToBoundingBox,
    createBox,
    eachAxis,
    frame,
    isElementTextInput,
    measurePageBox,
    mixNumber,
    PanInfo,
    percent,
    ResolvedConstraints,
    resize,
    setDragLock,
    Transition,
    type VisualElement,
} from "motion-dom"
import { Axis, Point, invariant } from "motion-utils"
import { addDomEvent, type LayoutUpdateData } from "motion-dom"
import { addPointerEvent } from "../../events/add-pointer-event"
import { extractEventInfo } from "../../events/event-info"
import { MotionProps } from "../../motion/types"
import { getContextWindow } from "../../utils/get-context-window"
import { isRefObject } from "../../utils/is-ref-object"
import { PanSession } from "../pan/PanSession"
import {
    applyConstraints,
    calcOrigin,
    calcRelativeConstraints,
    calcViewportConstraints,
    defaultElastic,
    rebaseAxisConstraints,
    resolveDragElastic,
} from "./utils/constraints"

export const elementDragControls = new WeakMap<
    VisualElement,
    VisualElementDragControls
>()

export interface DragControlOptions {
    /**
     * This distance after which dragging starts and a direction is locked in.
     *
     * @public
     */
    distanceThreshold?: number

    /**
     * Whether to immediately snap to the cursor when dragging starts.
     *
     * @public
     */
    snapToCursor?: boolean
}

type DragDirection = "x" | "y"

export class VisualElementDragControls {
    private visualElement: VisualElement<HTMLElement>

    private panSession?: PanSession

    private openDragLock: VoidFunction | null = null

    isDragging = false
    private currentDirection: DragDirection | null = null

    private originPoint: Point = { x: 0, y: 0 }

    /**
     * The permitted boundaries of travel, in pixels.
     */
    private constraints: ResolvedConstraints | false = false

    private hasMutatedConstraints = false

    /**
     * The per-axis resolved elastic values.
     */
    private elastic = createBox()

    /**
     * The latest pointer event. Used as fallback when the `cancel` and `stop` functions are called without arguments.
     */
    private latestPointerEvent: PointerEvent | null = null

    /**
     * The latest pan info. Used as fallback when the `cancel` and `stop` functions are called without arguments.
     */
    private latestPanInfo: PanInfo | null = null

    constructor(visualElement: VisualElement<HTMLElement>) {
        this.visualElement = visualElement
    }

    start(
        originEvent: PointerEvent,
        { snapToCursor = false, distanceThreshold }: DragControlOptions = {}
    ) {
        /**
         * Don't start dragging if this component is exiting
         */
        const { presenceContext } = this.visualElement
        if (presenceContext && presenceContext.isPresent === false) return

        const onSessionStart = (event: PointerEvent) => {
            if (snapToCursor) {
                this.snapToCursor(extractEventInfo(event).point)
            }
            this.stopAnimation()
        }

        const onStart = (event: PointerEvent, info: PanInfo) => {
            // Attempt to grab the global drag gesture lock - maybe make this part of PanSession
            const { drag, dragPropagation, onDragStart } = this.getProps()

            if (drag && !dragPropagation) {
                if (this.openDragLock) this.openDragLock()

                this.openDragLock = setDragLock(drag)

                // If we don 't have the lock, don't start dragging
                if (!this.openDragLock) return
            }

            this.latestPointerEvent = event
            this.latestPanInfo = info
            this.isDragging = true

            this.currentDirection = null

            this.resolveConstraints()

            if (this.visualElement.projection) {
                this.visualElement.projection.isAnimationBlocked = true
                this.visualElement.projection.target = undefined
            }

            /**
             * Record gesture origin and pointer offset
             */
            eachAxis((axis) => {
                let current = this.getAxisMotionValue(axis).get() || 0

                /**
                 * If the MotionValue is a percentage value convert to px
                 */
                if (percent.test(current)) {
                    const { projection } = this.visualElement

                    if (projection && projection.layout) {
                        const measuredAxis = projection.layout.layoutBox[axis]

                        if (measuredAxis) {
                            const length = calcLength(measuredAxis)
                            current = length * (parseFloat(current) / 100)
                        }
                    }
                }

                this.originPoint[axis] = current
            })

            // Fire onDragStart event
            if (onDragStart) {
                frame.update(() => onDragStart(event, info), false, true)
            }

            addValueToWillChange(this.visualElement, "transform")

            const { animationState } = this.visualElement
            animationState && animationState.setActive("whileDrag", true)
        }

        const onMove = (event: PointerEvent, info: PanInfo) => {
            this.latestPointerEvent = event
            this.latestPanInfo = info

            const {
                dragPropagation,
                dragDirectionLock,
                onDirectionLock,
                onDrag,
            } = this.getProps()

            // If we didn't successfully receive the gesture lock, early return.
            if (!dragPropagation && !this.openDragLock) return

            const { offset } = info
            // Attempt to detect drag direction if directionLock is true
            if (dragDirectionLock && this.currentDirection === null) {
                this.currentDirection = getCurrentDirection(offset)

                // If we've successfully set a direction, notify listener
                if (this.currentDirection !== null) {
                    onDirectionLock && onDirectionLock(this.currentDirection)
                }

                return
            }

            // Update each point with the latest position
            this.updateAxis("x", info.point, offset)
            this.updateAxis("y", info.point, offset)

            /**
             * Ideally we would leave the renderer to fire naturally at the end of
             * this frame but if the element is about to change layout as the result
             * of a re-render we want to ensure the browser can read the latest
             * bounding box to ensure the pointer and element don't fall out of sync.
             */
            this.visualElement.render()

            /**
             * This must fire after the render call as it might trigger a state
             * change which itself might trigger a layout update.
             */
            if (onDrag) {
                frame.update(() => onDrag(event, info), false, true)
            }
        }

        const onSessionEnd = (event: PointerEvent, info: PanInfo) => {
            this.latestPointerEvent = event
            this.latestPanInfo = info

            this.stop(event, info)

            this.latestPointerEvent = null
            this.latestPanInfo = null
        }

        const resumeAnimation = () => {
            const { dragSnapToOrigin: snap } = this.getProps()
            if (snap || this.constraints) {
                this.startAnimation({ x: 0, y: 0 })
            }
        }

        const { dragSnapToOrigin } = this.getProps()
        this.panSession = new PanSession(
            originEvent,
            {
                onSessionStart,
                onStart,
                onMove,
                onSessionEnd,
                resumeAnimation,
            },
            {
                transformPagePoint: this.visualElement.getTransformPagePoint(),
                dragSnapToOrigin,
                distanceThreshold,
                contextWindow: getContextWindow(this.visualElement),
                element: this.visualElement.current,
            }
        )
    }

    /**
     * @internal
     */
    stop(event?: PointerEvent, panInfo?: PanInfo) {
        const finalEvent = event || this.latestPointerEvent
        const finalPanInfo = panInfo || this.latestPanInfo

        const isDragging = this.isDragging
        this.cancel()
        if (!isDragging || !finalPanInfo || !finalEvent) return

        const { velocity } = finalPanInfo
        this.startAnimation(velocity)

        const { onDragEnd } = this.getProps()
        if (onDragEnd) {
            frame.postRender(() => onDragEnd(finalEvent, finalPanInfo))
        }
    }

    /**
     * @internal
     */
    cancel() {
        this.isDragging = false

        const { projection, animationState } = this.visualElement

        if (projection) {
            projection.isAnimationBlocked = false
        }

        this.endPanSession()

        const { dragPropagation } = this.getProps()

        if (!dragPropagation && this.openDragLock) {
            this.openDragLock()
            this.openDragLock = null
        }

        animationState && animationState.setActive("whileDrag", false)
    }

    /**
     * Clean up the pan session without modifying other drag state.
     * This is used during unmount to ensure event listeners are removed
     * without affecting projection animations or drag locks.
     * @internal
     */
    endPanSession() {
        this.panSession && this.panSession.end()
        this.panSession = undefined
    }

    private updateAxis(axis: DragDirection, _point: Point, offset?: Point) {
        const { drag } = this.getProps()

        // If we're not dragging this axis, do an early return.
        if (!offset || !shouldDrag(axis, drag, this.currentDirection)) return

        const axisValue = this.getAxisMotionValue(axis)
        let next = this.originPoint[axis] + offset[axis]

        // Apply constraints
        if (this.constraints && this.constraints[axis]) {
            next = applyConstraints(
                next,
                this.constraints[axis],
                this.elastic[axis]
            )
        }

        axisValue.set(next)
    }

    private resolveConstraints() {
        const { dragConstraints, dragElastic } = this.getProps()

        const layout =
            this.visualElement.projection &&
            !this.visualElement.projection.layout
                ? this.visualElement.projection.measure(false)
                : this.visualElement.projection?.layout

        const prevConstraints = this.constraints

        if (dragConstraints && isRefObject(dragConstraints)) {
            if (!this.constraints) {
                this.constraints = this.resolveRefConstraints()
            }
        } else {
            if (dragConstraints && layout) {
                this.constraints = calcRelativeConstraints(
                    layout.layoutBox,
                    dragConstraints
                )
            } else {
                this.constraints = false
            }
        }

        this.elastic = resolveDragElastic(dragElastic)

        /**
         * If we're outputting to external MotionValues, we want to rebase the measured constraints
         * from viewport-relative to component-relative. This only applies to relative (non-ref)
         * constraints, as ref-based constraints from calcViewportConstraints are already in the
         * correct coordinate space for the motion value transform offset.
         */
        if (
            prevConstraints !== this.constraints &&
            !isRefObject(dragConstraints) &&
            layout &&
            this.constraints &&
            !this.hasMutatedConstraints
        ) {
            eachAxis((axis) => {
                if (
                    this.constraints !== false &&
                    this.getAxisMotionValue(axis)
                ) {
                    this.constraints[axis] = rebaseAxisConstraints(
                        layout.layoutBox[axis],
                        this.constraints[axis]
                    )
                }
            })
        }
    }

    private resolveRefConstraints() {
        const { dragConstraints: constraints, onMeasureDragConstraints } =
            this.getProps()
        if (!constraints || !isRefObject(constraints)) return false

        const constraintsElement = constraints.current as HTMLElement

        invariant(
            constraintsElement !== null,
            "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.",
            "drag-constraints-ref"
        )

        const { projection } = this.visualElement

        // TODO
        if (!projection || !projection.layout) return false

        /**
         * Refresh the root scroll offset so the constraint's viewport box
         * translates to correct page coordinates. The scroll captured at
         * drag mount can be stale if the document was scrolled afterwards â€”
         * e.g. via the browser restoring scroll on refresh, or an ancestor
         * layout effect running after this element's mount (#2829).
         *
         * Clear the cached scroll first so `updateScroll` bypasses its
         * per-animationId cache and re-reads the live value.
         */
        if (projection.root) {
            projection.root.scroll = undefined
            projection.root.updateScroll()
        }

        const constraintsBox = measurePageBox(
            constraintsElement,
            projection.root!,
            this.visualElement.getTransformPagePoint()
        )

        let measuredConstraints = calcViewportConstraints(
            projection.layout.layoutBox,
            constraintsBox
        )

        /**
         * If there's an onMeasureDragConstraints listener we call it and
         * if different constraints are returned, set constraints to that
         */
        if (onMeasureDragConstraints) {
            const userConstraints = onMeasureDragConstraints(
                convertBoxToBoundingBox(measuredConstraints)
            )

            this.hasMutatedConstraints = !!userConstraints

            if (userConstraints) {
                measuredConstraints = convertBoundingBoxToBox(userConstraints)
            }
        }

        return measuredConstraints
    }

    private startAnimation(velocity: Point) {
        const {
            drag,
            dragMomentum,
            dragElastic,
            dragTransition,
            dragSnapToOrigin,
            onDragTransitionEnd,
        } = this.getProps()

        const constraints: Partial<ResolvedConstraints> = this.constraints || {}

        const momentumAnimations = eachAxis((axis) => {
            if (!shouldDrag(axis, drag, this.currentDirection)) {
                return
            }

            let transition = (constraints && constraints[axis]) || {}

            if (
                dragSnapToOrigin === true ||
                (dragSnapToOrigin as unknown) === axis
            )
                transition = { min: 0, max: 0 }

            /**
             * Overdamp the boundary spring if `dragElastic` is disabled. There's still a frame
             * of spring animations so we should look into adding a disable spring option to `inertia`.
             * We could do something here where we affect the `bounceStiffness` and `bounceDamping`
             * using the value of `dragElastic`.
             */
            const bounceStiffness = dragElastic ? 200 : 1000000
            const bounceDamping = dragElastic ? 40 : 10000000

            const inertia: Transition = {
                type: "inertia",
                velocity: dragMomentum ? velocity[axis] : 0,
                bounceStiffness,
                bounceDamping,
                timeConstant: 750,
                restDelta: 1,
                restSpeed: 10,
                ...dragTransition,
                ...transition,
            }

            // If we're not animating on an externally-provided `MotionValue` we can use the
            // component's animation controls which will handle interactions with whileHover (etc),
            // otherwise we just have to animate the `MotionValue` itself.
            return this.startAxisValueAnimation(axis, inertia)
        })

        // Run all animations and then resolve the new drag constraints.
        return Promise.all(momentumAnimations).then(onDragTransitionEnd)
    }

    private startAxisValueAnimation(
        axis: DragDirection,
        transition: Transition
    ) {
        const axisValue = this.getAxisMotionValue(axis)

        addValueToWillChange(this.visualElement, axis)

        return axisValue.start(
            animateMotionValue(
                axis,
                axisValue,
                0,
                transition,
                this.visualElement,
                false
            )
        )
    }

    private stopAnimation() {
        eachAxis((axis) => this.getAxisMotionValue(axis).stop())
    }

    /**
     * Drag works differently depending on which props are provided.
     *
     * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
     * - Otherwise, we apply the delta to the x/y motion values.
     */
    private getAxisMotionValue(axis: DragDirection) {
        const dragKey =
            `_drag${axis.toUpperCase()}` as `_drag${Uppercase<DragDirection>}`
        const props = this.visualElement.getProps()
        const externalMotionValue = props[dragKey]

        return externalMotionValue
            ? externalMotionValue
            : this.visualElement.getValue(
                  axis,
                  this.visualElement.latestValues[axis] ?? 0
              )
    }

    private snapToCursor(point: Point) {
        eachAxis((axis) => {
            const { drag } = this.getProps()

            // If we're not dragging this axis, do an early return.
            if (!shouldDrag(axis, drag, this.currentDirection)) return

            const { projection } = this.visualElement
            const axisValue = this.getAxisMotionValue(axis)

            if (projection && projection.layout) {
                const { min, max } = projection.layout.layoutBox[axis]

                /**
                 * The layout measurement includes the current transform value,
                 * so we need to add it back to get the correct snap position.
                 * This fixes an issue where elements with initial coordinates
                 * would snap to the wrong position on the first drag.
                 */
                const current = axisValue.get() || 0

                axisValue.set(point[axis] - mixNumber(min, max, 0.5) + current)
            }
        })
    }

    /**
     * When the viewport resizes we want to check if the measured constraints
     * have changed and, if so, reposition the element within those new constraints
     * relative to where it was before the resize.
     */
    scalePositionWithinConstraints() {
        if (!this.visualElement.current) return

        const { drag, dragConstraints } = this.getProps()
        const { projection } = this.visualElement
        if (!isRefObject(dragConstraints) || !projection || !this.constraints)
            return

        /**
         * Stop current animations as there can be visual glitching if we try to do
         * this mid-animation
         */
        this.stopAnimation()

        /**
         * Record the relative position of the dragged element relative to the
         * constraints box and save as a progress value.
         */
        const boxProgress = { x: 0, y: 0 }
        eachAxis((axis) => {
            const axisValue = this.getAxisMotionValue(axis)
            if (axisValue && this.constraints !== false) {
                const latest = axisValue.get()
                boxProgress[axis] = calcOrigin(
                    { min: latest, max: latest },
                    this.constraints[axis] as Axis
                )
            }
        })

        /**
         * Update the layout of this element and resolve the latest drag constraints
         */
        const { transformTemplate } = this.visualElement.getProps()
        this.visualElement.current.style.transform = transformTemplate
            ? transformTemplate({}, "")
            : "none"
        projection.root && projection.root.updateScroll()
        projection.updateLayout()

        /**
         * Reset constraints so resolveConstraints() will recalculate them
         * with the freshly measured layout rather than returning the cached value.
         */
        this.constraints = false
        this.resolveConstraints()

        /**
         * For each axis, calculate the current progress of the layout axis
         * within the new constraints.
         */
        eachAxis((axis) => {
            if (!shouldDrag(axis, drag, null)) return

            /**
             * Calculate a new transform based on the previous box progress
             */
            const axisValue = this.getAxisMotionValue(axis)
            const { min, max } = (this.constraints as ResolvedConstraints)[
                axis
            ] as Axis
            axisValue.set(mixNumber(min, max, boxProgress[axis]))
        })

        /**
         * Flush the updated transform to the DOM synchronously to prevent
         * a visual flash at the element's CSS layout position (0,0) when
         * the transform was stripped for measurement.
         */
        this.visualElement.render()
    }

    addListeners() {
        if (!this.visualElement.current) return
        elementDragControls.set(this.visualElement, this)
        const element = this.visualElement.current

        /**
         * Attach a pointerdown event listener on this DOM element to initiate drag tracking.
         */
        const stopPointerListener = addPointerEvent(
            element,
            "pointerdown",
            (event) => {
                const { drag, dragListener = true } = this.getProps()
                const target = event.target as Element

                /**
                 * Only block drag if clicking on a text input child element
                 * (input, textarea, select, contenteditable) where users might
                 * want to select text or interact with the control.
                 *
                 * Buttons and links don't block drag since they don't have
                 * click-and-move actions of their own.
                 */
                const isClickingTextInputChild =
                    target !== element && isElementTextInput(target)

                if (drag && dragListener && !isClickingTextInputChild) {
                    this.start(event)
                }
            }
        )

        /**
         * If using ref-based constraints, observe both the draggable element
         * and the constraint container for size changes via ResizeObserver.
         * Setup is deferred because dragConstraints.current is null when
         * addListeners first runs (React hasn't committed the ref yet).
         */
        let stopResizeObservers: VoidFunction | undefined

        const measureDragConstraints = () => {
            const { dragConstraints } = this.getProps()
            if (isRefObject(dragConstraints) && dragConstraints.current) {
                this.constraints = this.resolveRefConstraints()

                if (!stopResizeObservers) {
                    stopResizeObservers = startResizeObservers(
                        element,
                        dragConstraints.current as HTMLElement,
                        () => this.scalePositionWithinConstraints()
                    )
                }
            }
        }

        const { projection } = this.visualElement

        const stopMeasureLayoutListener = projection!.addEventListener(
            "measure",
            measureDragConstraints
        )

        if (projection && !projection!.layout) {
            projection.root && projection.root.updateScroll()
            projection.updateLayout()
        }

        frame.read(measureDragConstraints)

        /**
         * Attach a window resize listener to scale the draggable target within its defined
         * constraints as the window resizes.
         */
        const stopResizeListener = addDomEvent(window, "resize", () =>
            this.scalePositionWithinConstraints()
        )

        /**
         * If the element's layout changes, calculate the delta and apply that to
         * the drag gesture's origin point.
         */
        const stopLayoutUpdateListener = projection!.addEventListener(
            "didUpdate",
            (({ delta, hasLayoutChanged }: LayoutUpdateData) => {
                if (this.isDragging && hasLayoutChanged) {
                    eachAxis((axis) => {
                        const motionValue = this.getAxisMotionValue(axis)
                        if (!motionValue) return

                        this.originPoint[axis] += delta[axis].translate
                        motionValue.set(
                            motionValue.get() + delta[axis].translate
                        )
                    })

                    this.visualElement.render()
                }
            }) as any
        )

        return () => {
            stopResizeListener()
            stopPointerListener()
            stopMeasureLayoutListener()
            stopLayoutUpdateListener && stopLayoutUpdateListener()
            stopResizeObservers && stopResizeObservers()
        }
    }

    getProps(): MotionProps {
        const props = this.visualElement.getProps()
        const {
            drag = false,
            dragDirectionLock = false,
            dragPropagation = false,
            dragConstraints = false,
            dragElastic = defaultElastic,
            dragMomentum = true,
        } = props
        return {
            ...props,
            drag,
            dragDirectionLock,
            dragPropagation,
            dragConstraints,
            dragElastic,
            dragMomentum,
        }
    }
}

function skipFirstCall(callback: VoidFunction): VoidFunction {
    let isFirst = true
    return () => {
        if (isFirst) {
            isFirst = false
            return
        }
        callback()
    }
}

function startResizeObservers(
    element: HTMLElement,
    constraintsElement: HTMLElement,
    onResize: VoidFunction
): VoidFunction {
    const stopElement = resize(element, skipFirstCall(onResize))
    const stopContainer = resize(constraintsElement, skipFirstCall(onResize))
    return () => {
        stopElement()
        stopContainer()
    }
}

function shouldDrag(
    direction: DragDirection,
    drag: boolean | DragDirection | undefined,
    currentDirection: null | DragDirection
) {
    return (
        (drag === true || drag === direction) &&
        (currentDirection === null || currentDirection === direction)
    )
}

/**
 * Based on an x/y offset determine the current drag direction. If both axis' offsets are lower
 * than the provided threshold, return `null`.
 *
 * @param offset - The x/y offset from origin.
 * @param lockThreshold - (Optional) - the minimum absolute offset before we can determine a drag direction.
 */
function getCurrentDirection(
    offset: Point,
    lockThreshold = 10
): DragDirection | null {
    let direction: DragDirection | null = null

    if (Math.abs(offset.y) > lockThreshold) {
        direction = "y"
    } else if (Math.abs(offset.x) > lockThreshold) {
        direction = "x"
    }

    return direction
}

export function expectsResolvedDragConstraints({
    dragConstraints,
    onMeasureDragConstraints,
}: MotionProps) {
    return isRefObject(dragConstraints) && !!onMeasureDragConstraints
}

import { isHTMLElement } from "../../utils/is-html-element"
import { ElementOrSelector } from "../../utils/resolve-elements"
import { isDragActive } from "../drag/state/is-active"
import { EventOptions } from "../types"
import { isNodeOrChild } from "../utils/is-node-or-child"
import { isPrimaryPointer } from "../utils/is-primary-pointer"
import { setupGesture } from "../utils/setup"
import { OnPressStartEvent } from "./types"
import { isElementKeyboardAccessible } from "./utils/is-keyboard-accessible"
import { enableKeyboardPress } from "./utils/keyboard"
import { isPressing } from "./utils/state"

/**
 * Filter out events that are not primary pointer events, or are triggering
 * while a Motion gesture is active.
 */
function isValidPressEvent(event: PointerEvent) {
    return isPrimaryPointer(event) && !isDragActive()
}

const claimedPointerDownEvents = new WeakSet<Event>()

export interface PointerEventOptions extends EventOptions {
    useGlobalTarget?: boolean
    stopPropagation?: boolean
}

/**
 * Create a press gesture.
 *
 * Press is different to `"pointerdown"`, `"pointerup"` in that it
 * automatically filters out secondary pointer events like right
 * click and multitouch.
 *
 * It also adds accessibility support for keyboards, where
 * an element with a press gesture will receive focus and
 *  trigger on Enter `"keydown"` and `"keyup"` events.
 *
 * This is different to a browser's `"click"` event, which does
 * respond to keyboards but only for the `"click"` itself, rather
 * than the press start and end/cancel. The element also needs
 * to be focusable for this to work, whereas a press gesture will
 * make an element focusable by default.
 *
 * @public
 */
export function press(
    targetOrSelector: ElementOrSelector,
    onPressStart: OnPressStartEvent,
    options: PointerEventOptions = {}
): VoidFunction {
    const [targets, eventOptions, cancelEvents] = setupGesture(
        targetOrSelector,
        options
    )

    const startPress = (startEvent: PointerEvent) => {
        const target = startEvent.currentTarget as Element

        if (!isValidPressEvent(startEvent)) return
        if (claimedPointerDownEvents.has(startEvent)) return

        isPressing.add(target)

        if (options.stopPropagation) {
            claimedPointerDownEvents.add(startEvent)
        }

        const onPressEnd = onPressStart(target, startEvent)

        /**
         * End listeners run in the capture phase so a descendant calling
         * stopPropagation() in its own pointerup handler can't prevent the
         * press gesture from ending. This also keeps the gesture-end
         * ordering consistent with the drag gesture. See #2794.
         */
        const endEventOptions = { ...eventOptions, capture: true }

        const onPointerEnd = (endEvent: PointerEvent, success: boolean) => {
            window.removeEventListener(
                "pointerup",
                onPointerUp,
                endEventOptions
            )
            window.removeEventListener(
                "pointercancel",
                onPointerCancel,
                endEventOptions
            )

            if (isPressing.has(target)) {
                isPressing.delete(target)
            }

            if (!isValidPressEvent(endEvent)) {
                return
            }

            if (typeof onPressEnd === "function") {
                onPressEnd(endEvent, { success })
            }
        }

        const onPointerUp = (upEvent: PointerEvent) => {
            onPointerEnd(
                upEvent,
                (target as any) === window ||
                    (target as any) === document ||
                    options.useGlobalTarget ||
                    isNodeOrChild(target, upEvent.target as Element)
            )
        }

        const onPointerCancel = (cancelEvent: PointerEvent) => {
            onPointerEnd(cancelEvent, false)
        }

        window.addEventListener("pointerup", onPointerUp, endEventOptions)
        window.addEventListener(
            "pointercancel",
            onPointerCancel,
            endEventOptions
        )
    }

    targets.forEach((target: EventTarget) => {
        const pointerDownTarget = options.useGlobalTarget ? window : target
        pointerDownTarget.addEventListener(
            "pointerdown",
            startPress as EventListener,
            eventOptions
        )

        if (isHTMLElement(target)) {
            target.addEventListener("focus", (event) =>
                enableKeyboardPress(event as FocusEvent, eventOptions)
            )

            if (
                !isElementKeyboardAccessible(target) &&
                !target.hasAttribute("tabindex")
            ) {
                target.tabIndex = 0
            }
        }
    })

    return cancelEvents
}

import {
    Axis,
    AxisDelta,
    Box,
    clamp,
    Delta,
    noop,
    Point,
    SubscriptionManager,
} from "motion-utils"
import { animateSingleValue } from "../../animation/animate/single-value"
import { JSAnimation } from "../../animation/JSAnimation"
import { getOptimisedAppearId } from "../../animation/optimized-appear/get-appear-id"
import {
    MotionPath,
    PathInterpolator,
    Transition,
    ValueAnimationOptions,
} from "../../animation/types"
import { getValueTransition } from "../../animation/utils/get-value-transition"
import { cancelFrame, frame, frameData, frameSteps } from "../../frameloop"
import { microtask } from "../../frameloop/microtask"
import { time } from "../../frameloop/sync-time"
import type { Process } from "../../frameloop/types"
import { HTMLVisualElement } from "../../render/html/HTMLVisualElement"
import type { ResolvedValues } from "../../render/types"
import { scaleCorrectors } from "../../render/utils/is-forced-motion-value"
import type { MotionStyle, VisualElement } from "../../render/VisualElement"
import { statsBuffer } from "../../stats/buffer"
import { delay } from "../../utils/delay"
import { isSVGElement } from "../../utils/is-svg-element"
import { isSVGSVGElement } from "../../utils/is-svg-svg-element"
import { mixNumber } from "../../utils/mix/number"
import { MotionValue, motionValue } from "../../value"
import { resolveMotionValue } from "../../value/utils/resolve-motion-value"
import { mixValues } from "../animation/mix-values"
import { copyAxisDeltaInto, copyAxisInto, copyBoxInto } from "../geometry/copy"
import {
    applyBoxDelta,
    applyTreeDeltas,
    transformBox,
    translateAxis,
} from "../geometry/delta-apply"
import {
    calcBoxDelta,
    calcLength,
    calcRelativeBox,
    calcRelativePosition,
    isNear,
} from "../geometry/delta-calc"
import { removeBoxTransforms } from "../geometry/delta-remove"
import { createBox, createDelta } from "../geometry/models"
import {
    aspectRatio,
    axisDeltaEquals,
    boxEquals,
    boxEqualsRounded,
    isDeltaZero,
} from "../geometry/utils"
import { NodeStack } from "../shared/stack"
import { buildProjectionTransform } from "../styles/transform"
import { eachAxis } from "../utils/each-axis"
import { FlatTree } from "../utils/flat-tree"
import { has2DTranslate, hasScale, hasTransform } from "../utils/has-transform"
import { globalProjectionState } from "./state"
import {
    IProjectionNode,
    LayoutEvents,
    LayoutUpdateData,
    Measurements,
    Phase,
    ProjectionNodeConfig,
    ProjectionNodeOptions,
    ScrollMeasurements,
} from "./types"

const metrics = {
    nodes: 0,
    calculatedTargetDeltas: 0,
    calculatedProjections: 0,
}

const transformAxes = ["", "X", "Y", "Z"]

/**
 * We use 1000 as the animation target as 0-1000 maps better to pixels than 0-1
 * which has a noticeable difference in spring animations
 */
const animationTarget = 1000

let id = 0

function resetDistortingTransform(
    key: string,
    visualElement: VisualElement,
    values: ResolvedValues,
    sharedAnimationValues?: ResolvedValues
) {
    const { latestValues } = visualElement

    // Record the distorting transform and then temporarily set it to 0
    if (latestValues[key]) {
        values[key] = latestValues[key]
        visualElement.setStaticValue(key, 0)
        if (sharedAnimationValues) {
            sharedAnimationValues[key] = 0
        }
    }
}

function cancelTreeOptimisedTransformAnimations(
    projectionNode: IProjectionNode
) {
    projectionNode.hasCheckedOptimisedAppear = true
    if (projectionNode.root === projectionNode) return

    const { visualElement } = projectionNode.options

    if (!visualElement) return

    const appearId = getOptimisedAppearId(visualElement)

    if (window.MotionHasOptimisedAnimation!(appearId, "transform")) {
        const { layout, layoutId } = projectionNode.options
        window.MotionCancelOptimisedAnimation!(
            appearId,
            "transform",
            frame,
            !(layout || layoutId)
        )
    }

    const { parent } = projectionNode
    if (parent && !parent.hasCheckedOptimisedAppear) {
        cancelTreeOptimisedTransformAnimations(parent)
    }
}

export function createProjectionNode<I>({
    attachResizeListener,
    defaultParent,
    measureScroll,
    checkIsScrollRoot,
    resetTransform,
}: ProjectionNodeConfig<I>) {
    return class ProjectionNode implements IProjectionNode<I> {
        /**
         * A unique ID generated for every projection node.
         */
        id: number = id++

        /**
         * An id that represents a unique session instigated by startUpdate.
         */
        animationId: number = 0

        animationCommitId = 0

        /**
         * A reference to the platform-native node (currently this will be a HTMLElement).
         */
        instance: I | undefined

        /**
         * A reference to the root projection node. There'll only ever be one tree and one root.
         */
        root: IProjectionNode

        /**
         * A reference to this node's parent.
         */
        parent?: IProjectionNode

        /**
         * A path from this node to the root node. This provides a fast way to iterate
         * back up the tree.
         */
        path: IProjectionNode[]

        /**
         * A Set containing all this component's children. This is used to iterate
         * through the children.
         *
         * TODO: This could be faster to iterate as a flat array stored on the root node.
         */
        children = new Set<IProjectionNode>()

        /**
         * Options for the node. We use this to configure what kind of layout animations
         * we should perform (if any).
         */
        options: ProjectionNodeOptions = {}

        /**
         * A snapshot of the element's state just before the current update. This is
         * hydrated when this node's `willUpdate` method is called and scrubbed at the
         * end of the tree's `didUpdate` method.
         */
        snapshot: Measurements | undefined

        /**
         * A box defining the element's layout relative to the page. This will have been
         * captured with all parent scrolls and projection transforms unset.
         */
        layout: Measurements | undefined

        /**
         * The layout used to calculate the previous layout animation. We use this to compare
         * layouts between renders and decide whether we need to trigger a new layout animation
         * or just let the current one play out.
         */
        targetLayout?: Box

        /**
         * A mutable data structure we use to apply all parent transforms currently
         * acting on the element's layout. It's from here we can calculate the projectionDelta
         * required to get the element from its layout into its calculated target box.
         */
        layoutCorrected: Box

        /**
         * An ideal projection transform we want to apply to the element. This is calculated,
         * usually when an element's layout has changed, and we want the element to look as though
         * its in its previous layout on the next frame. From there, we animated it down to 0
         * to animate the element to its new layout.
         */
        targetDelta?: Delta

        /**
         * A mutable structure representing the visual bounding box on the page where we want
         * and element to appear. This can be set directly but is currently derived once a frame
         * from apply targetDelta to layout.
         */
        target?: Box

        /**
         * A mutable structure describing a visual bounding box relative to the element's
         * projected parent. If defined, target will be derived from this rather than targetDelta.
         * If not defined, we'll attempt to calculate on the first layout animation frame
         * based on the targets calculated from targetDelta. This will transfer a layout animation
         * from viewport-relative to parent-relative.
         */
        relativeTarget?: Box

        relativeTargetOrigin?: Box
        relativeParent?: IProjectionNode

        /**
         * We use this to detect when its safe to shut down part of a projection tree.
         * We have to keep projecting children for scale correction and relative projection
         * until all their parents stop performing layout animations.
         */
        isTreeAnimating = false

        isAnimationBlocked = false

        /**
         * If true, attempt to resolve relativeTarget.
         */
        attemptToResolveRelativeTarget?: boolean

        /**
         * A mutable structure that represents the target as transformed by the element's
         * latest user-set transforms (ie scale, x)
         */
        targetWithTransforms?: Box

        /**
         * The previous projection delta, which we can compare with the newly calculated
         * projection delta to see if we need to render.
         */
        prevProjectionDelta?: Delta

        /**
         * A calculated transform that will project an element from its layoutCorrected
         * into the target. This will be used by children to calculate their own layoutCorrect boxes.
         */
        projectionDelta?: Delta

        /**
         * A calculated transform that will project an element from its layoutCorrected
         * into the targetWithTransforms.
         */
        projectionDeltaWithTransform?: Delta

        /**
         * If we're tracking the scroll of this element, we store it here.
         */
        scroll?: ScrollMeasurements

        /**
         * Flag to true if we think this layout has been changed. We can't always know this,
         * currently we set it to true every time a component renders, or if it has a layoutDependency
         * if that has changed between renders. Additionally, components can be grouped by LayoutGroup
         * and if one node is dirtied, they all are.
         */
        isLayoutDirty = false

        /**
         * Flag to true if we think the projection calculations for this node needs
         * recalculating as a result of an updated transform or layout animation.
         */
        isProjectionDirty = false

        /**
         * Flag to true if the layout *or* transform has changed. This then gets propagated
         * throughout the projection tree, forcing any element below to recalculate on the next frame.
         */
        isSharedProjectionDirty = false

        /**
         * Flag transform dirty. This gets propagated throughout the whole tree but is only
         * respected by shared nodes.
         */
        isTransformDirty = false

        /**
         * Block layout updates for instant layout transitions throughout the tree.
         */
        updateManuallyBlocked = false

        updateBlockedByResize = false

        /**
         * Set to true between the start of the first `willUpdate` call and the end of the `didUpdate`
         * call.
         */
        isUpdating = false

        /**
         * If this is an SVG element we currently disable projection transforms
         */
        isSVG = false

        /**
         * Flag to true (during promotion) if a node doing an instant layout transition needs to reset
         * its projection styles.
         */
        needsReset = false

        /**
         * Flags whether this node should have its transform reset prior to measuring.
         */
        shouldResetTransform = false

        /**
         * Store whether this node has been checked for optimised appear animations. As
         * effects fire bottom-up, and we want to look up the tree for appear animations,
         * this makes sure we only check each path once, stopping at nodes that
         * have already been checked.
         */
        hasCheckedOptimisedAppear = false

        /**
         * An object representing the calculated contextual/accumulated/tree scale.
         * This will be used to scale calculcated projection transforms, as these are
         * calculated in screen-space but need to be scaled for elements to layoutly
         * make it to their calculated destinations.
         *
         * TODO: Lazy-init
         */
        treeScale: Point = { x: 1, y: 1 }

        /**
         * Is hydrated with a projection node if an element is animating from another.
         */
        resumeFrom?: IProjectionNode

        /**
         * Is hydrated with a projection node if an element is animating from another.
         */
        resumingFrom?: IProjectionNode

        /**
         * A reference to the element's latest animated values. This is a reference shared
         * between the element's VisualElement and the ProjectionNode.
         */
        latestValues: ResolvedValues

        /**
         *
         */
        eventHandlers = new Map<LayoutEvents, SubscriptionManager<any>>()

        nodes?: FlatTree

        depth: number

        /**
         * If transformTemplate generates a different value before/after the
         * update, we need to reset the transform.
         */
        prevTransformTemplateValue: string | undefined

        preserveOpacity?: boolean

        hasTreeAnimated = false

        layoutVersion: number = 0

        constructor(
            latestValues: ResolvedValues = {},
            parent: IProjectionNode | undefined = defaultParent?.()
        ) {
            this.latestValues = latestValues
            this.root = parent ? parent.root || parent : this
            this.path = parent ? [...parent.path, parent] : []
            this.parent = parent

            this.depth = parent ? parent.depth + 1 : 0

            for (let i = 0; i < this.path.length; i++) {
                this.path[i].shouldResetTransform = true
            }

            if (this.root === this) this.nodes = new FlatTree()
        }

        addEventListener(name: LayoutEvents, handler: any) {
            if (!this.eventHandlers.has(name)) {
                this.eventHandlers.set(name, new SubscriptionManager())
            }

            return this.eventHandlers.get(name)!.add(handler)
        }

        notifyListeners(name: LayoutEvents, ...args: any) {
            const subscriptionManager = this.eventHandlers.get(name)
            subscriptionManager && subscriptionManager.notify(...args)
        }

        hasListeners(name: LayoutEvents) {
            return this.eventHandlers.has(name)
        }

        /**
         * Lifecycles
         */
        mount(instance: I) {
            if (this.instance) return

            this.isSVG = isSVGElement(instance) && !isSVGSVGElement(instance)

            this.instance = instance

            const { layoutId, layout, visualElement } = this.options
            if (visualElement && !visualElement.current) {
                visualElement.mount(instance)
            }

            this.root.nodes!.add(this)
            this.parent && this.parent.children.add(this)

            if (this.root.hasTreeAnimated && (layout || layoutId)) {
                this.isLayoutDirty = true
            }

            if (attachResizeListener) {
                let cancelDelay: VoidFunction
                let innerWidth = 0

                const resizeUnblockUpdate = () =>
                    (this.root.updateBlockedByResize = false)

                // Set initial innerWidth in a frame.read callback to batch the read
                frame.read(() => {
                    innerWidth = window.innerWidth
                })

                attachResizeListener(instance, () => {
                    const newInnerWidth = window.innerWidth
                    if (newInnerWidth === innerWidth) return

                    innerWidth = newInnerWidth

                    this.root.updateBlockedByResize = true

                    cancelDelay && cancelDelay()
                    cancelDelay = delay(resizeUnblockUpdate, 250)

                    if (globalProjectionState.hasAnimatedSinceResize) {
                        globalProjectionState.hasAnimatedSinceResize = false
                        this.nodes!.forEach(finishAnimation)
                    }
                })
            }

            if (layoutId) {
                this.root.registerSharedNode(layoutId, this)
            }

            // Only register the handler if it requires layout animation
            if (
                this.options.animate !== false &&
                visualElement &&
                (layoutId || layout)
            ) {
                this.addEventListener(
                    "didUpdate",
                    ({
                        delta,
                        hasLayoutChanged,
                        hasRelativeLayoutChanged,
                        layout: newLayout,
                    }: LayoutUpdateData) => {
                        if (this.isTreeAnimationBlocked()) {
                            this.target = undefined
                            this.relativeTarget = undefined
                            return
                        }

                        // TODO: Check here if an animation exists
                        const layoutTransition =
                            this.options.transition ||
                            visualElement.getDefaultTransition() ||
                            defaultLayoutTransition

                        const {
                            onLayoutAnimationStart,
                            onLayoutAnimationComplete,
                        } = visualElement.getProps()

                        /**
                         * The target layout of the element might stay the same,
                         * but its position relative to its parent has changed.
                         */
                        const hasTargetChanged =
                            !this.targetLayout ||
                            !boxEqualsRounded(this.targetLayout, newLayout)
                        /*
                         * Note: Disabled to fix relative animations always triggering new
                         * layout animations. If this causes further issues, we can try
                         * a different approach to detecting relative target changes.
                         */
                        // || hasRelativeLayoutChanged

                        /**
                         * If the layout hasn't seemed to have changed, it might be that the
                         * element is visually in the same place in the document but its position
                         * relative to its parent has indeed changed. So here we check for that.
                         */
                        const hasOnlyRelativeTargetChanged =
                            !hasLayoutChanged && hasRelativeLayoutChanged

                        if (
                            this.options.layoutRoot ||
                            this.resumeFrom ||
                            hasOnlyRelativeTargetChanged ||
                            (hasLayoutChanged &&
                                (hasTargetChanged || !this.currentAnimation))
                        ) {
                            if (this.resumeFrom) {
                                this.resumingFrom = this.resumeFrom
                                this.resumingFrom.resumingFrom = undefined
                            }

                            const animationOptions = {
                                ...getValueTransition(
                                    layoutTransition,
                                    "layout"
                                ),
                                onPlay: onLayoutAnimationStart,
                                onComplete: onLayoutAnimationComplete,
                            }

                            if (
                                visualElement.shouldReduceMotion ||
                                this.options.layoutRoot
                            ) {
                                animationOptions.delay = 0
                                animationOptions.type = false
                            }

                            this.startAnimation(animationOptions)
                            /**
                             * Set animation origin after starting animation to avoid layout jump
                             * caused by stopping previous layout animation
                             */
                            this.setAnimationOrigin(
                                delta,
                                hasOnlyRelativeTargetChanged,
                                (animationOptions as { path?: MotionPath })
                                    .path
                            )
                        } else {
                            /**
                             * If the layout hasn't changed and we have an animation that hasn't started yet,
                             * finish it immediately. Otherwise it will be animating from a location
                             * that was probably never committed to screen and look like a jumpy box.
                             */

                            if (!hasLayoutChanged) {
                                finishAnimation(this)
                            }

                            if (this.isLead() && this.options.onExitComplete) {
                                this.options.onExitComplete()
                            }
                        }

                        this.targetLayout = newLayout
                    }
                )
            }
        }

        unmount() {
            this.options.layoutId && this.willUpdate()
            this.root.nodes!.remove(this)
            const stack = this.getStack()
            stack && stack.remove(this)
            this.parent && this.parent.children.delete(this)
            this.instance = undefined
            this.eventHandlers.clear()

            cancelFrame(this.updateProjection)
        }

        // only on the root
        blockUpdate() {
            this.updateManuallyBlocked = true
        }

        unblockUpdate() {
            this.updateManuallyBlocked = false
        }

        isUpdateBlocked() {
            return this.updateManuallyBlocked || this.updateBlockedByResize
        }

        isTreeAnimationBlocked() {
            return (
                this.isAnimationBlocked ||
                (this.parent && this.parent.isTreeAnimationBlocked()) ||
                false
            )
        }

        // Note: currently only running on root node
        startUpdate() {
            if (this.isUpdateBlocked()) return

            this.isUpdating = true

            this.nodes && this.nodes.forEach(resetSkewAndRotation)
            this.animationId++
        }

        getTransformTemplate() {
            const { visualElement } = this.options
            return visualElement && visualElement.getProps().transformTemplate
        }

        willUpdate(shouldNotifyListeners = true) {
            this.root.hasTreeAnimated = true

            if (this.root.isUpdateBlocked()) {
                this.options.onExitComplete && this.options.onExitComplete()
                return
            }

            /**
             * If we're running optimised appear animations then these must be
             * cancelled before measuring the DOM. This is so we can measure
             * the true layout of the element rather than the WAAPI animation
             * which will be unaffected by the resetSkewAndRotate step.
             *
             * Note: This is a DOM write. Worst case scenario is this is sandwiched
             * between other snapshot reads which will cause unnecessary style recalculations.
             * This has to happen here though, as we don't yet know which nodes will need
             * snapshots in startUpdate(), but we only want to cancel optimised animations
             * if a layout animation measurement is actually going to be affected by them.
             */
            if (
                window.MotionCancelOptimisedAnimation &&
                !this.hasCheckedOptimisedAppear
            ) {
                cancelTreeOptimisedTransformAnimations(this)
            }

            !this.root.isUpdating && this.root.startUpdate()

            if (this.isLayoutDirty) return

            this.isLayoutDirty = true
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i]
                node.shouldResetTransform = true

                /**
                 * Percentage translates resolve against layoutBox dimensions,
                 * so ancestors with them must be re-measured after transform reset.
                 */
                if (
                    typeof node.latestValues.x === "string" ||
                    typeof node.latestValues.y === "string"
                ) {
                    node.isLayoutDirty = true
                }

                node.updateScroll("snapshot")

                if (node.options.layoutRoot) {
                    node.willUpdate(false)
                }
            }

            const { layoutId, layout } = this.options
            if (layoutId === undefined && !layout) return

            const transformTemplate = this.getTransformTemplate()
            this.prevTransformTemplateValue = transformTemplate
                ? transformTemplate(this.latestValues, "")
                : undefined

            this.updateSnapshot()
            shouldNotifyListeners && this.notifyListeners("willUpdate")
        }

        // Note: Currently only running on root node
        updateScheduled = false

        update() {
            this.updateScheduled = false

            const updateWasBlocked = this.isUpdateBlocked()

            // When doing an instant transition, we skip the layout update,
            // but should still clean up the measurements so that the next
            // snapshot could be taken correctly.
            if (updateWasBlocked) {
                const wasBlockedByResize = this.updateBlockedByResize

                this.unblockUpdate()
                this.updateBlockedByResize = false
                this.clearAllSnapshots()

                /**
                 * When blocked by resize, still measure layouts so
                 * callbacks like onLayoutMeasure fire (e.g. Reorder).
                 * Skip notifyLayoutUpdate to prevent animations.
                 */
                if (wasBlockedByResize) {
                    this.nodes!.forEach(forceLayoutMeasure)
                }

                this.nodes!.forEach(clearMeasurements)
                return
            }

            /**
             * If this is a repeat of didUpdate then ignore the animation.
             */
            if (this.animationId <= this.animationCommitId) {
                this.nodes!.forEach(clearIsLayoutDirty)
                return
            }

            this.animationCommitId = this.animationId

            if (!this.isUpdating) {
                this.nodes!.forEach(clearIsLayoutDirty)
            } else {
                this.isUpdating = false

                /**
                 * Ensure animation-blocked nodes (e.g. during drag)
                 * get measured even when memoized (willUpdate skipped).
                 */
                this.nodes!.forEach(ensureDraggedNodesSnapshotted)

                /**
                 * Write
                 */
                this.nodes!.forEach(resetTransformStyle)

                /**
                 * Read ==================
                 */
                // Update layout measurements of updated children
                this.nodes!.forEach(updateLayout)

                /**
                 * Write
                 */
                // Notify listeners that the layout is updated
                this.nodes!.forEach(notifyLayoutUpdate)
            }

            this.clearAllSnapshots()

            /**
             * Manually flush any pending updates. Ideally
             * we could leave this to the following requestAnimationFrame but this seems
             * to leave a flash of incorrectly styled content.
             */
            const now = time.now()
            frameData.delta = clamp(0, 1000 / 60, now - frameData.timestamp)
            frameData.timestamp = now
            frameData.isProcessing = true
            frameSteps.update.process(frameData)
            frameSteps.preRender.process(frameData)
            frameSteps.render.process(frameData)
            frameData.isProcessing = false
        }

        scheduleUpdate = () => this.update()

        didUpdate() {
            if (!this.updateScheduled) {
                this.updateScheduled = true
                microtask.read(this.scheduleUpdate)
            }
        }

        clearAllSnapshots() {
            this.nodes!.forEach(clearSnapshot)
            this.sharedNodes.forEach(removeLeadSnapshots)
        }

        projectionUpdateScheduled = false
        scheduleUpdateProjection() {
            if (!this.projectionUpdateScheduled) {
                this.projectionUpdateScheduled = true
                frame.preRender(this.updateProjection, false, true)
            }
        }

        scheduleCheckAfterUnmount() {
            /**
             * If the unmounting node is in a layoutGroup and did trigger a willUpdate,
             * we manually call didUpdate to give a chance to the siblings to animate.
             * Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
             */
            frame.postRender(() => {
                if (this.isLayoutDirty) {
                    this.root.didUpdate()
                } else {
                    this.root.checkUpdateFailed()
                }
            })
        }

        checkUpdateFailed = () => {
            if (this.isUpdating) {
                this.isUpdating = false
                this.clearAllSnapshots()
            }
        }

        /**
         * This is a multi-step process as shared nodes might be of different depths. Nodes
         * are sorted by depth order, so we need to resolve the entire tree before moving to
         * the next step.
         */
        updateProjection = () => {
            this.projectionUpdateScheduled = false

            /**
             * Reset debug counts. Manually resetting rather than creating a new
             * object each frame.
             */
            if (statsBuffer.value) {
                metrics.nodes =
                    metrics.calculatedTargetDeltas =
                    metrics.calculatedProjections =
                        0
            }

            this.nodes!.forEach(propagateDirtyNodes)
            this.nodes!.forEach(resolveTargetDelta)
            this.nodes!.forEach(calcProjection)
            this.nodes!.forEach(cleanDirtyNodes)

            if (statsBuffer.addProjectionMetrics) {
                statsBuffer.addProjectionMetrics(metrics)
            }
        }

        /**
         * Update measurements
         */
        updateSnapshot() {
            if (this.snapshot || !this.instance) return

            this.snapshot = this.measure()

            if (
                this.snapshot &&
                !calcLength(this.snapshot.measuredBox.x) &&
                !calcLength(this.snapshot.measuredBox.y)
            ) {
                this.snapshot = undefined
            }
        }

        updateLayout() {
            if (!this.instance) return

            this.updateScroll()

            if (
                !(this.options.alwaysMeasureLayout && this.isLead()) &&
                !this.isLayoutDirty
            ) {
                return
            }

            /**
             * When a node is mounted, it simply resumes from the prevLead's
             * snapshot instead of taking a new one, but the ancestors scroll
             * might have updated while the prevLead is unmounted. We need to
             * update the scroll again to make sure the layout we measure is
             * up to date.
             */
            if (this.resumeFrom && !this.resumeFrom.instance) {
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i]
                    node.updateScroll()
                }
            }

            const prevLayout = this.layout
            this.layout = this.measure(false)
            this.layoutVersion++
            if (!this.layoutCorrected) this.layoutCorrected = createBox()
            this.isLayoutDirty = false
            this.projectionDelta = undefined
            this.notifyListeners("measure", this.layout.layoutBox)

            const { visualElement } = this.options
            visualElement &&
                visualElement.notify(
                    "LayoutMeasure",
                    this.layout.layoutBox,
                    prevLayout ? prevLayout.layoutBox : undefined
                )
        }

        updateScroll(phase: Phase = "measure") {
            let needsMeasurement = Boolean(
                this.options.layoutScroll && this.instance
            )

            if (
                this.scroll &&
                this.scroll.animationId === this.root.animationId &&
                this.scroll.phase === phase
            ) {
                needsMeasurement = false
            }

            if (needsMeasurement && this.instance) {
                const isRoot = checkIsScrollRoot(this.instance)
                this.scroll = {
                    animationId: this.root.animationId,
                    phase,
                    isRoot,
                    offset: measureScroll(this.instance),
                    wasRoot: this.scroll ? this.scroll.isRoot : isRoot,
                }
            }
        }

        resetTransform() {
            if (!resetTransform) return

            const isResetRequested =
                this.isLayoutDirty ||
                this.shouldResetTransform ||
                this.options.alwaysMeasureLayout

            const hasProjection =
                this.projectionDelta && !isDeltaZero(this.projectionDelta)

            const transformTemplate = this.getTransformTemplate()
            const transformTemplateValue = transformTemplate
                ? transformTemplate(this.latestValues, "")
                : undefined

            const transformTemplateHasChanged =
                transformTemplateValue !== this.prevTransformTemplateValue

            if (
                isResetRequested &&
                this.instance &&
                (hasProjection ||
                    hasTransform(this.latestValues) ||
                    transformTemplateHasChanged)
            ) {
                resetTransform(this.instance, transformTemplateValue)
                this.shouldResetTransform = false
                this.scheduleRender()
            }
        }

        measure(removeTransform = true) {
            const pageBox = this.measurePageBox()

            let layoutBox = this.removeElementScroll(pageBox)

            /**
             * Measurements taken during the pre-render stage
             * still have transforms applied so we remove them
             * via calculation.
             */
            if (removeTransform) {
                layoutBox = this.removeTransform(layoutBox)
            }

            roundBox(layoutBox)

            return {
                animationId: this.root.animationId,
                measuredBox: pageBox,
                layoutBox,
                latestValues: {},
                source: this.id,
            }
        }

        measurePageBox() {
            const { visualElement } = this.options
            if (!visualElement) return createBox()

            const box = visualElement.measureViewportBox()

            const wasInScrollRoot =
                this.scroll?.wasRoot || this.path.some(checkNodeWasScrollRoot)

            if (!wasInScrollRoot) {
                // Remove viewport scroll to give page-relative coordinates
                const { scroll } = this.root
                if (scroll) {
                    translateAxis(box.x, scroll.offset.x)
                    translateAxis(box.y, scroll.offset.y)
                }
            }

            return box
        }

        removeElementScroll(box: Box): Box {
            const boxWithoutScroll = createBox()
            copyBoxInto(boxWithoutScroll, box)

            if (this.scroll?.wasRoot) {
                return boxWithoutScroll
            }

            /**
             * Performance TODO: Keep a cumulative scroll offset down the tree
             * rather than loop back up the path.
             */
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i]
                const { scroll, options } = node

                if (node !== this.root && scroll && options.layoutScroll) {
                    /**
                     * If this is a new scroll root, we want to remove all previous scrolls
                     * from the viewport box.
                     */
                    if (scroll.wasRoot) {
                        copyBoxInto(boxWithoutScroll, box)
                    }

                    translateAxis(boxWithoutScroll.x, scroll.offset.x)
                    translateAxis(boxWithoutScroll.y, scroll.offset.y)
                }
            }

            return boxWithoutScroll
        }

        applyTransform(box: Box, transformOnly = false, output?: Box): Box {
            const withTransforms = output || createBox()
            copyBoxInto(withTransforms, box)
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i]

                if (
                    !transformOnly &&
                    node.options.layoutScroll &&
                    node.scroll &&
                    node !== node.root
                ) {
                    translateAxis(withTransforms.x, -node.scroll.offset.x)
                    translateAxis(withTransforms.y, -node.scroll.offset.y)
                }

                if (!hasTransform(node.latestValues)) continue
                transformBox(
                    withTransforms,
                    node.latestValues,
                    node.layout?.layoutBox
                )
            }

            if (hasTransform(this.latestValues)) {
                transformBox(
                    withTransforms,
                    this.latestValues,
                    this.layout?.layoutBox
                )
            }

            return withTransforms
        }

        removeTransform(box: Box): Box {
            const boxWithoutTransform = createBox()
            copyBoxInto(boxWithoutTransform, box)

            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i]
                if (!hasTransform(node.latestValues)) continue

                let sourceBox: Box | undefined

                if (node.instance) {
                    hasScale(node.latestValues) && node.updateSnapshot()
                    sourceBox = createBox()
                    copyBoxInto(sourceBox, node.measurePageBox())
                }

                removeBoxTransforms(
                    boxWithoutTransform,
                    node.latestValues,
                    node.snapshot?.layoutBox,
                    sourceBox
                )
            }

            if (hasTransform(this.latestValues)) {
                removeBoxTransforms(boxWithoutTransform, this.latestValues)
            }

            return boxWithoutTransform
        }

        setTargetDelta(delta: Delta) {
            this.targetDelta = delta
            this.root.scheduleUpdateProjection()
            this.isProjectionDirty = true
        }

        setOptions(options: ProjectionNodeOptions) {
            this.options = {
                ...this.options,
                ...options,
                crossfade:
                    options.crossfade !== undefined ? options.crossfade : true,
            }
        }

        clearMeasurements() {
            this.scroll = undefined
            this.layout = undefined
            this.snapshot = undefined
            this.prevTransformTemplateValue = undefined
            this.targetDelta = undefined
            this.target = undefined
            this.isLayoutDirty = false
        }

        forceRelativeParentToResolveTarget() {
            if (!this.relativeParent) return

            /**
             * If the parent target isn't up-to-date, force it to update.
             * This is an unfortunate de-optimisation as it means any updating relative
             * projection will cause all the relative parents to recalculate back
             * up the tree.
             */
            if (
                this.relativeParent.resolvedRelativeTargetAt !==
                frameData.timestamp
            ) {
                this.relativeParent.resolveTargetDelta(true)
            }
        }

        /**
         * Frame calculations
         */
        resolvedRelativeTargetAt: number = 0.0
        resolveTargetDelta(forceRecalculation = false) {
            /**
             * Once the dirty status of nodes has been spread through the tree, we also
             * need to check if we have a shared node of a different depth that has itself
             * been dirtied.
             */
            const lead = this.getLead()
            this.isProjectionDirty ||= lead.isProjectionDirty
            this.isTransformDirty ||= lead.isTransformDirty
            this.isSharedProjectionDirty ||= lead.isSharedProjectionDirty

            const isShared = Boolean(this.resumingFrom) || this !== lead

            /**
             * We don't use transform for this step of processing so we don't
             * need to check whether any nodes have changed transform.
             */
            const canSkip = !(
                forceRecalculation ||
                (isShared && this.isSharedProjectionDirty) ||
                this.isProjectionDirty ||
                this.parent?.isProjectionDirty ||
                this.attemptToResolveRelativeTarget ||
                this.root.updateBlockedByResize
            )

            if (canSkip) return

            const { layout, layoutId } = this.options

            /**
             * If we have no layout, we can't perform projection, so early return
             */
            if (!this.layout || !(layout || layoutId)) return

            this.resolvedRelativeTargetAt = frameData.timestamp

            const relativeParent = this.getClosestProjectingParent()

            if (
                relativeParent &&
                this.linkedParentVersion !== relativeParent.layoutVersion &&
                !relativeParent.options.layoutRoot
            ) {
                this.removeRelativeTarget()
            }

            /**
             * If we don't have a targetDelta but do have a layout, we can attempt to resolve
             * a relativeParent. This will allow a component to perform scale correction
             * even if no animation has started.
             */
            if (!this.targetDelta && !this.relativeTarget) {
                if (
                    this.options.layoutAnchor !== false &&
                    relativeParent &&
                    relativeParent.layout
                ) {
                    this.createRelativeTarget(
                        relativeParent,
                        this.layout.layoutBox,
                        relativeParent.layout.layoutBox
                    )
                } else {
                    this.removeRelativeTarget()
                }
            }

            /**
             * If we have no relative target or no target delta our target isn't valid
             * for this frame.
             */
            if (!this.relativeTarget && !this.targetDelta) return

            /**
             * Lazy-init target data structure
             */
            if (!this.target) {
                this.target = createBox()
                this.targetWithTransforms = createBox()
            }

            /**
             * If we've got a relative box for this component, resolve it into a target relative to the parent.
             */
            if (
                this.relativeTarget &&
                this.relativeTargetOrigin &&
                this.relativeParent &&
                this.relativeParent.target
            ) {
                this.forceRelativeParentToResolveTarget()

                calcRelativeBox(
                    this.target,
                    this.relativeTarget,
                    this.relativeParent.target,
                    this.options.layoutAnchor || undefined
                )

                /**
                 * If we've only got a targetDelta, resolve it into a target
                 */
            } else if (this.targetDelta) {
                if (Boolean(this.resumingFrom)) {
                    this.applyTransform(
                        this.layout.layoutBox,
                        false,
                        this.target
                    )
                } else {
                    copyBoxInto(this.target, this.layout.layoutBox)
                }

                applyBoxDelta(this.target, this.targetDelta)
            } else {
                /**
                 * If no target, use own layout as target
                 */
                copyBoxInto(this.target, this.layout.layoutBox)
            }

            /**
             * If we've been told to attempt to resolve a relative target, do so.
             */
            if (this.attemptToResolveRelativeTarget) {
                this.attemptToResolveRelativeTarget = false

                if (
                    this.options.layoutAnchor !== false &&
                    relativeParent &&
                    Boolean(relativeParent.resumingFrom) ===
                        Boolean(this.resumingFrom) &&
                    !relativeParent.options.layoutScroll &&
                    relativeParent.target &&
                    this.animationProgress !== 1
                ) {
                    this.createRelativeTarget(
                        relativeParent,
                        this.target,
                        relativeParent.target
                    )
                } else {
                    this.relativeParent = this.relativeTarget = undefined
                }
            }

            /**
             * Increase debug counter for resolved target deltas
             */
            if (statsBuffer.value) {
                metrics.calculatedTargetDeltas++
            }
        }

        getClosestProjectingParent() {
            if (
                !this.parent ||
                hasScale(this.parent.latestValues) ||
                has2DTranslate(this.parent.latestValues)
            ) {
                return undefined
            }

            if (this.parent.isProjecting()) {
                return this.parent
            } else {
                return this.parent.getClosestProjectingParent()
            }
        }

        isProjecting() {
            return Boolean(
                (this.relativeTarget ||
                    this.targetDelta ||
                    this.options.layoutRoot) &&
                    this.layout
            )
        }

        linkedParentVersion: number = 0
        createRelativeTarget(
            relativeParent: IProjectionNode,
            layout: Box,
            parentLayout: Box
        ) {
            this.relativeParent = relativeParent
            this.linkedParentVersion = relativeParent.layoutVersion
            this.forceRelativeParentToResolveTarget()
            this.relativeTarget = createBox()
            this.relativeTargetOrigin = createBox()
            calcRelativePosition(
                this.relativeTargetOrigin,
                layout,
                parentLayout,
                this.options.layoutAnchor || undefined
            )

            copyBoxInto(this.relativeTarget, this.relativeTargetOrigin)
        }

        removeRelativeTarget() {
            this.relativeParent = this.relativeTarget = undefined
        }

        hasProjected: boolean = false

        calcProjection() {
            const lead = this.getLead()
            const isShared = Boolean(this.resumingFrom) || this !== lead

            let canSkip = true

            /**
             * If this is a normal layout animation and neither this node nor its nearest projecting
             * is dirty then we can't skip.
             */
            if (this.isProjectionDirty || this.parent?.isProjectionDirty) {
                canSkip = false
            }

            /**
             * If this is a shared layout animation and this node's shared projection is dirty then
             * we can't skip.
             */
            if (
                isShared &&
                (this.isSharedProjectionDirty || this.isTransformDirty)
            ) {
                canSkip = false
            }

            /**
             * If we have resolved the target this frame we must recalculate the
             * projection to ensure it visually represents the internal calculations.
             */
            if (this.resolvedRelativeTargetAt === frameData.timestamp) {
                canSkip = false
            }

            if (canSkip) return

            const { layout, layoutId } = this.options

            /**
             * If this section of the tree isn't animating we can
             * delete our target sources for the following frame.
             */
            this.isTreeAnimating = Boolean(
                (this.parent && this.parent.isTreeAnimating) ||
                    this.currentAnimation ||
                    this.pendingAnimation
            )
            if (!this.isTreeAnimating) {
                this.targetDelta = this.relativeTarget = undefined
            }

            if (!this.layout || !(layout || layoutId)) return

            /**
             * Reset the corrected box with the latest values from box, as we're then going
             * to perform mutative operations on it.
             */
            copyBoxInto(this.layoutCorrected, this.layout.layoutBox)

            /**
             * Record previous tree scales before updating.
             */
            const prevTreeScaleX = this.treeScale.x
            const prevTreeScaleY = this.treeScale.y
            /**
             * Apply all the parent deltas to this box to produce the corrected box. This
             * is the layout box, as it will appear on screen as a result of the transforms of its parents.
             */
            applyTreeDeltas(
                this.layoutCorrected,
                this.treeScale,
                this.path,
                isShared
            )

            /**
             * If this layer needs to perform scale correction but doesn't have a target,
             * use the layout as the target.
             */
            if (
                lead.layout &&
                !lead.target &&
                (this.treeScale.x !== 1 || this.treeScale.y !== 1)
            ) {
                lead.target = lead.layout.layoutBox
                lead.targetWithTransforms = createBox()
            }

            const { target } = lead

            if (!target) {
                /**
                 * If we don't have a target to project into, but we were previously
                 * projecting, we want to remove the stored transform and schedule
                 * a render to ensure the elements reflect the removed transform.
                 */
                if (this.prevProjectionDelta) {
                    this.createProjectionDeltas()
                    this.scheduleRender()
                }

                return
            }

            if (!this.projectionDelta || !this.prevProjectionDelta) {
                this.createProjectionDeltas()
            } else {
                copyAxisDeltaInto(
                    this.prevProjectionDelta.x,
                    this.projectionDelta.x
                )
                copyAxisDeltaInto(
                    this.prevProjectionDelta.y,
                    this.projectionDelta.y
                )
            }

            /**
             * Update the delta between the corrected box and the target box before user-set transforms were applied.
             * This will allow us to calculate the corrected borderRadius and boxShadow to compensate
             * for our layout reprojection, but still allow them to be scaled correctly by the user.
             * It might be that to simplify this we may want to accept that user-set scale is also corrected
             * and we wouldn't have to keep and calc both deltas, OR we could support a user setting
             * to allow people to choose whether these styles are corrected based on just the
             * layout reprojection or the final bounding box.
             */
            calcBoxDelta(
                this.projectionDelta!,
                this.layoutCorrected,
                target,
                this.latestValues
            )

            if (
                this.treeScale.x !== prevTreeScaleX ||
                this.treeScale.y !== prevTreeScaleY ||
                !axisDeltaEquals(
                    this.projectionDelta!.x,
                    this.prevProjectionDelta!.x
                ) ||
                !axisDeltaEquals(
                    this.projectionDelta!.y,
                    this.prevProjectionDelta!.y
                )
            ) {
                this.hasProjected = true
                this.scheduleRender()
                this.notifyListeners("projectionUpdate", target)
            }

            /**
             * Increase debug counter for recalculated projections
             */
            if (statsBuffer.value) {
                metrics.calculatedProjections++
            }
        }

        isVisible = true
        hide() {
            this.isVisible = false
            // TODO: Schedule render
        }
        show() {
            this.isVisible = true
            // TODO: Schedule render
        }

        scheduleRender(notifyAll = true) {
            this.options.visualElement?.scheduleRender()
            if (notifyAll) {
                const stack = this.getStack()
                stack && stack.scheduleRender()
            }
            if (this.resumingFrom && !this.resumingFrom.instance) {
                this.resumingFrom = undefined
            }
        }

        createProjectionDeltas() {
            this.prevProjectionDelta = createDelta()
            this.projectionDelta = createDelta()
            this.projectionDeltaWithTransform = createDelta()
        }

        /**
         * Animation
         */
        animationValues?: ResolvedValues
        pendingAnimation?: Process
        currentAnimation?: JSAnimation<number>
        mixTargetDelta: (progress: number) => void
        animationProgress = 0

        setAnimationOrigin(
            delta: Delta,
            hasOnlyRelativeTargetChanged: boolean = false,
            pathFn?: MotionPath
        ) {
            const snapshot = this.snapshot
            const snapshotLatestValues = snapshot ? snapshot.latestValues : {}
            const mixedValues = { ...this.latestValues }

            const targetDelta = createDelta()
            if (
                !this.relativeParent ||
                !this.relativeParent.options.layoutRoot
            ) {
                this.relativeTarget = this.relativeTargetOrigin = undefined
            }
            this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged

            const relativeLayout = createBox()

            const snapshotSource = snapshot ? snapshot.source : undefined
            const layoutSource = this.layout ? this.layout.source : undefined
            const isSharedLayoutAnimation = snapshotSource !== layoutSource
            const stack = this.getStack()
            const isOnlyMember = !stack || stack.members.length <= 1
            const shouldCrossfadeOpacity = Boolean(
                isSharedLayoutAnimation &&
                    !isOnlyMember &&
                    this.options.crossfade === true &&
                    !this.path.some(hasOpacityCrossfade)
            )

            this.animationProgress = 0

            let prevRelativeTarget: Box

            // The path decides whether the layout shift is worth curving
            // (distance floor) and resolves the interpolator from the delta.
            const interpolate: PathInterpolator | undefined =
                pathFn?.interpolateProjection(delta)

            this.mixTargetDelta = (latest: number) => {
                const progress = latest / 1000
                const point = interpolate?.(progress)

                if (point) {
                    targetDelta.x.translate = point.x
                    targetDelta.x.scale = mixNumber(delta.x.scale, 1, progress)
                    targetDelta.x.origin = delta.x.origin
                    targetDelta.x.originPoint = delta.x.originPoint
                    targetDelta.y.translate = point.y
                    targetDelta.y.scale = mixNumber(delta.y.scale, 1, progress)
                    targetDelta.y.origin = delta.y.origin
                    targetDelta.y.originPoint = delta.y.originPoint
                } else {
                    mixAxisDeltaLinear(targetDelta.x, delta.x, progress)
                    mixAxisDeltaLinear(targetDelta.y, delta.y, progress)
                }

                this.setTargetDelta(targetDelta)

                if (
                    this.relativeTarget &&
                    this.relativeTargetOrigin &&
                    this.layout &&
                    this.relativeParent &&
                    this.relativeParent.layout
                ) {
                    calcRelativePosition(
                        relativeLayout,
                        this.layout.layoutBox,
                        this.relativeParent.layout.layoutBox,
                        this.options.layoutAnchor || undefined
                    )
                    mixBox(
                        this.relativeTarget,
                        this.relativeTargetOrigin,
                        relativeLayout,
                        progress
                    )

                    /**
                     * If this is an unchanged relative target we can consider the
                     * projection not dirty.
                     */
                    if (
                        prevRelativeTarget &&
                        boxEquals(this.relativeTarget, prevRelativeTarget)
                    ) {
                        this.isProjectionDirty = false
                    }

                    if (!prevRelativeTarget) prevRelativeTarget = createBox()
                    copyBoxInto(prevRelativeTarget, this.relativeTarget)
                }

                if (isSharedLayoutAnimation) {
                    this.animationValues = mixedValues

                    mixValues(
                        mixedValues,
                        snapshotLatestValues,
                        this.latestValues,
                        progress,
                        shouldCrossfadeOpacity,
                        isOnlyMember
                    )
                }

                if (point && point.rotate !== undefined) {
                    // Dedicated `pathRotation` channel, not `rotate`, so an
                    // animating `rotate` is composed with, never clobbered.
                    if (!this.animationValues)
                        this.animationValues = mixedValues
                    this.animationValues.pathRotation = point.rotate
                }

                this.root.scheduleUpdateProjection()
                this.scheduleRender()

                this.animationProgress = progress
            }

            this.mixTargetDelta(this.options.layoutRoot ? 1000 : 0)
        }

        motionValue?: MotionValue<number>
        startAnimation(options: ValueAnimationOptions<number>) {
            this.notifyListeners("animationStart")

            this.currentAnimation?.stop()
            this.resumingFrom?.currentAnimation?.stop()

            if (this.pendingAnimation) {
                cancelFrame(this.pendingAnimation)
                this.pendingAnimation = undefined
            }

            /**
             * Start the animation in the next frame to have a frame with progress 0,
             * where the target is the same as when the animation started, so we can
             * calculate the relative positions correctly for instant transitions.
             */
            this.pendingAnimation = frame.update(() => {
                globalProjectionState.hasAnimatedSinceResize = true

                this.motionValue ||= motionValue(0)
                this.motionValue.jump(0, false)

                this.currentAnimation = animateSingleValue(
                    this.motionValue,
                    [0, 1000],
                    {
                        ...(options as any),
                        velocity: 0,
                        isSync: true,
                        onUpdate: (latest: number) => {
                            this.mixTargetDelta(latest)
                            options.onUpdate && options.onUpdate(latest)
                        },
                        onComplete: () => {
                            options.onComplete && options.onComplete()
                            this.completeAnimation()
                        },
                    }
                ) as JSAnimation<number>

                if (this.resumingFrom) {
                    this.resumingFrom.currentAnimation = this.currentAnimation
                }

                this.pendingAnimation = undefined
            })
        }

        completeAnimation() {
            if (this.resumingFrom) {
                this.resumingFrom.currentAnimation = undefined
                this.resumingFrom.preserveOpacity = undefined
            }

            const stack = this.getStack()
            stack && stack.exitAnimationComplete()
            this.resumingFrom =
                this.currentAnimation =
                this.animationValues =
                    undefined

            this.notifyListeners("animationComplete")
        }

        finishAnimation() {
            if (this.currentAnimation) {
                this.mixTargetDelta && this.mixTargetDelta(animationTarget)
                this.currentAnimation.stop()
            }

            this.completeAnimation()
        }

        applyTransformsToTarget() {
            const lead = this.getLead()
            let { targetWithTransforms, target, layout, latestValues } = lead

            if (!targetWithTransforms || !target || !layout) return

            /**
             * If we're only animating position, and this element isn't the lead element,
             * then instead of projecting into the lead box we instead want to calculate
             * a new target that aligns the two boxes but maintains the layout shape.
             */
            if (
                this !== lead &&
                this.layout &&
                layout &&
                shouldAnimatePositionOnly(
                    this.options.animationType,
                    this.layout.layoutBox,
                    layout.layoutBox
                )
            ) {
                target = this.target || createBox()

                const xLength = calcLength(this.layout!.layoutBox.x)
                target!.x.min = lead.target!.x.min
                target!.x.max = target.x.min + xLength

                const yLength = calcLength(this.layout!.layoutBox.y)
                target!.y.min = lead.target!.y.min
                target!.y.max = target.y.min + yLength
            }

            copyBoxInto(targetWithTransforms, target)

            /**
             * Apply the latest user-set transforms to the targetBox to produce the targetBoxFinal.
             * This is the final box that we will then project into by calculating a transform delta and
             * applying it to the corrected box.
             */
            transformBox(targetWithTransforms, latestValues)

            /**
             * Update the delta between the corrected box and the final target box, after
             * user-set transforms are applied to it. This will be used by the renderer to
             * create a transform style that will reproject the element from its layout layout
             * into the desired bounding box.
             */
            calcBoxDelta(
                this.projectionDeltaWithTransform!,
                this.layoutCorrected,
                targetWithTransforms!,
                latestValues
            )
        }

        /**
         * Shared layout
         */
        // TODO Only running on root node
        sharedNodes: Map<string, NodeStack> = new Map()
        registerSharedNode(layoutId: string, node: IProjectionNode) {
            if (!this.sharedNodes.has(layoutId)) {
                this.sharedNodes.set(layoutId, new NodeStack())
            }

            const stack = this.sharedNodes.get(layoutId)!
            stack.add(node)

            const config = node.options.initialPromotionConfig
            node.promote({
                transition: config ? config.transition : undefined,
                preserveFollowOpacity:
                    config && config.shouldPreserveFollowOpacity
                        ? config.shouldPreserveFollowOpacity(node)
                        : undefined,
            })
        }

        isLead(): boolean {
            const stack = this.getStack()
            return stack ? stack.lead === this : true
        }

        getLead() {
            const { layoutId } = this.options
            return layoutId ? this.getStack()?.lead || this : this
        }

        getPrevLead() {
            const { layoutId } = this.options
            return layoutId ? this.getStack()?.prevLead : undefined
        }

        getStack() {
            const { layoutId } = this.options
            if (layoutId) return this.root.sharedNodes.get(layoutId)
        }

        promote({
            needsReset,
            transition,
            preserveFollowOpacity,
        }: {
            needsReset?: boolean
            transition?: Transition
            preserveFollowOpacity?: boolean
        } = {}) {
            const stack = this.getStack()
            if (stack) stack.promote(this, preserveFollowOpacity)

            if (needsReset) {
                this.projectionDelta = undefined
                this.needsReset = true
            }
            if (transition) this.setOptions({ transition })
        }

        relegate(): boolean {
            const stack = this.getStack()
            if (stack) {
                return stack.relegate(this)
            } else {
                return false
            }
        }

        resetSkewAndRotation() {
            const { visualElement } = this.options

            if (!visualElement) return

            // If there's no detected skew or rotation values, we can early return without a forced render.
            let hasDistortingTransform = false

            /**
             * An unrolled check for rotation values. Most elements don't have any rotation and
             * skipping the nested loop and new object creation is 50% faster.
             */
            const { latestValues } = visualElement
            if (
                latestValues.z ||
                latestValues.rotate ||
                latestValues.rotateX ||
                latestValues.rotateY ||
                latestValues.rotateZ ||
                latestValues.skewX ||
                latestValues.skewY
            ) {
                hasDistortingTransform = true
            }

            // If there's no distorting values, we don't need to do any more.
            if (!hasDistortingTransform) return

            const resetValues: ResolvedValues = {}

            if (latestValues.z) {
                resetDistortingTransform(
                    "z",
                    visualElement,
                    resetValues,
                    this.animationValues
                )
            }

            // Check the skew and rotate value of all axes and reset to 0
            for (let i = 0; i < transformAxes.length; i++) {
                resetDistortingTransform(
                    `rotate${transformAxes[i]}`,
                    visualElement,
                    resetValues,
                    this.animationValues
                )
                resetDistortingTransform(
                    `skew${transformAxes[i]}`,
                    visualElement,
                    resetValues,
                    this.animationValues
                )
            }

            // Force a render of this element to apply the transform with all skews and rotations
            // set to 0.
            visualElement.render()

            // Put back all the values we reset
            for (const key in resetValues) {
                visualElement.setStaticValue(key, resetValues[key])
                if (this.animationValues) {
                    this.animationValues[key] = resetValues[key]
                }
            }

            // Schedule a render for the next frame. This ensures we won't visually
            // see the element with the reset rotate value applied.
            visualElement.scheduleRender()
        }

        applyProjectionStyles(
            targetStyle: any, // CSSStyleDeclaration - doesn't allow numbers to be assigned to properties
            styleProp?: MotionStyle
        ) {
            if (!this.instance || this.isSVG) return

            if (!this.isVisible) {
                targetStyle.visibility = "hidden"
                return
            }

            const transformTemplate = this.getTransformTemplate()

            if (this.needsReset) {
                this.needsReset = false

                targetStyle.visibility = ""
                targetStyle.opacity = ""
                targetStyle.pointerEvents =
                    resolveMotionValue(styleProp?.pointerEvents) || ""
                targetStyle.transform = transformTemplate
                    ? transformTemplate(this.latestValues, "")
                    : "none"
                return
            }

            const lead = this.getLead()
            if (!this.projectionDelta || !this.layout || !lead.target) {
                if (this.options.layoutId) {
                    targetStyle.opacity =
                        this.latestValues.opacity !== undefined
                            ? this.latestValues.opacity
                            : 1
                    targetStyle.pointerEvents =
                        resolveMotionValue(styleProp?.pointerEvents) || ""
                }
                if (this.hasProjected && !hasTransform(this.latestValues)) {
                    targetStyle.transform = transformTemplate
                        ? transformTemplate({}, "")
                        : "none"
                    this.hasProjected = false
                }

                return
            }

            targetStyle.visibility = ""

            const valuesToRender = lead.animationValues || lead.latestValues
            this.applyTransformsToTarget()

            let transform = buildProjectionTransform(
                this.projectionDeltaWithTransform!,
                this.treeScale,
                valuesToRender
            )

            if (transformTemplate) {
                transform = transformTemplate(valuesToRender, transform)
            }

            targetStyle.transform = transform

            const { x, y } = this.projectionDelta
            targetStyle.transformOrigin = `${x.origin * 100}% ${
                y.origin * 100
            }% 0`

            if (lead.animationValues) {
                /**
                 * If the lead component is animating, assign this either the entering/leaving
                 * opacity
                 */
                targetStyle.opacity =
                    lead === this
                        ? valuesToRender.opacity ??
                          this.latestValues.opacity ??
                          1
                        : this.preserveOpacity
                        ? this.latestValues.opacity
                        : valuesToRender.opacityExit
            } else {
                /**
                 * Or we're not animating at all, set the lead component to its layout
                 * opacity and other components to hidden.
                 */
                targetStyle.opacity =
                    lead === this
                        ? valuesToRender.opacity !== undefined
                            ? valuesToRender.opacity
                            : ""
                        : valuesToRender.opacityExit !== undefined
                        ? valuesToRender.opacityExit
                        : 0
            }

            /**
             * Apply scale correction
             */
            for (const key in scaleCorrectors) {
                if (valuesToRender[key] === undefined) continue

                const { correct, applyTo, isCSSVariable } = scaleCorrectors[key]

                /**
                 * Only apply scale correction to the value if we have an
                 * active projection transform. Otherwise these values become
                 * vulnerable to distortion if the element changes size without
                 * a corresponding layout animation.
                 */
                const corrected =
                    transform === "none"
                        ? valuesToRender[key]
                        : correct(valuesToRender[key], lead)

                if (applyTo) {
                    const num = applyTo.length
                    for (let i = 0; i < num; i++) {
                        targetStyle[applyTo[i] as any] = corrected
                    }
                } else {
                    // If this is a CSS variable, set it directly on the instance.
                    // Replacing this function from creating styles to setting them
                    // would be a good place to remove per frame object creation
                    if (isCSSVariable) {
                        ;(
                            this.options.visualElement as HTMLVisualElement
                        ).renderState.vars[key] = corrected
                    } else {
                        targetStyle[key as any] = corrected
                    }
                }
            }

            /**
             * Disable pointer events on follow components. This is to ensure
             * that if a follow component covers a lead component it doesn't block
             * pointer events on the lead.
             */
            if (this.options.layoutId) {
                targetStyle.pointerEvents =
                    lead === this
                        ? resolveMotionValue(styleProp?.pointerEvents) || ""
                        : "none"
            }
        }

        clearSnapshot() {
            this.resumeFrom = this.snapshot = undefined
        }

        // Only run on root
        resetTree() {
            this.root.nodes!.forEach((node: IProjectionNode) =>
                node.currentAnimation?.stop()
            )
            this.root.nodes!.forEach(clearMeasurements)
            this.root.sharedNodes.clear()
        }
    }
}

function updateLayout(node: IProjectionNode) {
    node.updateLayout()
}

function notifyLayoutUpdate(node: IProjectionNode) {
    const snapshot = node.resumeFrom?.snapshot || node.snapshot

    if (
        node.isLead() &&
        node.layout &&
        snapshot &&
        node.hasListeners("didUpdate")
    ) {
        const { layoutBox: layout, measuredBox: measuredLayout } = node.layout
        const { animationType } = node.options

        const isShared = snapshot.source !== node.layout.source

        // TODO Maybe we want to also resize the layout snapshot so we don't trigger
        // animations for instance if layout="size" and an element has only changed position
        if (animationType === "size") {
            eachAxis((axis) => {
                const axisSnapshot = isShared
                    ? snapshot.measuredBox[axis]
                    : snapshot.layoutBox[axis]
                const length = calcLength(axisSnapshot)
                axisSnapshot.min = layout[axis].min
                axisSnapshot.max = axisSnapshot.min + length
            })
        } else if (animationType === "x" || animationType === "y") {
            const snapAxis = animationType === "x" ? "y" : "x"
            copyAxisInto(
                isShared
                    ? snapshot.measuredBox[snapAxis]
                    : snapshot.layoutBox[snapAxis],
                layout[snapAxis]
            )
        } else if (
            shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)
        ) {
            eachAxis((axis) => {
                const axisSnapshot = isShared
                    ? snapshot.measuredBox[axis]
                    : snapshot.layoutBox[axis]
                const length = calcLength(layout[axis])
                axisSnapshot.max = axisSnapshot.min + length

                /**
                 * Ensure relative target gets resized and rerendererd
                 */
                if (node.relativeTarget && !node.currentAnimation) {
                    node.isProjectionDirty = true
                    node.relativeTarget[axis].max =
                        node.relativeTarget[axis].min + length
                }
            })
        }

        const layoutDelta = createDelta()

        calcBoxDelta(layoutDelta, layout, snapshot.layoutBox)
        const visualDelta = createDelta()
        if (isShared) {
            calcBoxDelta(
                visualDelta,
                node.applyTransform(measuredLayout, true),
                snapshot.measuredBox
            )
        } else {
            calcBoxDelta(visualDelta, layout, snapshot.layoutBox)
        }

        const hasLayoutChanged = !isDeltaZero(layoutDelta)
        let hasRelativeLayoutChanged = false

        if (!node.resumeFrom) {
            const relativeParent = node.getClosestProjectingParent()

            /**
             * If the relativeParent is itself resuming from a different element then
             * the relative snapshot is not relavent
             */
            if (relativeParent && !relativeParent.resumeFrom) {
                const { snapshot: parentSnapshot, layout: parentLayout } =
                    relativeParent

                if (parentSnapshot && parentLayout) {
                    const anchor =
                        node.options.layoutAnchor || undefined

                    const relativeSnapshot = createBox()
                    calcRelativePosition(
                        relativeSnapshot,
                        snapshot.layoutBox,
                        parentSnapshot.layoutBox,
                        anchor
                    )

                    const relativeLayout = createBox()
                    calcRelativePosition(
                        relativeLayout,
                        layout,
                        parentLayout.layoutBox,
                        anchor
                    )

                    if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) {
                        hasRelativeLayoutChanged = true
                    }

                    if (relativeParent.options.layoutRoot) {
                        node.relativeTarget = relativeLayout
                        node.relativeTargetOrigin = relativeSnapshot
                        node.relativeParent = relativeParent
                    }
                }
            }
        }

        node.notifyListeners("didUpdate", {
            layout,
            snapshot,
            delta: visualDelta,
            layoutDelta,
            hasLayoutChanged,
            hasRelativeLayoutChanged,
        })
    } else if (node.isLead()) {
        const { onExitComplete } = node.options
        onExitComplete && onExitComplete()
    }

    /**
     * Clearing transition
     * TODO: Investigate why this transition is being passed in as {type: false } from Framer
     * and why we need it at all
     */
    node.options.transition = undefined
}

export function propagateDirtyNodes(node: IProjectionNode) {
    /**
     * Increase debug counter for nodes encountered this frame
     */
    if (statsBuffer.value) {
        metrics.nodes++
    }

    if (!node.parent) return

    /**
     * If this node isn't projecting, propagate isProjectionDirty. It will have
     * no performance impact but it will allow the next child that *is* projecting
     * but *isn't* dirty to just check its parent to see if *any* ancestor needs
     * correcting.
     */
    if (!node.isProjecting()) {
        node.isProjectionDirty = node.parent.isProjectionDirty
    }

    /**
     * Propagate isSharedProjectionDirty and isTransformDirty
     * throughout the whole tree. A future revision can take another look at
     * this but for safety we still recalcualte shared nodes.
     */
    node.isSharedProjectionDirty ||= Boolean(
        node.isProjectionDirty ||
            node.parent.isProjectionDirty ||
            node.parent.isSharedProjectionDirty
    )

    node.isTransformDirty ||= node.parent.isTransformDirty
}

export function cleanDirtyNodes(node: IProjectionNode) {
    node.isProjectionDirty =
        node.isSharedProjectionDirty =
        node.isTransformDirty =
            false
}

function clearSnapshot(node: IProjectionNode) {
    node.clearSnapshot()
}

function clearMeasurements(node: IProjectionNode) {
    node.clearMeasurements()
}

function forceLayoutMeasure(node: IProjectionNode) {
    node.isLayoutDirty = true
    node.updateLayout()
}

function clearIsLayoutDirty(node: IProjectionNode) {
    node.isLayoutDirty = false
}

/**
 * When a node is animation-blocked (e.g. during drag) and its component
 * didn't re-render (memoized), willUpdate() is never called so there's
 * no snapshot. Use the previous layout as a snapshot and mark dirty so
 * resetTransform/updateLayout/notifyLayoutUpdate process it normally.
 */
function ensureDraggedNodesSnapshotted(node: IProjectionNode) {
    if (node.isAnimationBlocked && node.layout && !node.isLayoutDirty) {
        node.snapshot = node.layout
        node.isLayoutDirty = true
    }
}

function resetTransformStyle(node: IProjectionNode) {
    const { visualElement } = node.options
    if (visualElement && visualElement.getProps().onBeforeLayoutMeasure) {
        visualElement.notify("BeforeLayoutMeasure")
    }

    node.resetTransform()
}

function finishAnimation(node: IProjectionNode) {
    node.finishAnimation()
    node.targetDelta = node.relativeTarget = node.target = undefined
    node.isProjectionDirty = true
}

function resolveTargetDelta(node: IProjectionNode) {
    node.resolveTargetDelta()
}

function calcProjection(node: IProjectionNode) {
    node.calcProjection()
}

function resetSkewAndRotation(node: IProjectionNode) {
    node.resetSkewAndRotation()
}

function removeLeadSnapshots(stack: NodeStack) {
    stack.removeLeadSnapshot()
}

function mixAxisDeltaLinear(output: AxisDelta, delta: AxisDelta, p: number) {
    output.translate = mixNumber(delta.translate, 0, p)
    output.scale = mixNumber(delta.scale, 1, p)
    output.origin = delta.origin
    output.originPoint = delta.originPoint
}

export function mixAxis(output: Axis, from: Axis, to: Axis, p: number) {
    output.min = mixNumber(from.min, to.min, p)
    output.max = mixNumber(from.max, to.max, p)
}

export function mixBox(output: Box, from: Box, to: Box, p: number) {
    mixAxis(output.x, from.x, to.x, p)
    mixAxis(output.y, from.y, to.y, p)
}

function hasOpacityCrossfade(node: IProjectionNode) {
    return (
        node.animationValues && node.animationValues.opacityExit !== undefined
    )
}

const defaultLayoutTransition = {
    duration: 0.45,
    ease: [0.4, 0, 0.1, 1],
}

const userAgentContains = (string: string) =>
    typeof navigator !== "undefined" &&
    navigator.userAgent &&
    navigator.userAgent.toLowerCase().includes(string)

/**
 * Measured bounding boxes must be rounded in Safari and
 * left untouched in Chrome, otherwise non-integer layouts within scaled-up elements
 * can appear to jump.
 */
const roundPoint =
    userAgentContains("applewebkit/") && !userAgentContains("chrome/")
        ? Math.round
        : noop

function roundAxis(axis: Axis): void {
    // Round to the nearest .5 pixels to support subpixel layouts
    axis.min = roundPoint(axis.min)
    axis.max = roundPoint(axis.max)
}

function roundBox(box: Box): void {
    roundAxis(box.x)
    roundAxis(box.y)
}

function shouldAnimatePositionOnly(
    animationType: string | undefined,
    snapshot: Box,
    layout: Box
) {
    return (
        animationType === "position" ||
        (animationType === "preserve-aspect" &&
            !isNear(aspectRatio(snapshot), aspectRatio(layout), 0.2))
    )
}

function checkNodeWasScrollRoot(node: IProjectionNode) {
    return node !== node.root && node.scroll?.wasRoot
}

import {
    EasingFunction,
    SubscriptionManager,
    velocityPerSecond,
    warnOnce,
} from "motion-utils"
import {
    AnimationPlaybackControlsWithThen,
    AnyResolvedKeyframe,
    TransformProperties,
} from "../animation/types"
import { frame } from "../frameloop"
import { time } from "../frameloop/sync-time"

/**
 * @public
 */
export type Subscriber<T> = (v: T) => void

/**
 * @public
 */
export type PassiveEffect<T> = (v: T, safeSetter: (v: T) => void) => void

export type StartAnimation = (
    complete: () => void
) => AnimationPlaybackControlsWithThen | undefined

export interface MotionValueEventCallbacks<V> {
    animationStart: () => void
    animationComplete: () => void
    animationCancel: () => void
    change: (latestValue: V) => void
    destroy: () => void
}

/**
 * Maximum time between the value of two frames, beyond which we
 * assume the velocity has since been 0.
 */
const MAX_VELOCITY_DELTA = 30

const isFloat = (value: any): value is string => {
    return !isNaN(parseFloat(value))
}

interface ResolvedValues {
    [key: string]: AnyResolvedKeyframe
}

export interface Owner {
    current: HTMLElement | unknown
    getProps: () => {
        onUpdate?: (latest: ResolvedValues) => void
        transformTemplate?: (
            transform: TransformProperties,
            generatedTransform: string
        ) => string
    }
}

export interface AccelerateConfig {
    factory: (animation: AnimationPlaybackControlsWithThen) => VoidFunction
    times: number[]
    keyframes: any[]
    ease?: EasingFunction | EasingFunction[]
    duration: number
    isTransformed?: boolean
}

export interface MotionValueOptions {
    owner?: Owner
}

export const collectMotionValues: { current: MotionValue[] | undefined } = {
    current: undefined,
}

/**
 * `MotionValue` is used to track the state and velocity of motion values.
 *
 * @public
 */
export class MotionValue<V = any> {
    /**
     * If a MotionValue has an owner, it was created internally within Motion
     * and therefore has no external listeners. It is therefore safe to animate via WAAPI.
     */
    owner?: Owner

    /**
     * The current state of the `MotionValue`.
     */
    private current: V | undefined

    /**
     * The previous state of the `MotionValue`.
     */
    private prev: V | undefined

    /**
     * The previous state of the `MotionValue` at the end of the previous frame.
     */
    private prevFrameValue: V | undefined

    /**
     * The last time the `MotionValue` was updated.
     */
    updatedAt: number

    /**
     * The time `prevFrameValue` was updated.
     */
    prevUpdatedAt: number | undefined

    /**
     * Add a passive effect to this `MotionValue`.
     *
     * A passive effect intercepts calls to `set`. For instance, `useSpring` adds
     * a passive effect that attaches a `spring` to the latest
     * set value. Hypothetically there could be a `useSmooth` that attaches an input smoothing effect.
     *
     * @internal
     */
    private passiveEffect?: PassiveEffect<V>
    private stopPassiveEffect?: VoidFunction

    /**
     * Whether the passive effect is active.
     */
    isEffectActive?: boolean

    /**
     * A reference to the currently-controlling animation.
     */
    animation?: AnimationPlaybackControlsWithThen

    /**
     * Tracks whether this value can output a velocity. Currently this is only true
     * if the value is numerical, but we might be able to widen the scope here and support
     * other value types.
     *
     * @internal
     */
    private canTrackVelocity: boolean | null = null

    /**
     * A list of MotionValues whose values are computed from this one.
     * This is a rough start to a proper signal-like dirtying system.
     */
    private dependents: Set<MotionValue> | undefined

    /**
     * Tracks whether this value should be removed
     */
    liveStyle?: boolean

    /**
     * Scroll timeline acceleration metadata. When set, VisualElement
     * can create a native WAAPI animation attached to a scroll timeline
     * instead of driving updates through JS.
     */
    accelerate?: AccelerateConfig

    /**
     * @param init - The initiating value
     * @param config - Optional configuration options
     *
     * -  `transformer`: A function to transform incoming values with.
     */
    constructor(init: V, options: MotionValueOptions = {}) {
        this.setCurrent(init)
        this.owner = options.owner
    }

    setCurrent(current: V) {
        this.current = current
        this.updatedAt = time.now()

        if (this.canTrackVelocity === null && current !== undefined) {
            this.canTrackVelocity = isFloat(this.current)
        }
    }

    setPrevFrameValue(prevFrameValue: V | undefined = this.current) {
        this.prevFrameValue = prevFrameValue
        this.prevUpdatedAt = this.updatedAt
    }

    /**
     * Adds a function that will be notified when the `MotionValue` is updated.
     *
     * It returns a function that, when called, will cancel the subscription.
     *
     * When calling `onChange` inside a React component, it should be wrapped with the
     * `useEffect` hook. As it returns an unsubscribe function, this should be returned
     * from the `useEffect` function to ensure you don't add duplicate subscribers..
     *
     * ```jsx
     * export const MyComponent = () => {
     *   const x = useMotionValue(0)
     *   const y = useMotionValue(0)
     *   const opacity = useMotionValue(1)
     *
     *   useEffect(() => {
     *     function updateOpacity() {
     *       const maxXY = Math.max(x.get(), y.get())
     *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
     *       opacity.set(newOpacity)
     *     }
     *
     *     const unsubscribeX = x.on("change", updateOpacity)
     *     const unsubscribeY = y.on("change", updateOpacity)
     *
     *     return () => {
     *       unsubscribeX()
     *       unsubscribeY()
     *     }
     *   }, [])
     *
     *   return <motion.div style={{ x }} />
     * }
     * ```
     *
     * @param subscriber - A function that receives the latest value.
     * @returns A function that, when called, will cancel this subscription.
     *
     * @deprecated
     */
    onChange(subscription: Subscriber<V>): () => void {
        if (process.env.NODE_ENV !== "production") {
            warnOnce(
                false,
                `value.onChange(callback) is deprecated. Switch to value.on("change", callback).`
            )
        }
        return this.on("change", subscription)
    }

    /**
     * An object containing a SubscriptionManager for each active event.
     */
    private events: {
        [key: string]: SubscriptionManager<any>
    } = {}

    on<EventName extends keyof MotionValueEventCallbacks<V>>(
        eventName: EventName,
        callback: MotionValueEventCallbacks<V>[EventName]
    ) {
        if (!this.events[eventName]) {
            this.events[eventName] = new SubscriptionManager()
        }

        const unsubscribe = this.events[eventName].add(callback)

        if (eventName === "change") {
            return () => {
                unsubscribe()

                /**
                 * If we have no more change listeners by the start
                 * of the next frame, stop active animations.
                 */
                frame.read(() => {
                    if (!this.events.change.getSize()) {
                        this.stop()
                    }
                })
            }
        }

        return unsubscribe
    }

    clearListeners() {
        for (const eventManagers in this.events) {
            this.events[eventManagers].clear()
        }
    }

    /**
     * Attaches a passive effect to the `MotionValue`.
     */
    attach(passiveEffect: PassiveEffect<V>, stopPassiveEffect: VoidFunction) {
        this.passiveEffect = passiveEffect
        this.stopPassiveEffect = stopPassiveEffect
    }

    /**
     * Sets the state of the `MotionValue`.
     *
     * @remarks
     *
     * ```jsx
     * const x = useMotionValue(0)
     * x.set(10)
     * ```
     *
     * @param latest - Latest value to set.
     * @param render - Whether to notify render subscribers. Defaults to `true`
     *
     * @public
     */
    set(v: V) {
        if (!this.passiveEffect) {
            this.updateAndNotify(v)
        } else {
            this.passiveEffect(v, this.updateAndNotify)
        }
    }

    setWithVelocity(prev: V, current: V, delta: number) {
        this.set(current)
        this.prev = undefined
        this.prevFrameValue = prev
        this.prevUpdatedAt = this.updatedAt - delta
    }

    /**
     * Set the state of the `MotionValue`, stopping any active animations,
     * effects, and resets velocity to `0`.
     */
    jump(v: V, endAnimation = true) {
        this.updateAndNotify(v)
        this.prev = v
        this.prevUpdatedAt = this.prevFrameValue = undefined
        endAnimation && this.stop()
        if (this.stopPassiveEffect) this.stopPassiveEffect()
    }

    dirty() {
        this.events.change?.notify(this.current)
    }

    addDependent(dependent: MotionValue) {
        if (!this.dependents) {
            this.dependents = new Set()
        }
        this.dependents.add(dependent)
    }

    removeDependent(dependent: MotionValue) {
        if (this.dependents) {
            this.dependents.delete(dependent)
        }
    }

    updateAndNotify = (v: V) => {
        const currentTime = time.now()

        /**
         * If we're updating the value during another frame or eventloop
         * than the previous frame, then the we set the previous frame value
         * to current.
         */
        if (this.updatedAt !== currentTime) {
            this.setPrevFrameValue()
        }

        this.prev = this.current

        this.setCurrent(v)

        // Update update subscribers
        if (this.current !== this.prev) {
            this.events.change?.notify(this.current)

            if (this.dependents) {
                for (const dependent of this.dependents) {
                    dependent.dirty()
                }
            }
        }
    }

    /**
     * Returns the latest state of `MotionValue`
     *
     * @returns - The latest state of `MotionValue`
     *
     * @public
     */
    get() {
        if (collectMotionValues.current) {
            collectMotionValues.current.push(this)
        }

        return this.current!
    }

    /**
     * @public
     */
    getPrevious() {
        return this.prev
    }

    /**
     * Returns the latest velocity of `MotionValue`
     *
     * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
     *
     * @public
     */
    getVelocity() {
        const currentTime = time.now()

        if (
            !this.canTrackVelocity ||
            this.prevFrameValue === undefined ||
            currentTime - this.updatedAt > MAX_VELOCITY_DELTA
        ) {
            return 0
        }

        const delta = Math.min(
            this.updatedAt - this.prevUpdatedAt!,
            MAX_VELOCITY_DELTA
        )

        // Casts because of parseFloat's poor typing
        return velocityPerSecond(
            parseFloat(this.current as any) -
                parseFloat(this.prevFrameValue as any),
            delta
        )
    }

    hasAnimated = false

    /**
     * Registers a new animation to control this `MotionValue`. Only one
     * animation can drive a `MotionValue` at one time.
     *
     * ```jsx
     * value.start()
     * ```
     *
     * @param animation - A function that starts the provided animation
     */
    start(startAnimation: StartAnimation) {
        this.stop()

        return new Promise<void>((resolve) => {
            this.hasAnimated = true
            this.animation = startAnimation(resolve)

            if (this.events.animationStart) {
                this.events.animationStart.notify()
            }
        }).then(() => {
            if (this.events.animationComplete) {
                this.events.animationComplete.notify()
            }
            this.clearAnimation()
        })
    }

    /**
     * Stop the currently active animation.
     *
     * @public
     */
    stop() {
        if (this.animation) {
            this.animation.stop()
            if (this.events.animationCancel) {
                this.events.animationCancel.notify()
            }
        }
        this.clearAnimation()
    }

    /**
     * Returns `true` if this value is currently animating.
     *
     * @public
     */
    isAnimating() {
        return !!this.animation
    }

    private clearAnimation() {
        delete this.animation
    }

    /**
     * Destroy and clean up subscribers to this `MotionValue`.
     *
     * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
     * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
     * created a `MotionValue` via the `motionValue` function.
     *
     * @public
     */
    destroy() {
        this.dependents?.clear()
        this.events.destroy?.notify()
        this.clearListeners()
        this.stop()

        if (this.stopPassiveEffect) {
            this.stopPassiveEffect()
        }
    }
}

export function motionValue<V>(init: V, options?: MotionValueOptions) {
    return new MotionValue<V>(init, options)
}

import { clamp } from "motion-utils"
import { time } from "../frameloop/sync-time"
import { setStyle } from "../render/dom/style-set"
import { JSAnimation } from "./JSAnimation"
import { NativeAnimation, NativeAnimationOptions } from "./NativeAnimation"
import { AnyResolvedKeyframe, ValueAnimationOptions } from "./types"
import { replaceTransitionType } from "./utils/replace-transition-type"
import { replaceStringEasing } from "./waapi/utils/unsupported-easing"

export type NativeAnimationOptionsExtended<T extends AnyResolvedKeyframe> =
    NativeAnimationOptions & ValueAnimationOptions<T> & NativeAnimationOptions

/**
 * 10ms is chosen here as it strikes a balance between smooth
 * results (more than one keyframe per frame at 60fps) and
 * keyframe quantity.
 */
const sampleDelta = 10 //ms

export class NativeAnimationExtended<
    T extends AnyResolvedKeyframe
> extends NativeAnimation<T> {
    options: NativeAnimationOptionsExtended<T>

    constructor(options: NativeAnimationOptionsExtended<T>) {
        /**
         * The base NativeAnimation function only supports a subset
         * of Motion easings, and WAAPI also only supports some
         * easing functions via string/cubic-bezier definitions.
         *
         * This function replaces those unsupported easing functions
         * with a JS easing function. This will later get compiled
         * to a linear() easing function.
         */
        replaceStringEasing(options)

        /**
         * Ensure we replace the transition type with a generator function
         * before passing to WAAPI.
         *
         * TODO: Does this have a better home? It could be shared with
         * JSAnimation.
         */
        replaceTransitionType(options)

        super(options)

        /**
         * Only set startTime when the animation should autoplay.
         * Setting startTime on a paused WAAPI animation unpauses it
         * (per the WAAPI spec), which breaks autoplay: false.
         */
        if (options.startTime !== undefined && options.autoplay !== false) {
            this.startTime = options.startTime
        }

        this.options = options
    }

    /**
     * WAAPI doesn't natively have any interruption capabilities.
     *
     * Rather than read committed styles back out of the DOM, we can
     * create a renderless JS animation and sample it twice to calculate
     * its current value, "previous" value, and therefore allow
     * Motion to calculate velocity for any subsequent animation.
     */
    updateMotionValue(value?: T) {
        const { motionValue, onUpdate, onComplete, element, ...options } =
            this.options

        if (!motionValue) return

        if (value !== undefined) {
            motionValue.set(value)
            return
        }

        const sampleAnimation = new JSAnimation({
            ...options,
            autoplay: false,
        })

        /**
         * Use wall-clock elapsed time for sampling.
         * Under CPU load, WAAPI's currentTime may not reflect actual
         * elapsed time, causing incorrect sampling and visual jumps.
         */
        const sampleTime = Math.max(sampleDelta, time.now() - this.startTime)
        const delta = clamp(0, sampleDelta, sampleTime - sampleDelta)
        const current = sampleAnimation.sample(sampleTime).value

        /**
         * Write the estimated value to inline style so it persists
         * after cancel(), covering the async gap before the next
         * animation starts.
         */
        const { name } = this.options
        if (element && name) setStyle(element, name, current)

        motionValue.setWithVelocity(
            sampleAnimation.sample(Math.max(0, sampleTime - delta)).value,
            current,
            delta
        )

        sampleAnimation.stop()
    }
}

import {
    clamp,
    invariant,
    millisecondsToSeconds,
    pipe,
    secondsToMilliseconds,
} from "motion-utils"
import { time } from "../frameloop/sync-time"
import { mix } from "../utils/mix"
import { Mixer } from "../utils/mix/types"
import { frameloopDriver } from "./drivers/frame"
import { DriverControls } from "./drivers/types"
import { inertia } from "./generators/inertia"
import { keyframes as keyframesGenerator } from "./generators/keyframes"
import { calcGeneratorDuration } from "./generators/utils/calc-duration"
import { getGeneratorVelocity } from "./generators/utils/velocity"
import { getFinalKeyframe } from "./keyframes/get-final"
import {
    AnimationPlaybackControlsWithThen,
    AnimationState,
    GeneratorFactory,
    KeyframeGenerator,
    TimelineWithFallback,
    ValueAnimationOptions,
} from "./types"
import { replaceTransitionType } from "./utils/replace-transition-type"
import { WithPromise } from "./utils/WithPromise"

const percentToProgress = (percent: number) => percent / 100

export class JSAnimation<T extends number | string>
    extends WithPromise
    implements AnimationPlaybackControlsWithThen
{
    state: AnimationPlayState = "idle"

    startTime: number | null = null

    /**
     * The driver that's controlling the animation loop. Normally this is a requestAnimationFrame loop
     * but in tests we can pass in a synchronous loop.
     */
    private driver?: DriverControls

    private isStopped = false

    private generator: KeyframeGenerator<T>

    private calculatedDuration: number

    private resolvedDuration: number

    private totalDuration: number

    private options: ValueAnimationOptions<T>

    /**
     * The current time of the animation.
     */
    private currentTime: number = 0

    /**
     * The time at which the animation was paused.
     */
    private holdTime: number | null = null

    /**
     * Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
     */
    private playbackSpeed = 1

    /*
     * If our generator doesn't support mixing numbers, we need to replace keyframes with
     * [0, 100] and then make a function that maps that to the actual keyframes.
     *
     * 100 is chosen instead of 1 as it works nicer with spring animations.
     */
    private mixKeyframes: Mixer<T> | undefined

    private mirroredGenerator: KeyframeGenerator<T> | undefined

    /**
     * Reusable state object for the delay phase to avoid
     * allocating a new object every frame.
     */
    private delayState: AnimationState<T> = {
        done: false,
        value: undefined as unknown as T,
    }

    constructor(options: ValueAnimationOptions<T>) {
        super()

        this.options = options
        this.initAnimation()
        this.play()

        if (options.autoplay === false) this.pause()
    }

    initAnimation() {
        const { options } = this

        replaceTransitionType(options)

        const {
            type = keyframesGenerator,
            repeat = 0,
            repeatDelay = 0,
            repeatType,
            velocity = 0,
        } = options
        let { keyframes } = options

        const generatorFactory =
            (type as GeneratorFactory) || keyframesGenerator

        if (
            process.env.NODE_ENV !== "production" &&
            generatorFactory !== keyframesGenerator
        ) {
            invariant(
                keyframes.length <= 2,
                `Only two keyframes currently supported with spring and inertia animations. Trying to animate ${keyframes}`,
                "spring-two-frames"
            )
        }

        if (
            generatorFactory !== keyframesGenerator &&
            typeof keyframes[0] !== "number"
        ) {
            this.mixKeyframes = pipe(
                percentToProgress,
                mix(keyframes[0], keyframes[1])
            ) as (t: number) => T

            keyframes = [0 as T, 100 as T]
        }

        const generator = generatorFactory({ ...options, keyframes })

        /**
         * If we have a mirror repeat type we need to create a second generator that outputs the
         * mirrored (not reversed) animation and later ping pong between the two generators.
         */
        if (repeatType === "mirror") {
            this.mirroredGenerator = generatorFactory({
                ...options,
                keyframes: [...keyframes].reverse(),
                velocity: -velocity,
            })
        }

        /**
         * If duration is undefined and we have repeat options,
         * we need to calculate a duration from the generator.
         *
         * We set it to the generator itself to cache the duration.
         * Any timeline resolver will need to have already precalculated
         * the duration by this step.
         */
        if (generator.calculatedDuration === null) {
            generator.calculatedDuration = calcGeneratorDuration(generator)
        }

        const { calculatedDuration } = generator
        this.calculatedDuration = calculatedDuration
        this.resolvedDuration = calculatedDuration + repeatDelay
        this.totalDuration = this.resolvedDuration * (repeat + 1) - repeatDelay
        this.generator = generator
    }

    updateTime(timestamp: number) {
        const animationTime =
            Math.round(timestamp - this.startTime!) * this.playbackSpeed

        // Update currentTime
        if (this.holdTime !== null) {
            this.currentTime = this.holdTime
        } else {
            // Rounding the time because floating point arithmetic is not always accurate, e.g. 3000.367 - 1000.367 =
            // 2000.0000000000002. This is a problem when we are comparing the currentTime with the duration, for
            // example.
            this.currentTime = animationTime
        }
    }

    tick(timestamp: number, sample = false) {
        const {
            generator,
            totalDuration,
            mixKeyframes,
            mirroredGenerator,
            resolvedDuration,
            calculatedDuration,
        } = this

        if (this.startTime === null) return generator.next(0)

        const {
            delay = 0,
            keyframes,
            repeat,
            repeatType,
            repeatDelay,
            type,
            onUpdate,
            finalKeyframe,
        } = this.options

        /**
         * requestAnimationFrame timestamps can come through as lower than
         * the startTime as set by performance.now(). Here we prevent this,
         * though in the future it could be possible to make setting startTime
         * a pending operation that gets resolved here.
         */
        if (this.speed > 0) {
            this.startTime = Math.min(this.startTime, timestamp)
        } else if (this.speed < 0) {
            this.startTime = Math.min(
                timestamp - totalDuration / this.speed,
                this.startTime
            )
        }

        if (sample) {
            this.currentTime = timestamp
        } else {
            this.updateTime(timestamp)
        }

        // Rebase on delay
        const timeWithoutDelay =
            this.currentTime - delay * (this.playbackSpeed >= 0 ? 1 : -1)
        const isInDelayPhase =
            this.playbackSpeed >= 0
                ? timeWithoutDelay < 0
                : timeWithoutDelay > totalDuration
        this.currentTime = Math.max(timeWithoutDelay, 0)

        // If this animation has finished, set the current time  to the total duration.
        if (this.state === "finished" && this.holdTime === null) {
            this.currentTime = totalDuration
        }

        let elapsed = this.currentTime
        let frameGenerator = generator

        if (repeat) {
            /**
             * Get the current progress (0-1) of the animation. If t is >
             * than duration we'll get values like 2.5 (midway through the
             * third iteration)
             */
            const progress =
                Math.min(this.currentTime, totalDuration) / resolvedDuration

            /**
             * Get the current iteration (0 indexed). For instance the floor of
             * 2.5 is 2.
             */
            let currentIteration = Math.floor(progress)

            /**
             * Get the current progress of the iteration by taking the remainder
             * so 2.5 is 0.5 through iteration 2
             */
            let iterationProgress = progress % 1.0

            /**
             * If iteration progress is 1 we count that as the end
             * of the previous iteration.
             */
            if (!iterationProgress && progress >= 1) {
                iterationProgress = 1
            }

            iterationProgress === 1 && currentIteration--

            currentIteration = Math.min(currentIteration, repeat + 1)

            /**
             * Reverse progress if we're not running in "normal" direction
             */

            const isOddIteration = Boolean(currentIteration % 2)
            if (isOddIteration) {
                if (repeatType === "reverse") {
                    iterationProgress = 1 - iterationProgress
                    if (repeatDelay) {
                        iterationProgress -= repeatDelay / resolvedDuration
                    }
                } else if (repeatType === "mirror") {
                    frameGenerator = mirroredGenerator!
                }
            }

            elapsed = clamp(0, 1, iterationProgress) * resolvedDuration
        }

        /**
         * If we're in negative time, set state as the initial keyframe.
         * This prevents delay: x, duration: 0 animations from finishing
         * instantly.
         */
        let state: AnimationState<T>
        if (isInDelayPhase) {
            this.delayState.value = keyframes[0]
            state = this.delayState
        } else {
            state = frameGenerator.next(elapsed)
        }

        if (mixKeyframes && !isInDelayPhase) {
            state.value = mixKeyframes(state.value as number)
        }

        let { done } = state

        if (!isInDelayPhase && calculatedDuration !== null) {
            done =
                this.playbackSpeed >= 0
                    ? this.currentTime >= totalDuration
                    : this.currentTime <= 0
        }

        const isAnimationFinished =
            this.holdTime === null &&
            (this.state === "finished" || (this.state === "running" && done))

        // TODO: The exception for inertia could be cleaner here
        if (isAnimationFinished && type !== inertia) {
            state.value = getFinalKeyframe(
                keyframes,
                this.options,
                finalKeyframe,
                this.speed
            )
        }

        if (onUpdate) {
            onUpdate(state.value)
        }

        if (isAnimationFinished) {
            this.finish()
        }

        return state
    }

    /**
     * Allows the returned animation to be awaited or promise-chained. Currently
     * resolves when the animation finishes at all but in a future update could/should
     * reject if its cancels.
     */
    then(resolve: VoidFunction, reject?: VoidFunction) {
        return this.finished.then(resolve, reject)
    }

    get duration() {
        return millisecondsToSeconds(this.calculatedDuration)
    }

    get iterationDuration() {
        const { delay = 0 } = this.options || {}
        return this.duration + millisecondsToSeconds(delay)
    }

    get time() {
        return millisecondsToSeconds(this.currentTime)
    }

    set time(newTime: number) {
        newTime = secondsToMilliseconds(newTime)
        this.currentTime = newTime

        if (
            this.startTime === null ||
            this.holdTime !== null ||
            this.playbackSpeed === 0
        ) {
            this.holdTime = newTime
        } else if (this.driver) {
            this.startTime = this.driver.now() - newTime / this.playbackSpeed
        }

        if (this.driver) {
            this.driver.start(false)
        } else {
            this.startTime = 0
            this.state = "paused"
            this.holdTime = newTime
            this.tick(newTime)
        }
    }

    /**
     * Returns the generator's velocity at the current time in units/second.
     * Uses the analytical derivative when available (springs), avoiding
     * the MotionValue's frame-dependent velocity estimation.
     */
    getGeneratorVelocity(): number {
        const t = this.currentTime
        if (t <= 0) return this.options.velocity || 0

        if (this.generator.velocity) {
            return this.generator.velocity(t)
        }

        // Fallback: finite difference
        const current = this.generator.next(t).value as number
        return getGeneratorVelocity(
            (s) => this.generator.next(s).value as number,
            t,
            current
        )
    }

    get speed() {
        return this.playbackSpeed
    }

    set speed(newSpeed: number) {
        const hasChanged = this.playbackSpeed !== newSpeed

        if (hasChanged && this.driver) {
            this.updateTime(time.now())
        }

        this.playbackSpeed = newSpeed

        if (hasChanged && this.driver) {
            this.time = millisecondsToSeconds(this.currentTime)
        }
    }

    play() {
        if (this.isStopped) return

        const { driver = frameloopDriver, startTime } = this.options

        if (!this.driver) {
            this.driver = driver((timestamp) => this.tick(timestamp))
        }

        this.options.onPlay?.()

        const now = this.driver.now()

        if (this.state === "finished") {
            this.updateFinished()
            this.startTime = now
        } else if (this.holdTime !== null) {
            this.startTime = now - this.holdTime
        } else if (!this.startTime) {
            this.startTime = startTime ?? now
        }

        if (this.state === "finished" && this.speed < 0) {
            this.startTime += this.calculatedDuration
        }

        this.holdTime = null

        /**
         * Set playState to running only after we've used it in
         * the previous logic.
         */
        this.state = "running"

        this.driver.start()
    }

    pause() {
        this.state = "paused"
        this.updateTime(time.now())
        this.holdTime = this.currentTime
    }

    /**
     * This method is bound to the instance to fix a pattern where
     * animation.stop is returned as a reference from a useEffect.
     */
    stop = () => {
        const { motionValue } = this.options
        if (motionValue && motionValue.updatedAt !== time.now()) {
            this.tick(time.now())
        }

        this.isStopped = true
        if (this.state === "idle") return
        this.teardown()
        this.options.onStop?.()
    }

    complete() {
        if (this.state !== "running") {
            this.play()
        }

        this.state = "finished"
        this.holdTime = null
    }

    finish() {
        this.notifyFinished()
        this.teardown()
        this.state = "finished"

        this.options.onComplete?.()
    }

    cancel() {
        this.holdTime = null
        this.startTime = 0
        this.tick(0)
        this.teardown()
        this.options.onCancel?.()
    }

    private teardown() {
        this.state = "idle"
        this.stopDriver()
        this.startTime = this.holdTime = null
    }

    private stopDriver() {
        if (!this.driver) return
        this.driver.stop()
        this.driver = undefined
    }

    sample(sampleTime: number): AnimationState<T> {
        this.startTime = 0
        return this.tick(sampleTime, true)
    }

    attachTimeline(timeline: TimelineWithFallback): VoidFunction {
        if (this.options.allowFlatten) {
            this.options.type = "keyframes"
            this.options.ease = "linear"
            this.initAnimation()
        }

        this.driver?.stop()
        return timeline.observe(this)
    }
}

// Legacy function support
export function animateValue<T extends number | string>(
    options: ValueAnimationOptions<T>
) {
    return new JSAnimation(options)
}

import { MotionProps } from "../types"

/**
 * A list of all valid MotionProps.
 *
 * @privateRemarks
 * This doesn't throw if a `MotionProp` name is missing - it should.
 */
const validMotionProps = new Set<keyof MotionProps>([
    "animate",
    "exit",
    "variants",
    "initial",
    "style",
    "values",
    "variants",
    "transition",
    "transformTemplate",
    "custom",
    "inherit",
    "onBeforeLayoutMeasure",
    "onAnimationStart",
    "onAnimationComplete",
    "onUpdate",
    "onDragStart",
    "onDrag",
    "onDragEnd",
    "onMeasureDragConstraints",
    "onDirectionLock",
    "onDragTransitionEnd",
    "_dragX",
    "_dragY",
    "onHoverStart",
    "onHoverEnd",
    "onViewportEnter",
    "onViewportLeave",
    "globalTapTarget",
    "propagate",
    "ignoreStrict",
    "viewport",
])

/**
 * Check whether a prop name is a valid `MotionProp` key.
 *
 * @param key - Name of the property to check
 * @returns `true` is key is a valid `MotionProp`.
 *
 * @public
 */
export function isValidMotionProp(key: string) {
    return (
        key.startsWith("while") ||
        (key.startsWith("drag") && key !== "draggable") ||
        key.startsWith("layout") ||
        key.startsWith("onTap") ||
        key.startsWith("onPan") ||
        key.startsWith("onLayout") ||
        validMotionProps.has(key as keyof MotionProps)
    )
}

import {
    Box,
    isNumericalString,
    isZeroValueString,
    secondsToMilliseconds,
    SubscriptionManager,
    warnOnce,
} from "motion-utils"
import { KeyframeResolver } from "../animation/keyframes/KeyframesResolver"
import { NativeAnimation } from "../animation/NativeAnimation"
import type { AnyResolvedKeyframe } from "../animation/types"
import { acceleratedValues } from "../animation/waapi/utils/accelerated-values"
import { cancelFrame, frame } from "../frameloop"
import { microtask } from "../frameloop/microtask"
import { time } from "../frameloop/sync-time"
import type { MotionNodeOptions } from "../node/types"
import { createBox } from "../projection/geometry/models"
import { motionValue, MotionValue } from "../value"
import { complex } from "../value/types/complex"
import { getAnimatableNone } from "../value/types/utils/animatable-none"
import { findValueType } from "../value/types/utils/find"
import { isMotionValue } from "../value/utils/is-motion-value"
import { Feature } from "./Feature"
import { visualElementStore } from "./store"
import {
    FeatureDefinitions,
    MotionConfigContextProps,
    PresenceContextProps,
    ReducedMotionConfig,
    ResolvedValues,
    VisualElementEventCallbacks,
    VisualElementOptions,
} from "./types"
import { AnimationState } from "./utils/animation-state"
import {
    isControllingVariants as checkIsControllingVariants,
    isVariantNode as checkIsVariantNode,
} from "./utils/is-controlling-variants"
import { transformProps } from "./utils/keys-transform"
import { updateMotionValuesFromProps } from "./utils/motion-values"
import {
    hasReducedMotionListener,
    initPrefersReducedMotion,
    prefersReducedMotion,
} from "./utils/reduced-motion"
import { resolveVariantFromProps } from "./utils/resolve-variants"

const propEventHandlers = [
    "AnimationStart",
    "AnimationComplete",
    "Update",
    "BeforeLayoutMeasure",
    "LayoutMeasure",
    "LayoutAnimationStart",
    "LayoutAnimationComplete",
] as const

/**
 * Static feature definitions - can be injected by framework layer
 */
let featureDefinitions: Partial<FeatureDefinitions> = {}

/**
 * Set feature definitions for all VisualElements.
 * This should be called by the framework layer (e.g., framer-motion) during initialization.
 */
export function setFeatureDefinitions(
    definitions: Partial<FeatureDefinitions>
) {
    featureDefinitions = definitions
}

/**
 * Get the current feature definitions
 */
export function getFeatureDefinitions(): Partial<FeatureDefinitions> {
    return featureDefinitions
}

/**
 * Motion style type - a subset of CSS properties that can contain motion values
 */
export type MotionStyle = {
    [K: string]: AnyResolvedKeyframe | MotionValue | undefined
}

/**
 * A VisualElement is an imperative abstraction around UI elements such as
 * HTMLElement, SVGElement, Three.Object3D etc.
 */
export abstract class VisualElement<
    Instance = unknown,
    RenderState = unknown,
    Options extends {} = {}
> {
    /**
     * VisualElements are arranged in trees mirroring that of the React tree.
     * Each type of VisualElement has a unique name, to detect when we're crossing
     * type boundaries within that tree.
     */
    abstract type: string

    /**
     * An `Array.sort` compatible function that will compare two Instances and
     * compare their respective positions within the tree.
     */
    abstract sortInstanceNodePosition(a: Instance, b: Instance): number

    /**
     * Measure the viewport-relative bounding box of the Instance.
     */
    abstract measureInstanceViewportBox(
        instance: Instance,
        props: MotionNodeOptions & Partial<MotionConfigContextProps>
    ): Box

    /**
     * When a value has been removed from all animation props we need to
     * pick a target to animate back to. For instance, for HTMLElements
     * we can look in the style prop.
     */
    abstract getBaseTargetFromProps(
        props: MotionNodeOptions,
        key: string
    ): AnyResolvedKeyframe | undefined | MotionValue

    /**
     * When we first animate to a value we need to animate it *from* a value.
     * Often this have been specified via the initial prop but it might be
     * that the value needs to be read from the Instance.
     */
    abstract readValueFromInstance(
        instance: Instance,
        key: string,
        options: Options
    ): AnyResolvedKeyframe | null | undefined

    /**
     * When a value has been removed from the VisualElement we use this to remove
     * it from the inherting class' unique render state.
     */
    abstract removeValueFromRenderState(
        key: string,
        renderState: RenderState
    ): void

    /**
     * Run before a React or VisualElement render, builds the latest motion
     * values into an Instance-specific format. For example, HTMLVisualElement
     * will use this step to build `style` and `var` values.
     */
    abstract build(
        renderState: RenderState,
        latestValues: ResolvedValues,
        props: MotionNodeOptions
    ): void

    /**
     * Apply the built values to the Instance. For example, HTMLElements will have
     * styles applied via `setProperty` and the style attribute, whereas SVGElements
     * will have values applied to attributes.
     */
    abstract renderInstance(
        instance: Instance,
        renderState: RenderState,
        styleProp?: MotionStyle,
        projection?: any
    ): void

    /**
     * This method is called when a transform property is bound to a motion value.
     * It's currently used to measure SVG elements when a new transform property is bound.
     */
    onBindTransform?(): void

    /**
     * If the component child is provided as a motion value, handle subscriptions
     * with the renderer-specific VisualElement.
     */
    handleChildMotionValue?(): void

    /**
     * This method takes React props and returns found MotionValues. For example, HTML
     * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
     *
     * This isn't an abstract method as it needs calling in the constructor, but it is
     * intended to be one.
     */
    scrapeMotionValuesFromProps(
        _props: MotionNodeOptions,
        _prevProps: MotionNodeOptions,
        _visualElement: VisualElement
    ): {
        [key: string]: MotionValue | AnyResolvedKeyframe
    } {
        return {}
    }

    /**
     * A reference to the current underlying Instance, e.g. a HTMLElement
     * or Three.Mesh etc.
     */
    current: Instance | null = null

    /**
     * A reference to the parent VisualElement (if exists).
     */
    parent: VisualElement | undefined

    /**
     * A set containing references to this VisualElement's children.
     */
    children = new Set<VisualElement>()

    /**
     * A set containing the latest children of this VisualElement. This is flushed
     * at the start of every commit. We use it to calculate the stagger delay
     * for newly-added children.
     */
    enteringChildren?: Set<VisualElement>

    /**
     * The depth of this VisualElement within the overall VisualElement tree.
     */
    depth: number

    /**
     * The current render state of this VisualElement. Defined by inherting VisualElements.
     */
    renderState: RenderState

    /**
     * An object containing the latest static values for each of this VisualElement's
     * MotionValues.
     */
    latestValues: ResolvedValues

    /**
     * Determine what role this visual element should take in the variant tree.
     */
    isVariantNode: boolean = false
    isControllingVariants: boolean = false

    /**
     * If this component is part of the variant tree, it should track
     * any children that are also part of the tree. This is essentially
     * a shadow tree to simplify logic around how to stagger over children.
     */
    variantChildren?: Set<VisualElement>

    /**
     * Decides whether this VisualElement should animate in reduced motion
     * mode.
     *
     * TODO: This is currently set on every individual VisualElement but feels
     * like it could be set globally.
     */
    shouldReduceMotion: boolean | null = null

    /**
     * Decides whether animations should be skipped for this VisualElement.
     * Useful for E2E tests and visual regression testing.
     */
    shouldSkipAnimations: boolean = false

    /**
     * Normally, if a component is controlled by a parent's variants, it can
     * rely on that ancestor to trigger animations further down the tree.
     * However, if a component is created after its parent is mounted, the parent
     * won't trigger that mount animation so the child needs to.
     *
     * TODO: This might be better replaced with a method isParentMounted
     */
    manuallyAnimateOnMount: boolean

    /**
     * This can be set by AnimatePresence to force components that mount
     * at the same time as it to mount as if they have initial={false} set.
     */
    blockInitialAnimation: boolean

    /**
     * A reference to this VisualElement's projection node, used in layout animations.
     */
    projection?: any

    /**
     * A map of all motion values attached to this visual element. Motion
     * values are source of truth for any given animated value. A motion
     * value might be provided externally by the component via props.
     */
    values = new Map<string, MotionValue>()

    /**
     * The AnimationState, this is hydrated by the animation Feature.
     */
    animationState?: AnimationState

    KeyframeResolver = KeyframeResolver

    /**
     * The options used to create this VisualElement. The Options type is defined
     * by the inheriting VisualElement and is passed straight through to the render functions.
     */
    readonly options: Options

    /**
     * A reference to the latest props provided to the VisualElement's host React component.
     */
    props: MotionNodeOptions
    prevProps?: MotionNodeOptions

    presenceContext: PresenceContextProps | null
    prevPresenceContext?: PresenceContextProps | null

    /**
     * Cleanup functions for active features (hover/tap/exit etc)
     */
    private features: {
        [K in keyof FeatureDefinitions]?: Feature<Instance>
    } = {}

    /**
     * A map of every subscription that binds the provided or generated
     * motion values onChange listeners to this visual element.
     */
    private valueSubscriptions = new Map<string, VoidFunction>()

    /**
     * A reference to the ReducedMotionConfig passed to the VisualElement's host React component.
     */
    private reducedMotionConfig: ReducedMotionConfig | undefined

    /**
     * A reference to the skipAnimations config passed to the VisualElement's host React component.
     */
    private skipAnimationsConfig: boolean | undefined

    /**
     * On mount, this will be hydrated with a callback to disconnect
     * this visual element from its parent on unmount.
     */
    private removeFromVariantTree: undefined | VoidFunction

    /**
     * A reference to the previously-provided motion values as returned
     * from scrapeMotionValuesFromProps. We use the keys in here to determine
     * if any motion values need to be removed after props are updated.
     */
    private prevMotionValues: MotionStyle = {}

    /**
     * When values are removed from all animation props we need to search
     * for a fallback value to animate to. These values are tracked in baseTarget.
     */
    private baseTarget: ResolvedValues

    /**
     * Create an object of the values we initially animated from (if initial prop present).
     */
    private initialValues: ResolvedValues

    /**
     * Track whether this element has been mounted before, to detect
     * remounts after Suspense unmount/remount cycles.
     */
    private hasBeenMounted = false

    /**
     * An object containing a SubscriptionManager for each active event.
     */
    private events: {
        [key: string]: SubscriptionManager<any>
    } = {}

    /**
     * An object containing an unsubscribe function for each prop event subscription.
     * For example, every "Update" event can have multiple subscribers via
     * VisualElement.on(), but only one of those can be defined via the onUpdate prop.
     */
    private propEventSubscriptions: {
        [key: string]: VoidFunction
    } = {}

    constructor(
        {
            parent,
            props,
            presenceContext,
            reducedMotionConfig,
            skipAnimations,
            blockInitialAnimation,
            visualState,
        }: VisualElementOptions<Instance, RenderState>,
        options: Options = {} as any
    ) {
        const { latestValues, renderState } = visualState
        this.latestValues = latestValues
        this.baseTarget = { ...latestValues }
        this.initialValues = props.initial ? { ...latestValues } : {}
        this.renderState = renderState
        this.parent = parent
        this.props = props
        this.presenceContext = presenceContext
        this.depth = parent ? parent.depth + 1 : 0
        this.reducedMotionConfig = reducedMotionConfig
        this.skipAnimationsConfig = skipAnimations
        this.options = options
        this.blockInitialAnimation = Boolean(blockInitialAnimation)

        this.isControllingVariants = checkIsControllingVariants(props)
        this.isVariantNode = checkIsVariantNode(props)
        if (this.isVariantNode) {
            this.variantChildren = new Set()
        }

        this.manuallyAnimateOnMount = Boolean(parent && parent.current)

        /**
         * Any motion values that are provided to the element when created
         * aren't yet bound to the element, as this would technically be impure.
         * However, we iterate through the motion values and set them to the
         * initial values for this component.
         *
         * TODO: This is impure and we should look at changing this to run on mount.
         * Doing so will break some tests but this isn't necessarily a breaking change,
         * more a reflection of the test.
         */
        const { willChange, ...initialMotionValues } =
            this.scrapeMotionValuesFromProps(props, {}, this)

        for (const key in initialMotionValues) {
            const value = initialMotionValues[key]

            if (latestValues[key] !== undefined && isMotionValue(value)) {
                value.set(latestValues[key])
            }
        }
    }

    mount(instance: Instance) {
        /**
         * If this element has been mounted before (e.g. after a Suspense
         * unmount/remount), reset motion values to their initial state
         * so animations replay correctly from initial â†’ animate.
         */
        if (this.hasBeenMounted) {
            for (const key in this.initialValues) {
                this.values.get(key)?.jump(this.initialValues[key])
                this.latestValues[key] = this.initialValues[key]
            }
        }

        this.current = instance

        visualElementStore.set(instance, this)

        if (this.projection && !this.projection.instance) {
            this.projection.mount(instance)
        }

        if (this.parent && this.isVariantNode && !this.isControllingVariants) {
            this.removeFromVariantTree = this.parent.addVariantChild(this)
        }

        this.values.forEach((value, key) => this.bindToMotionValue(key, value))

        /**
         * Determine reduced motion preference. Only initialize the matchMedia
         * listener if we actually need the dynamic value (i.e., when config
         * is neither "never" nor "always").
         */
        if (this.reducedMotionConfig === "never") {
            this.shouldReduceMotion = false
        } else if (this.reducedMotionConfig === "always") {
            this.shouldReduceMotion = true
        } else {
            if (!hasReducedMotionListener.current) {
                initPrefersReducedMotion()
            }
            this.shouldReduceMotion = prefersReducedMotion.current
        }

        if (process.env.NODE_ENV !== "production") {
            warnOnce(
                this.shouldReduceMotion !== true,
                "You have Reduced Motion enabled on your device. Animations may not appear as expected.",
                "reduced-motion-disabled"
            )
        }

        /**
         * Set whether animations should be skipped based on the config.
         */
        this.shouldSkipAnimations = this.skipAnimationsConfig ?? false

        this.parent?.addChild(this)

        this.update(this.props, this.presenceContext)

        this.hasBeenMounted = true
    }

    unmount() {
        this.projection && this.projection.unmount()
        cancelFrame(this.notifyUpdate)
        cancelFrame(this.render)
        this.valueSubscriptions.forEach((remove) => remove())
        this.valueSubscriptions.clear()
        this.removeFromVariantTree && this.removeFromVariantTree()
        this.parent?.removeChild(this)

        for (const key in this.events) {
            this.events[key].clear()
        }

        for (const key in this.features) {
            const feature = this.features[key as keyof typeof this.features]
            if (feature) {
                feature.unmount()
                feature.isMounted = false
            }
        }
        this.current = null
    }

    addChild(child: VisualElement) {
        this.children.add(child)
        this.enteringChildren ??= new Set()
        this.enteringChildren.add(child)
    }

    removeChild(child: VisualElement) {
        this.children.delete(child)
        this.enteringChildren && this.enteringChildren.delete(child)
    }

    private bindToMotionValue(key: string, value: MotionValue) {
        if (this.valueSubscriptions.has(key)) {
            this.valueSubscriptions.get(key)!()
        }

        if (
            value.accelerate &&
            acceleratedValues.has(key) &&
            this.current instanceof HTMLElement
        ) {
            const { factory, keyframes, times, ease, duration } =
                value.accelerate

            const animation = new NativeAnimation({
                element: this.current,
                name: key,
                keyframes,
                times,
                ease,
                duration: secondsToMilliseconds(duration),
            })

            const cleanup = factory(animation)

            this.valueSubscriptions.set(key, () => {
                cleanup()
                animation.cancel()
            })
            return
        }

        const valueIsTransform = transformProps.has(key)

        if (valueIsTransform && this.onBindTransform) {
            this.onBindTransform()
        }

        const removeOnChange = value.on(
            "change",
            (latestValue: AnyResolvedKeyframe) => {
                this.latestValues[key] = latestValue

                this.props.onUpdate && frame.preRender(this.notifyUpdate)

                if (valueIsTransform && this.projection) {
                    this.projection.isTransformDirty = true
                }

                this.scheduleRender()
            }
        )

        let removeSyncCheck: VoidFunction | void
        if (
            typeof window !== "undefined" &&
            (window as any).MotionCheckAppearSync
        ) {
            removeSyncCheck = (window as any).MotionCheckAppearSync(
                this,
                key,
                value
            )
        }

        this.valueSubscriptions.set(key, () => {
            removeOnChange()
            if (removeSyncCheck) removeSyncCheck()
            // Defer to MotionValue.on("change") auto-stop so React 19 remounts
            // can resubscribe before the animation is cancelled (#3315).
        })
    }

    sortNodePosition(other: VisualElement<Instance>) {
        /**
         * If these nodes aren't even of the same type we can't compare their depth.
         */
        if (
            !this.current ||
            !this.sortInstanceNodePosition ||
            this.type !== other.type
        ) {
            return 0
        }

        return this.sortInstanceNodePosition(
            this.current as Instance,
            other.current as Instance
        )
    }

    updateFeatures() {
        let key: keyof typeof featureDefinitions = "animation"

        for (key in featureDefinitions) {
            const featureDefinition = featureDefinitions[key]

            if (!featureDefinition) continue

            const { isEnabled, Feature: FeatureConstructor } = featureDefinition

            /**
             * If this feature is enabled but not active, make a new instance.
             */
            if (
                !this.features[key] &&
                FeatureConstructor &&
                isEnabled(this.props)
            ) {
                this.features[key] = new FeatureConstructor(this) as any
            }

            /**
             * If we have a feature, mount or update it.
             */
            if (this.features[key]) {
                const feature = this.features[key]!
                if (feature.isMounted) {
                    feature.update()
                } else {
                    feature.mount()
                    feature.isMounted = true
                }
            }
        }
    }

    notifyUpdate = () => this.notify("Update", this.latestValues)

    triggerBuild() {
        this.build(this.renderState, this.latestValues, this.props)
    }

    render = () => {
        if (!this.current) return
        this.triggerBuild()
        this.renderInstance(
            this.current,
            this.renderState,
            (this.props as any).style,
            this.projection
        )
    }

    private renderScheduledAt = 0.0
    scheduleRender = () => {
        const now = time.now()
        if (this.renderScheduledAt < now) {
            this.renderScheduledAt = now
            frame.render(this.render, false, true)
        }
    }

    /**
     * Measure the current viewport box with or without transforms.
     * Only measures axis-aligned boxes, rotate and skew must be manually
     * removed with a re-render to work.
     */
    measureViewportBox() {
        return this.current
            ? this.measureInstanceViewportBox(this.current, this.props)
            : createBox()
    }

    getStaticValue(key: string) {
        return this.latestValues[key]
    }

    setStaticValue(key: string, value: AnyResolvedKeyframe) {
        this.latestValues[key] = value
    }

    /**
     * Update the provided props. Ensure any newly-added motion values are
     * added to our map, old ones removed, and listeners updated.
     */
    update(
        props: MotionNodeOptions,
        presenceContext: PresenceContextProps | null
    ) {
        if (props.transformTemplate || this.props.transformTemplate) {
            this.scheduleRender()
        }

        this.prevProps = this.props
        this.props = props

        this.prevPresenceContext = this.presenceContext
        this.presenceContext = presenceContext

        /**
         * Update prop event handlers ie onAnimationStart, onAnimationComplete
         */
        for (let i = 0; i < propEventHandlers.length; i++) {
            const key = propEventHandlers[i]
            if (this.propEventSubscriptions[key]) {
                this.propEventSubscriptions[key]()
                delete this.propEventSubscriptions[key]
            }

            const listenerName = ("on" + key) as keyof typeof props
            const listener = props[listenerName]
            if (listener) {
                this.propEventSubscriptions[key] = this.on(key as any, listener)
            }
        }

        this.prevMotionValues = updateMotionValuesFromProps(
            this,
            this.scrapeMotionValuesFromProps(props, this.prevProps || {}, this),
            this.prevMotionValues
        )

        if (this.handleChildMotionValue) {
            this.handleChildMotionValue()
        }
    }

    getProps() {
        return this.props
    }

    /**
     * Returns the variant definition with a given name.
     */
    getVariant(name: string) {
        return this.props.variants ? this.props.variants[name] : undefined
    }

    /**
     * Returns the defined default transition on this component.
     */
    getDefaultTransition() {
        return this.props.transition
    }

    getTransformPagePoint() {
        return (this.props as any).transformPagePoint
    }

    getClosestVariantNode(): VisualElement | undefined {
        return this.isVariantNode
            ? this
            : this.parent
            ? this.parent.getClosestVariantNode()
            : undefined
    }

    /**
     * Add a child visual element to our set of children.
     */
    addVariantChild(child: VisualElement) {
        const closestVariantNode = this.getClosestVariantNode()
        if (closestVariantNode) {
            closestVariantNode.variantChildren &&
                closestVariantNode.variantChildren.add(child)
            return () => closestVariantNode.variantChildren!.delete(child)
        }
    }

    /**
     * Add a motion value and bind it to this visual element.
     */
    addValue(key: string, value: MotionValue) {
        // Remove existing value if it exists
        const existingValue = this.values.get(key)

        if (value !== existingValue) {
            if (existingValue) this.removeValue(key)
            this.bindToMotionValue(key, value)
            this.values.set(key, value)
            this.latestValues[key] = value.get()
        }
    }

    /**
     * Remove a motion value and unbind any active subscriptions.
     */
    removeValue(key: string) {
        this.values.delete(key)
        const unsubscribe = this.valueSubscriptions.get(key)
        if (unsubscribe) {
            unsubscribe()
            this.valueSubscriptions.delete(key)
        }
        delete this.latestValues[key]
        this.removeValueFromRenderState(key, this.renderState)
    }

    /**
     * Check whether we have a motion value for this key
     */
    hasValue(key: string) {
        return this.values.has(key)
    }

    /**
     * Get a motion value for this key. If called with a default
     * value, we'll create one if none exists.
     */
    getValue(key: string): MotionValue | undefined
    getValue(key: string, defaultValue: AnyResolvedKeyframe | null): MotionValue
    getValue(
        key: string,
        defaultValue?: AnyResolvedKeyframe | null
    ): MotionValue | undefined {
        if (this.props.values && this.props.values[key]) {
            return this.props.values[key]
        }

        let value = this.values.get(key)

        if (value === undefined && defaultValue !== undefined) {
            value = motionValue(
                defaultValue === null ? undefined : defaultValue,
                { owner: this }
            )
            this.addValue(key, value)
        }

        return value
    }

    /**
     * If we're trying to animate to a previously unencountered value,
     * we need to check for it in our state and as a last resort read it
     * directly from the instance (which might have performance implications).
     */
    readValue(key: string, target?: AnyResolvedKeyframe | null) {
        let value =
            this.latestValues[key] !== undefined || !this.current
                ? this.latestValues[key]
                : this.getBaseTargetFromProps(this.props, key) ??
                  this.readValueFromInstance(this.current, key, this.options)

        if (value !== undefined && value !== null) {
            if (
                typeof value === "string" &&
                (isNumericalString(value) || isZeroValueString(value))
            ) {
                // If this is a number read as a string, ie "0" or "200", convert it to a number
                value = parseFloat(value)
            } else if (!findValueType(value) && complex.test(target)) {
                value = getAnimatableNone(key, target as string)
            }

            this.setBaseTarget(key, isMotionValue(value) ? value.get() : value)
        }

        return isMotionValue(value) ? value.get() : value
    }

    /**
     * Set the base target to later animate back to. This is currently
     * only hydrated on creation and when we first read a value.
     */
    setBaseTarget(key: string, value: AnyResolvedKeyframe) {
        this.baseTarget[key] = value
    }

    /**
     * Find the base target for a value thats been removed from all animation
     * props.
     */
    getBaseTarget(key: string): ResolvedValues[string] | undefined | null {
        const { initial } = this.props

        let valueFromInitial: ResolvedValues[string] | undefined | null

        if (typeof initial === "string" || typeof initial === "object") {
            const variant = resolveVariantFromProps(
                this.props,
                initial as any,
                this.presenceContext?.custom
            )
            if (variant) {
                valueFromInitial = variant[
                    key as keyof typeof variant
                ] as string
            }
        }

        /**
         * If this value still exists in the current initial variant, read that.
         */
        if (initial && valueFromInitial !== undefined) {
            return valueFromInitial
        }

        /**
         * Alternatively, if this VisualElement config has defined a getBaseTarget
         * so we can read the value from an alternative source, try that.
         */
        const target = this.getBaseTargetFromProps(this.props, key)
        if (target !== undefined && !isMotionValue(target)) return target

        /**
         * If the value was initially defined on initial, but it doesn't any more,
         * return undefined. Otherwise return the value as initially read from the DOM.
         */
        return this.initialValues[key] !== undefined &&
            valueFromInitial === undefined
            ? undefined
            : this.baseTarget[key]
    }

    on<EventName extends keyof VisualElementEventCallbacks>(
        eventName: EventName,
        callback: VisualElementEventCallbacks[EventName]
    ) {
        if (!this.events[eventName]) {
            this.events[eventName] = new SubscriptionManager()
        }

        return this.events[eventName].add(callback)
    }

    notify<EventName extends keyof VisualElementEventCallbacks>(
        eventName: EventName,
        ...args: any
    ) {
        if (this.events[eventName]) {
            this.events[eventName].notify(...args)
        }
    }

    scheduleRenderMicrotask() {
        microtask.render(this.render)
    }
}

