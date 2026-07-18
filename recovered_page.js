'use client';

import { useState, useEffect, useMemo } from 'react';
import FolderTree from '@/components/FolderTree';
import { 
  FileText, 
  Layers, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  RefreshCw, 
  Database,
  Link as LinkIcon,
  Zap,
  Briefcase,
  AlertTriangle,
  FolderOpen,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image,
  Film,
  Table,
  Presentation,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  MapPin,
  LayoutGrid,
  Settings
} from 'lucide-react';

export default function Home() {
  // Tráº¡ng thÃ¡i dá»¯ liá»‡u
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // Tráº¡ng thÃ¡i giao diá»‡n
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [dmsSubTab, setDmsSubTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [docSearch, setDocSearch] = useState('');
  const [docCategory, setDocCategory] = useState('all');
  const [driveSource, setDriveSource] = useState('loading');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [activeMainTab, setActiveMainTab] = useState('documents'); // 'documents', 'projects', 'gis'
  const [projectSubTab, setProjectSubTab] = useState('progress'); // 'progress', 'folders'
  
  // Tráº¡ng thÃ¡i dá»± Ã¡n
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  
  // Tráº¡ng thÃ¡i cáº­p nháº­t dá»¯ liá»‡u
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // PhÃ¢n trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load dá»¯ liá»‡u ban Ä‘áº§u
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, docsRes, projRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/documents'),
        fetch('/api/projects')
      ]);

      const tasksData = await tasksRes.json();
      const docsData = await docsRes.json();
      const projData = await projRes.json();

      setTasks(tasksData);
      
      if (projData.projects) {
        setProjects(projData.projects);
        if (projData.projects.length > 0 && !currentProjectId) {
          setCurrentProjectId(projData.projects[0].id);
        }
      }
      
      // Chá»n máº·c Ä‘á»‹nh task Ä‘áº§u tiÃªn náº¿u cÃ³ dá»¯ liá»‡u
      if (tasksData.length > 0 && !selectedTaskId) {
        setSelectedTaskId(tasksData[0].id);
      }
      
      if (docsData.documents) {
        setDocuments(docsData.documents);
        setDriveSource(docsData.source);
      } else {
        setDriveSource('error');
      }
    } catch (error) {
      console.error("Lá»—i khi fetch dá»¯ liá»‡u:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Káº¿t ná»‘i Realtime SSE (Äá»“ng bá»™ cÃ¡c cáº­p nháº­t tiáº¿n Ä‘á»™ cÃ´ng viá»‡c giá»¯a cÃ¡c trÃ¬nh duyá»‡t)
    const eventSource = new EventSource('/api/realtime');

    eventSource.onopen = () => {
      setRealtimeStatus('connected');
    };

    eventSource.onerror = () => {
      setRealtimeStatus('disconnected');
    };

    eventSource.addEventListener('update', (event) => {
      try {
        const freshData = JSON.parse(event.data);
        if (freshData.tasks) setTasks(freshData.tasks);
      } catch (e) {
        console.error("Lá»—i phÃ¢n tÃ­ch gÃ³i tin realtime:", e);
      }
    });

    eventSource.addEventListener('ping', () => {
      setRealtimeStatus('connected');
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Cáº­p nháº­t tiáº¿n Ä‘á»™ cÃ´ng viá»‡c (Task)
  const handleUpdateTaskProgress = async (taskId, progressVal) => {
    setUpdatingTaskId(taskId);
    let status = 'pending';
    if (progressVal === 100) status = 'completed';
    else if (progressVal > 0) status = 'processing';
    
    const taskToUpdate = tasks.find(t => t.id === taskId);
    const updated = {
      ...taskToUpdate,
      progress: progressVal,
      status
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const result = await res.json();
      if (result.success) {
        // Cáº­p nháº­t local state nhanh trÆ°á»›c khi SSE phÃ¡t sÃ³ng
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: progressVal, status } : t));
      }
    } catch (error) {
      console.error("Lá»—i cáº­p nháº­t tiáº¿n Ä‘á»™ cÃ´ng viá»‡c:", error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Äá»“ng bá»™ hÃ³a Google Drive sang Supabase
  const handleSyncDrive = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch('/api/documents/sync', { method: 'POST' });
      const result = await res.json();
      setSyncResult(result);
      // Táº£i láº¡i dá»¯ liá»‡u má»›i sau khi Ä‘á»“ng bá»™
      await fetchData();
    } catch (err) {
      console.error("Lá»—i Ä‘á»“ng bá»™:", err);
      setSyncResult({ success: false, error: "KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n API Ä‘á»“ng bá»™." });
    } finally {
      setSyncing(false);
    }
  };

  // LiÃªn káº¿t má»™t vÄƒn báº£n vá»›i cÃ´ng viá»‡c Ä‘ang chá»n
  const handleLinkDocumentToTask = async (docPath, docName) => {
    if (!selectedTaskId) {
      alert("Vui lÃ²ng chá»n má»™t cÃ´ng viá»‡c á»Ÿ cá»™t bÃªn trÃ¡i trÆ°á»›c khi liÃªn káº¿t!");
      return;
    }
    
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    
    try {
      const res = await fetch('/api/tasks/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTaskId,
          documentPath: docPath
        })
      });
      
      const result = await res.json();
      if (result.success) {
        // Cáº­p nháº­t local state cho máº£ng documents cá»§a task Ä‘Æ°á»£c chá»n
        setTasks(prev => prev.map(t => {
          if (t.id === selectedTaskId) {
            const currentDocs = t.documents || [];
            if (!currentDocs.includes(docName)) {
              return { ...t, documents: [...currentDocs, docName] };
            }
          }
          return t;
        }));
      } else {
        alert("Lá»—i liÃªn káº¿t: " + result.error);
      }
    } catch (err) {
      console.error("Lá»—i khi káº¿t ná»‘i API liÃªn káº¿t:", err);
      alert("KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n API táº¡o liÃªn káº¿t.");
    }
  };

  // Má»Ÿ tá»‡p tin trá»±c tiáº¿p trÃªn mÃ¡y tÃ­nh ngÆ°á»i dÃ¹ng báº±ng á»©ng dá»¥ng máº·c Ä‘á»‹nh
  const handleOpenDocument = async (filePath) => {
    try {
      const res = await fetch('/api/documents/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const result = await res.json();
      if (!result.success) {
        alert(result.error);
      }
    } catch (err) {
      console.error("Lá»—i khi má»Ÿ file:", err);
      alert("KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n API má»Ÿ file.");
    }
  };

  // TÃ­nh toÃ¡n nhanh sá»‘ liá»‡u thá»‘ng kÃª cÃ´ng viá»‡c
  const stats = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { total: 0, completed: 0, processing: 0, pending: 0, percentCompleted: 0 };
    
    const completed = tasks.filter(t => t.status === 'completed').length;
    const processing = tasks.filter(t => t.status === 'processing').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const percentCompleted = Math.round((completed / total) * 100);

    return { total, completed, processing, pending, percentCompleted };
  }, [tasks]);

  // Bá»™ lá»c vÄƒn báº£n vÃ  liÃªn káº¿t
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  
  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter(doc => {
      const matchSearch = doc.name.toLowerCase().includes(docSearch.toLowerCase()) || 
                          (doc.summary && doc.summary.toLowerCase().includes(docSearch.toLowerCase()));
      const matchCategory = docCategory === 'all' || doc.category === docCategory;
      
      if (dmsSubTab === 'linked') {
        const isLinked = selectedTask && selectedTask.documents && selectedTask.documents.includes(doc.name);
        return matchSearch && matchCategory && isLinked;
      }
      
      return matchSearch && matchCategory;
    });

    // Sáº¯p xáº¿p theo ngÃ y phÃ¡t hÃ nh gáº§n nháº¥t
    filtered.sort((a, b) => {
      const dateA = a.documentDate ? new Date(a.documentDate.split('/').reverse().join('-')) : new Date(0);
      const dateB = b.documentDate ? new Date(b.documentDate.split('/').reverse().join('-')) : new Date(0);
      return dateB - dateA;
    });

    return filtered;
  }, [documents, docSearch, docCategory, dmsSubTab, selectedTaskId, tasks]);

  // Reset trang khi thay Ä‘á»•i bá»™ lá»c hoáº·c sá»‘ má»¥c/trang
  useEffect(() => {
    setCurrentPage(1);
  }, [docSearch, docCategory, dmsSubTab, itemsPerPage]);

  // Xá»­ lÃ½ thÃªm dá»± Ã¡n má»›i
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectId || !newProjectName) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newProjectId, name: newProjectName })
      });
      const result = await res.json();
      if (result.success) {
        setProjects([...projects, result.project]);
        setCurrentProjectId(result.project.id);
        setIsProjectModalOpen(false);
        setNewProjectId('');
        setNewProjectName('');
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Lá»—i khi thÃªm dá»± Ã¡n má»›i");
    }
  };

  // TÃ­nh toÃ¡n thá»‘ng kÃª chung
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / itemsPerPage));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  // HÃ m tráº£ vá» icon vÃ  mÃ u sáº¯c theo loáº¡i file
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return { icon: FileText, color: 'text-red-400', bg: 'border-red-500/30', label: 'PDF' };
      case 'doc': case 'docx':
        return { icon: FileText, color: 'text-blue-400', bg: 'border-blue-500/30', label: 'DOC' };
      case 'xls': case 'xlsx': case 'csv':
        return { icon: FileSpreadsheet, color: 'text-green-400', bg: 'border-green-500/30', label: 'XLS' };
      case 'ppt': case 'pptx':
        return { icon: Presentation, color: 'text-orange-400', bg: 'border-orange-500/30', label: 'PPT' };
      case 'dwg': case 'dxf': case 'dgn':
        return { icon: Layers, color: 'text-amber-400', bg: 'border-amber-500/30', label: 'CAD' };
      case 'png': case 'jpg': case 'jpeg': case 'gif': case 'bmp': case 'tiff': case 'tif':
        return { icon: FileImage, color: 'text-purple-400', bg: 'border-purple-500/30', label: 'IMG' };
      case 'mp4': case 'avi': case 'mov': case 'mkv':
        return { icon: Film, color: 'text-pink-400', bg: 'border-pink-500/30', label: 'VID' };
      case 'zip': case 'rar': case '7z': case 'tar': case 'gz':
        return { icon: FileArchive, color: 'text-yellow-400', bg: 'border-yellow-500/30', label: 'ZIP' };
      case 'txt': case 'md': case 'rtf':
        return { icon: FileText, color: 'text-slate-400', bg: 'border-slate-500/30', label: 'TXT' };
      case 'html': case 'htm':
        return { icon: FileText, color: 'text-cyan-400', bg: 'border-cyan-500/30', label: 'HTML' };
      default:
        return { icon: File, color: 'text-slate-400', bg: 'border-slate-600/30', label: ext.toUpperCase() || 'FILE' };
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans text-sm">
      {/* Header - thu gá»n */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap justify-between items-center gap-2 shrink-0 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-emerald-600 to-cyan-500 rounded-xl shadow-md shadow-emerald-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              CDE-HTKT v1.2
            </h1>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
              Quáº£n lÃ½ VÄƒn báº£n &middot; Tiáº¿n Ä‘á»™ &middot; GIS
            </p>
          </div>
        </div>

        {/* Chá»‰ sá»‘ nhanh & Chá»n dá»± Ã¡n */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-950/60 px-4 py-1.5 rounded-xl border border-slate-800/80 text-[10px]">
          <div className="flex items-center gap-2 mr-2 border-r border-slate-800 pr-4">
            <select 
              value={currentProjectId} 
              onChange={(e) => setCurrentProjectId(e.target.value)}
              className="bg-transparent border-none text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
            </select>
            <button 
              onClick={() => setIsProjectModalOpen(true)}
              className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="CÃ i Ä‘áº·t dá»± Ã¡n"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
          <div className="text-center">
            <span className="text-slate-400 block">Tiáº¿n Ä‘á»™</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" style={{ width: `${stats.percentCompleted}%` }}></div>
              </div>
              <span className="font-bold text-emerald-400">{stats.percentCompleted}%</span>
            </div>
          </div>
          <div className="w-px h-5 bg-slate-800"></div>
          <div className="text-center">
            <span className="text-slate-400 block">Xong</span>
            <span className="font-bold text-emerald-400">{stats.completed}/{stats.total}</span>
          </div>
          <div className="w-px h-5 bg-slate-800"></div>
          <div className="text-center">
            <span className="text-slate-400 block">Äang lÃ m</span>
            <span className="font-bold text-amber-400">{stats.processing}</span>
          </div>
        </div>

        {/* Tráº¡ng thÃ¡i */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800 text-[9px] font-semibold text-slate-300">
            <Database className="w-3 h-3 text-cyan-400" />
            {driveSource === 'live_supabase_db' ? (
              <span className="text-emerald-400">Supabase</span>
            ) : driveSource === 'local_db_file' ? (
              <span className="text-cyan-400">Local</span>
            ) : (
              <span className="text-slate-500 animate-pulse">...</span>
            )}
          </div>
          <div className={`flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800 text-[9px] font-semibold ${realtimeStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
            <Zap className={`w-3 h-3 ${realtimeStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span>{realtimeStatus === 'connected' ? 'LIVE' : 'SYNC'}</span>
          </div>
        </div>
      </header>

      {/* === TAB NAVIGATION === */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-3 sm:px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'documents', label: 'Quáº£n lÃ½ VÄƒn báº£n', icon: FolderOpen, count: filteredDocuments.length },
            { id: 'projects', label: 'Quáº£n lÃ½ Dá»± Ã¡n', icon: Briefcase, count: tasks.length },
            { id: 'gis', label: 'Báº£n Ä‘á»“ GIS', icon: MapPin, count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeMainTab === tab.id
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeMainTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* === TAB CONTENT === */}
      <main className="flex-1 min-h-0 overflow-hidden">

        {/* â”€â”€â”€â”€ TAB: QUáº¢N LÃ VÄ‚N Báº¢N â”€â”€â”€â”€ */}
        {activeMainTab === 'documents' && (
          <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4">
            {/* Thanh tÃ¬m kiáº¿m & bá»™ lá»c */}
            <div className="flex flex-wrap gap-2 shrink-0 mb-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="TÃ¬m vÄƒn báº£n theo tÃªn hoáº·c trÃ­ch yáº¿u..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition-all"
                />
              </div>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="pl-3 pr-8 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500/80 appearance-none cursor-pointer"
              >
                <option value="all">Táº¥t cáº£ danh má»¥c</option>
                <option value="Quy hoáº¡ch">Quy hoáº¡ch</option>
                <option value="Sá»Ÿ ngÃ nh">Sá»Ÿ ngÃ nh</option>
                <option value="Äáº¥t Ä‘ai">Äáº¥t Ä‘ai</option>
                <option value="RÃ  phÃ¡ bom mÃ¬n">RÃ  phÃ¡ bom mÃ¬n</option>
                <option value="PhÃº Má»¹ HÆ°ng">PhÃº Má»¹ HÆ°ng</option>
                <option value="Háº¡ táº§ng ká»¹ thuáº­t">Háº¡ táº§ng ká»¹ thuáº­t</option>
                <option value="Bá»“i thÆ°á»ng">Bá»“i thÆ°á»ng</option>
                <option value="KhÃ¡c">KhÃ¡c</option>
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => setDmsSubTab('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${dmsSubTab === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Táº¥t cáº£
                </button>
                <button
                  onClick={() => setDmsSubTab('linked')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${dmsSubTab === 'linked' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  ÄÃ£ liÃªn káº¿t
                </button>
              </div>
            </div>

            {/* Äá»“ng bá»™ káº¿t quáº£ */}
            {syncResult && (
              <div className={`p-3 rounded-xl text-[10px] border flex flex-col gap-1 shrink-0 mb-3 ${syncResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <div className="font-bold flex justify-between items-center">
                  <span>{syncResult.success ? 'âœ“ Äá»“ng bá»™ hoÃ n táº¥t' : 'âœ— Äá»“ng bá»™ tháº¥t báº¡i'}</span>
                  <button onClick={() => setSyncResult(null)} className="text-slate-400 hover:text-slate-200 text-xs">âœ•</button>
                </div>
                <p className="mt-0.5 text-slate-300">{syncResult.message || syncResult.error}</p>
                {syncResult.success && (
                  <div className="flex gap-3 text-slate-400 mt-1 pt-1 border-t border-slate-800/40">
                    <span>ÄÃ£ quÃ©t: <strong className="text-slate-200">{syncResult.scannedCount}</strong> tá»‡p</span>
                    <span>Supabase: <strong className={syncResult.syncedToSupabase ? "text-emerald-400" : "text-amber-400"}>
                      {syncResult.syncedToSupabase ? `ÄÃ£ lÆ°u ${syncResult.syncedCount}` : "Offline"}
                    </strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Thanh phÃ¢n trang */}
            <div className="text-[10px] text-slate-400 flex flex-wrap justify-between items-center shrink-0 mb-2 gap-2">
              <span>TÃ¬m tháº¥y <strong className="text-slate-200">{filteredDocuments.length}</strong> vÄƒn báº£n &middot; Trang <strong className="text-slate-200">{currentPage}</strong>/{totalPages}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500/80"
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-300 font-bold px-1 min-w-[20px] text-center">{currentPage}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={handleSyncDrive} disabled={syncing}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-40 text-[10px]">
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
                  {syncing ? 'Äang Ä‘á»“ng bá»™...' : 'Äá»“ng bá»™ á»• H:'}
                </button>
              </div>
            </div>

            {/* Danh sÃ¡ch vÄƒn báº£n - CUá»˜N á»ž ÄÃ‚Y */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                  <span>Äang táº£i danh sÃ¡ch vÄƒn báº£n...</span>
                </div>
              ) : paginatedDocs.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-slate-600" />
                  <span>KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u phÃ¹ há»£p</span>
                </div>
              ) : (
                paginatedDocs.map((doc) => {
                  const isLinkedToSelected = selectedTask && selectedTask.documents && selectedTask.documents.includes(doc.name);
                  const ext = doc.name.split('.').pop().toLowerCase();
                  const isViewable = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'html'].includes(ext);
                  const fileInfo = getFileIcon(doc.name);
                  const IconComp = fileInfo.icon;
                  
                  return (
                    <div key={doc.id}
                      className="bg-slate-900/40 rounded-xl border border-slate-800/80 p-3 hover:border-slate-700/60 hover:bg-slate-900/50 transition-all duration-200 group flex items-start gap-3">
                      <div onClick={() => handleOpenDocument(doc.path)}
                        className={`p-2 bg-slate-950/80 border ${fileInfo.bg} rounded-lg group-hover:border-emerald-500/30 transition-colors shrink-0 cursor-pointer flex flex-col items-center min-w-[40px]`}
                        title={`Má»Ÿ tá»‡p (${fileInfo.label})`}>
                        <IconComp className={`w-5 h-5 ${fileInfo.color}`} />
                        <span className={`text-[7px] font-bold mt-0.5 ${fileInfo.color}`}>{fileInfo.label}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 onClick={() => handleOpenDocument(doc.path)}
                          className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-400 transition-colors cursor-pointer hover:underline"
                          title={doc.name}>
                          {doc.name}
                        </h4>
                        {doc.summary && doc.summary !== doc.name && (
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic" title={doc.summary}>
                            TrÃ­ch yáº¿u: {doc.summary}
                          </p>
                        )}
                        <div className="text-[9px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                          <span className="font-semibold text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">{doc.category}</span>
                          {doc.documentDate && <span className="shrink-0">NgÃ y: {doc.documentDate}</span>}
                          {doc.issuingAgency && doc.issuingAgency !== 'Äang cáº­p nháº­t' && <span className="shrink-0">CQ: {doc.issuingAgency}</span>}
                          <span className="shrink-0">{doc.size}</span>
                        </div>
                      </div>
                      <div className="shrink-0 self-center flex items-center gap-1.5">
                        {isViewable && (
                          <a href={`/api/documents/view?path=${encodeURIComponent(doc.path)}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-400 hover:text-emerald-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                            title="Xem nhanh">
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => handleOpenDocument(doc.path)}
                          className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-400 hover:text-emerald-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                          title="Má»Ÿ báº±ng app">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {isLinkedToSelected ? (
                          <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            âœ“ LiÃªn káº¿t
                          </span>
                        ) : (
                          <button onClick={() => handleLinkDocumentToTask(doc.path, doc.name)}
                            className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-400 hover:text-emerald-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] font-semibold"
                            title={`LiÃªn káº¿t: ${selectedTask?.title}`}>
                            <LinkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* â”€â”€â”€â”€ TAB: QUáº¢N LÃ Dá»° ÃN â”€â”€â”€â”€ */}
        {activeMainTab === 'projects' && (
          <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => setProjectSubTab('progress')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'progress' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Tiáº¿n Ä‘á»™ Háº¡ng má»¥c
                  </div>
                </button>
                <button 
                  onClick={() => setProjectSubTab('folders')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'folders' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" /> ThÆ° má»¥c Drive
                  </div>
                </button>
              </div>
              {projectSubTab === 'progress' && <span className="text-[10px] text-slate-400 hidden sm:inline">Chá»n viá»‡c Ä‘á»ƒ liÃªn káº¿t há»“ sÆ¡ (chuyá»ƒn sang tab VÄƒn báº£n)</span>}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {projectSubTab === 'folders' && (
                <div className="h-full w-full">
                  <FolderTree projectId={currentProjectId} />
                </div>
              )}
              
              {projectSubTab === 'progress' && (
                <>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                      <span>Äang táº£i...</span>
                    </div>
                  ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tasks.map((task) => {
                  const isSelected = task.id === selectedTaskId;
                  return (
                    <div key={task.id}
                      onClick={() => { setSelectedTaskId(task.id); }}
                      className={`bg-slate-900/60 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                        isSelected ? 'border-emerald-500 shadow-md shadow-emerald-500/10 bg-slate-900/40' : 'border-slate-800/80 hover:border-slate-700/60'
                      }`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-2 ${
                            task.category === 'RÃ  phÃ¡ bom mÃ¬n' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : task.category === 'Háº¡ táº§ng ká»¹ thuáº­t' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>{task.category}</span>
                          <h4 className="text-xs font-bold text-slate-100 truncate" title={task.title}>{task.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>ÄÆ¡n vá»‹: {task.assignedTo}</span>
                          </p>
                          {task.documents && task.documents.length > 0 && (
                            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                              <FileText className="w-3 h-3" />
                              <span>{task.documents.length} vÄƒn báº£n Ä‘Ã£ liÃªn káº¿t</span>
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold flex items-center gap-1.5 shrink-0 ${
                          task.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {task.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
                          {task.status === 'completed' ? 'HoÃ n thÃ nh' : 'Äang xá»­ lÃ½'}
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span>Tiáº¿n Ä‘á»™:</span>
                          <span className="font-bold text-slate-200">{task.progress}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5"
                          value={task.progress}
                          disabled={updatingTaskId === task.id}
                          onChange={(e) => handleUpdateTaskProgress(task.id, parseInt(e.target.value))}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
            )}
            </div>
          </div>
        )}

        {/* â”€â”€â”€â”€ TAB: Báº¢N Äá»’ GIS â”€â”€â”€â”€ */}
        {activeMainTab === 'gis' && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
            <MapPin className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-300 mb-2">Báº£n Ä‘á»“ GIS</h3>
            <p className="text-xs text-slate-500 text-center max-w-md">
              TÃ­nh nÄƒng báº£n Ä‘á»“ GIS Ä‘ang Ä‘Æ°á»£c phÃ¡t triá»ƒn. Sáº½ tÃ­ch há»£p hiá»ƒn thá»‹ vá»‹ trÃ­ thá»­a Ä‘áº¥t, ranh giá»›i quy hoáº¡ch vÃ  liÃªn káº¿t trá»±c tiáº¿p vá»›i há»“ sÆ¡ vÄƒn báº£n.
            </p>
          </div>
        )}

      </main>
      
      {/* Modal ThÃªm Dá»± Ã¡n */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                CÃ i Ä‘áº·t Dá»± Ã¡n má»›i
              </h3>
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                âœ•
              </button>
            </div>
            <form onSubmit={handleAddProject} className="p-5">
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">TÃªn Dá»± Ã¡n</label>
                <input 
                  type="text" 
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="VD: Dá»± Ã¡n Metro Sá»‘ 1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 mb-1">Google Drive Folder ID</label>
                <input 
                  type="text" 
                  required
                  value={newProjectId}
                  onChange={e => setNewProjectId(e.target.value)}
                  placeholder="VD: 1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Há»§y
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-500/20"
                >
                  ThÃªm Dá»± Ã¡n
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [['path', { d: 'm15 18-6-6 6-6', key: '1wnfg3' }]];

/**
 * @component @name ChevronLeft
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTUgMTgtNi02IDYtNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevron-left
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const ChevronLeft = createLucideIcon('chevron-left', __iconNode);

export default ChevronLeft;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M2 3h20', key: '91anmk' }],
  ['path', { d: 'M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3', key: '2k9sn8' }],
  ['path', { d: 'm7 21 5-5 5 5', key: 'bip4we' }],
];

/**
 * @component @name Presentation
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMiAzaDIwIiAvPgogIDxwYXRoIGQ9Ik0yMSAzdjExYTIgMiAwIDAgMS0yIDJINWEyIDIgMCAwIDEtMi0yVjMiIC8+CiAgPHBhdGggZD0ibTcgMjEgNS01IDUgNSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/presentation
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Presentation = createLucideIcon('presentation', __iconNode);

export default Presentation;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
  ['path', { d: 'M12 6v6l4 2', key: 'mmk7yg' }],
];

/**
 * @component @name Clock
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJNMTIgNnY2bDQgMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/clock
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Clock = createLucideIcon('clock', __iconNode);

export default Clock;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', key: 'afitv7' }],
  ['path', { d: 'M7 3v18', key: 'bbkbws' }],
  ['path', { d: 'M3 7.5h4', key: 'zfgn84' }],
  ['path', { d: 'M3 12h18', key: '1i2n21' }],
  ['path', { d: 'M3 16.5h4', key: '1230mu' }],
  ['path', { d: 'M17 3v18', key: 'in4fa5' }],
  ['path', { d: 'M17 7.5h4', key: 'myr1c1' }],
  ['path', { d: 'M17 16.5h4', key: 'go4c1d' }],
];

/**
 * @component @name Film
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiAvPgogIDxwYXRoIGQ9Ik03IDN2MTgiIC8+CiAgPHBhdGggZD0iTTMgNy41aDQiIC8+CiAgPHBhdGggZD0iTTMgMTJoMTgiIC8+CiAgPHBhdGggZD0iTTMgMTYuNWg0IiAvPgogIDxwYXRoIGQ9Ik0xNyAzdjE4IiAvPgogIDxwYXRoIGQ9Ik0xNyA3LjVoNCIgLz4KICA8cGF0aCBkPSJNMTcgMTYuNWg0IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/film
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Film = createLucideIcon('film', __iconNode);

export default Film;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', key: 'jecpp' }],
  ['rect', { width: '20', height: '14', x: '2', y: '6', rx: '2', key: 'i6l2r4' }],
];

/**
 * @component @name Briefcase
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTYgMjBWNGEyIDIgMCAwIDAtMi0yaC00YTIgMiAwIDAgMC0yIDJ2MTYiIC8+CiAgPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiB4PSIyIiB5PSI2IiByeD0iMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/briefcase
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Briefcase = createLucideIcon('briefcase', __iconNode);

export default Briefcase;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', key: '975kel' }],
  ['circle', { cx: '12', cy: '7', r: '4', key: '17ys0d' }],
];

/**
 * @component @name User
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/user
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const User = createLucideIcon('user', __iconNode);

export default User;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', key: '1cjeqo' }],
  ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', key: '19qd67' }],
];

/**
 * @component @name Link
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAgMTNhNSA1IDAgMCAwIDcuNTQuNTRsMy0zYTUgNSAwIDAgMC03LjA3LTcuMDdsLTEuNzIgMS43MSIgLz4KICA8cGF0aCBkPSJNMTQgMTFhNSA1IDAgMCAwLTcuNTQtLjU0bC0zIDNhNSA1IDAgMCAwIDcuMDcgNy4wN2wxLjcxLTEuNzEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/link
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Link = createLucideIcon('link', __iconNode);

export default Link;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  ['ellipse', { cx: '12', cy: '5', rx: '9', ry: '3', key: 'msslwz' }],
  ['path', { d: 'M3 5V19A9 3 0 0 0 21 19V5', key: '1wlel7' }],
  ['path', { d: 'M3 12A9 3 0 0 0 21 12', key: 'mv7ke4' }],
];

/**
 * @component @name Database
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8ZWxsaXBzZSBjeD0iMTIiIGN5PSI1IiByeD0iOSIgcnk9IjMiIC8+CiAgPHBhdGggZD0iTTMgNVYxOUE5IDMgMCAwIDAgMjEgMTlWNSIgLz4KICA8cGF0aCBkPSJNMyAxMkE5IDMgMCAwIDAgMjEgMTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/database
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Database = createLucideIcon('database', __iconNode);

export default Database;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915',
      key: '1i5ecw',
    },
  ],
  ['circle', { cx: '12', cy: '12', r: '3', key: '1v7zrd' }],
];

/**
 * @component @name Settings
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOS42NzEgNC4xMzZhMi4zNCAyLjM0IDAgMCAxIDQuNjU5IDAgMi4zNCAyLjM0IDAgMCAwIDMuMzE5IDEuOTE1IDIuMzQgMi4zNCAwIDAgMSAyLjMzIDQuMDMzIDIuMzQgMi4zNCAwIDAgMCAwIDMuODMxIDIuMzQgMi4zNCAwIDAgMS0yLjMzIDQuMDMzIDIuMzQgMi4zNCAwIDAgMC0zLjMxOSAxLjkxNSAyLjM0IDIuMzQgMCAwIDEtNC42NTkgMCAyLjM0IDIuMzQgMCAwIDAtMy4zMi0xLjkxNSAyLjM0IDIuMzQgMCAwIDEtMi4zMy00LjAzMyAyLjM0IDIuMzQgMCAwIDAgMC0zLjgzMUEyLjM0IDIuMzQgMCAwIDEgNi4zNSA2LjA1MWEyLjM0IDIuMzQgMCAwIDAgMy4zMTktMS45MTUiIC8+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/settings
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Settings = createLucideIcon('settings', __iconNode);

export default Settings;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
      key: '1nclc0',
    },
  ],
  ['circle', { cx: '12', cy: '12', r: '3', key: '1v7zrd' }],
];

/**
 * @component @name Eye
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMi4wNjIgMTIuMzQ4YTEgMSAwIDAgMSAwLS42OTYgMTAuNzUgMTAuNzUgMCAwIDEgMTkuODc2IDAgMSAxIDAgMCAxIDAgLjY5NiAxMC43NSAxMC43NSAwIDAgMS0xOS44NzYgMCIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/eye
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Eye = createLucideIcon('eye', __iconNode);

export default Eye;

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
  ['circle', { cx: '10', cy: '12', r: '2', key: '737tya' }],
  ['path', { d: 'm20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22', key: 'wt3hpn' }],
];

/**
 * @component @name FileImage
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8Y2lyY2xlIGN4PSIxMCIgY3k9IjEyIiByPSIyIiAvPgogIDxwYXRoIGQ9Im0yMCAxNy0xLjI5Ni0xLjI5NmEyLjQxIDIuNDEgMCAwIDAtMy40MDggMEw5IDIyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/file-image
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const FileImage = createLucideIcon('file-image', __iconNode);

export default FileImage;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
      key: '1r0f0z',
    },
  ],
  ['circle', { cx: '12', cy: '10', r: '3', key: 'ilqhr7' }],
];

/**
 * @component @name MapPin
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTBjMCA0Ljk5My01LjUzOSAxMC4xOTMtNy4zOTkgMTEuNzk5YTEgMSAwIDAgMS0xLjIwMiAwQzkuNTM5IDIwLjE5MyA0IDE0Ljk5MyA0IDEwYTggOCAwIDAgMSAxNiAwIiAvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/map-pin
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const MapPin = createLucideIcon('map-pin', __iconNode);

export default MapPin;

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
  ['path', { d: 'M8 13h2', key: 'yr2amv' }],
  ['path', { d: 'M14 13h2', key: 'un5t4a' }],
  ['path', { d: 'M8 17h2', key: '2yhykz' }],
  ['path', { d: 'M14 17h2', key: '10kma7' }],
];

/**
 * @component @name FileSpreadsheet
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8cGF0aCBkPSJNOCAxM2gyIiAvPgogIDxwYXRoIGQ9Ik0xNCAxM2gyIiAvPgogIDxwYXRoIGQ9Ik04IDE3aDIiIC8+CiAgPHBhdGggZD0iTTE0IDE3aDIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/file-spreadsheet
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const FileSpreadsheet = createLucideIcon('file-spreadsheet', __iconNode);

export default FileSpreadsheet;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5',
      key: '4pqfef',
    },
  ],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5', key: 'wfsgrz' }],
  ['path', { d: 'M8 12v-1', key: '1ej8lb' }],
  ['path', { d: 'M8 18v-2', key: 'qcmpov' }],
  ['path', { d: 'M8 7V6', key: '1nbb54' }],
  ['circle', { cx: '8', cy: '20', r: '2', key: 'ckkr5m' }],
];

/**
 * @component @name FileArchive
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTMuNjU5IDIySDE4YTIgMiAwIDAgMCAyLTJWOGEyLjQgMi40IDAgMCAwLS43MDYtMS43MDZsLTMuNTg4LTMuNTg4QTIuNCAyLjQgMCAwIDAgMTQgMkg2YTIgMiAwIDAgMC0yIDJ2MTEuNSIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8cGF0aCBkPSJNOCAxMnYtMSIgLz4KICA8cGF0aCBkPSJNOCAxOHYtMiIgLz4KICA8cGF0aCBkPSJNOCA3VjYiIC8+CiAgPGNpcmNsZSBjeD0iOCIgY3k9IjIwIiByPSIyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/file-archive
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const FileArchive = createLucideIcon('file-archive', __iconNode);

export default FileArchive;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
      key: 'wmoenq',
    },
  ],
  ['path', { d: 'M12 9v4', key: 'juzpu7' }],
  ['path', { d: 'M12 17h.01', key: 'p32p05' }],
];

/**
 * @component @name TriangleAlert
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMjEuNzMgMTgtOC0xNGEyIDIgMCAwIDAtMy40OCAwbC04IDE0QTIgMiAwIDAgMCA0IDIxaDE2YTIgMiAwIDAgMCAxLjczLTMiIC8+CiAgPHBhdGggZD0iTTEyIDl2NCIgLz4KICA8cGF0aCBkPSJNMTIgMTdoLjAxIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/triangle-alert
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const TriangleAlert = createLucideIcon('triangle-alert', __iconNode);

export default TriangleAlert;

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
  ['path', { d: 'M10 9H8', key: 'b1mrlr' }],
  ['path', { d: 'M16 13H8', key: 't4e002' }],
  ['path', { d: 'M16 17H8', key: 'z1uh3a' }],
];

/**
 * @component @name FileText
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8cGF0aCBkPSJNMTAgOUg4IiAvPgogIDxwYXRoIGQ9Ik0xNiAxM0g4IiAvPgogIDxwYXRoIGQ9Ik0xNiAxN0g4IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/file-text
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const FileText = createLucideIcon('file-text', __iconNode);

export default FileText;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
      key: '1xq2db',
    },
  ],
];

/**
 * @component @name Zap
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAxNGExIDEgMCAwIDEtLjc4LTEuNjNsOS45LTEwLjJhLjUuNSAwIDAgMSAuODYuNDZsLTEuOTIgNi4wMkExIDEgMCAwIDAgMTMgMTBoN2ExIDEgMCAwIDEgLjc4IDEuNjNsLTkuOSAxMC4yYS41LjUgMCAwIDEtLjg2LS40NmwxLjkyLTYuMDJBMSAxIDAgMCAwIDExIDE0eiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/zap
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Zap = createLucideIcon('zap', __iconNode);

export default Zap;

import createLucideIcon from '../createLucideIcon';
import { IconNode } from '../types';

export const __iconNode: IconNode = [
  [
    'path',
    {
      d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
      key: 'zw3jo',
    },
  ],
  [
    'path',
    {
      d: 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12',
      key: '1wduqc',
    },
  ],
  [
    'path',
    {
      d: 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17',
      key: 'kqbvx6',
    },
  ],
];

/**
 * @component @name Layers
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIuODMgMi4xOGEyIDIgMCAwIDAtMS42NiAwTDIuNiA2LjA4YTEgMSAwIDAgMCAwIDEuODNsOC41OCAzLjkxYTIgMiAwIDAgMCAxLjY2IDBsOC41OC0zLjlhMSAxIDAgMCAwIDAtMS44M3oiIC8+CiAgPHBhdGggZD0iTTIgMTJhMSAxIDAgMCAwIC41OC45MWw4LjYgMy45MWEyIDIgMCAwIDAgMS42NSAwbDguNTgtMy45QTEgMSAwIDAgMCAyMiAxMiIgLz4KICA8cGF0aCBkPSJNMiAxN2ExIDEgMCAwIDAgLjU4LjkxbDguNiAzLjkxYTIgMiAwIDAgMCAxLjY1IDBsOC41OC0zLjlBMSAxIDAgMCAwIDIyIDE3IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/layers
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Layers = createLucideIcon('layers', __iconNode);

export default Layers;

