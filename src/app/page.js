'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import FolderTree from '@/components/FolderTree';
import DocumentAnalyzeModal from '@/components/DocumentAnalyzeModal';
import SettingsTab from '@/components/SettingsTab';
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
  Brain,
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
  Settings,
  Sun,
  Moon,
  Edit2
} from 'lucide-react';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Trạng thái dữ liệu
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // Trạng thái giao diện
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [dmsSubTab, setDmsSubTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [docSearch, setDocSearch] = useState('');
  const [docCategory, setDocCategory] = useState('all');
  const [driveSource, setDriveSource] = useState('loading');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [activeDmsTab, setActiveDmsTab] = useState('all'); // 'all', 'linked'
  const [analyzingDoc, setAnalyzingDoc] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('projects'); // 'documents', 'projects', 'gis'
  const [projectSubTab, setProjectSubTab] = useState('folders'); // 'progress', 'folders'
  
  // Trạng thái dự án
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  
  // Trạng thái cập nhật dữ liệu
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load dữ liệu ban đầu
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
      
      // Chọn mặc định task đầu tiên nếu có dữ liệu
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
      console.error("Lỗi khi fetch dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Kết nối Realtime SSE (Đồng bộ các cập nhật tiến độ công việc giữa các trình duyệt)
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
        console.error("Lỗi phân tích gói tin realtime:", e);
      }
    });

    eventSource.addEventListener('ping', () => {
      setRealtimeStatus('connected');
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Cập nhật tiến độ công việc (Task)
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
        // Cập nhật local state nhanh trước khi SSE phát sóng
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: progressVal, status } : t));
      }
    } catch (error) {
      console.error("Lỗi cập nhật tiến độ công việc:", error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Đồng bộ hóa Google Drive sang Supabase
  const handleSyncDrive = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch('/api/documents/sync', { method: 'POST' });
      const result = await res.json();
      setSyncResult(result);
      // Tải lại dữ liệu mới sau khi đồng bộ
      await fetchData();
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
      setSyncResult({ success: false, error: "Không thể kết nối đến API đồng bộ." });
    } finally {
      setSyncing(false);
    }
  };

  // Liên kết một văn bản với công việc đang chọn
  const handleLinkDocumentToTask = async (docPath, docName) => {
    if (!selectedTaskId) {
      alert("Vui lòng chọn một công việc ở cột bên trái trước khi liên kết!");
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
        // Cập nhật local state cho mảng documents của task được chọn
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
        alert("Lỗi liên kết: " + result.error);
      }
    } catch (err) {
      console.error("Lỗi khi kết nối API liên kết:", err);
      alert("Không thể kết nối đến API tạo liên kết.");
    }
  };

  // Mở tệp tin trực tiếp trên máy tính người dùng bằng ứng dụng mặc định
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
      console.error("Lỗi khi mở file:", err);
      alert("Không thể kết nối đến API mở file.");
    }
  };

  // Tính toán nhanh số liệu thống kê công việc
  const stats = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { total: 0, completed: 0, processing: 0, pending: 0, percentCompleted: 0 };
    
    const completed = tasks.filter(t => t.status === 'completed').length;
    const processing = tasks.filter(t => t.status === 'processing').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const percentCompleted = Math.round((completed / total) * 100);

    return { total, completed, processing, pending, percentCompleted };
  }, [tasks]);

  // Bộ lọc văn bản và liên kết
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

    // Sắp xếp theo ngày phát hành gần nhất
    filtered.sort((a, b) => {
      const dateA = a.documentDate ? new Date(a.documentDate.split('/').reverse().join('-')) : new Date(0);
      const dateB = b.documentDate ? new Date(b.documentDate.split('/').reverse().join('-')) : new Date(0);
      return dateB - dateA;
    });

    return filtered;
  }, [documents, docSearch, docCategory, dmsSubTab, selectedTaskId, tasks]);

  // Reset trang khi thay đổi bộ lọc hoặc số mục/trang
  useEffect(() => {
    setCurrentPage(1);
  }, [docSearch, docCategory, dmsSubTab, itemsPerPage]);

  // Xử lý thêm dự án mới
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
      alert("Lỗi khi thêm dự án mới");
    }
  };

  // Tính toán thống kê chung
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / itemsPerPage));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  // Hàm trả về icon và màu sắc theo loại file
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
    <div className="h-full w-full flex flex-col overflow-hidden font-sans text-sm">
      {/* Header - thu gọn */}
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
              Quản lý Văn bản &middot; Tiến độ &middot; GIS
            </p>
          </div>
        </div>

        {/* Chỉ số nhanh & Chọn dự án */}
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
              title="Cài đặt dự án"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
          <div className="text-center">
            <span className="text-slate-400 block">Tiến độ</span>
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
            <span className="text-slate-400 block">Đang làm</span>
            <span className="font-bold text-amber-400">{stats.processing}</span>
          </div>
        </div>

        {/* Trạng thái */}
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
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors ml-1 flex items-center justify-center"
            title="Chuyển đổi Sáng/Tối"
          >
            {mounted && theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* === TAB NAVIGATION === */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-3 sm:px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'documents', label: 'Quản lý Văn bản', icon: FolderOpen, count: filteredDocuments.length },
            { id: 'projects', label: 'Quản lý Dự án', icon: Briefcase, count: tasks.length },
            { id: 'gis', label: 'Bản đồ GIS', icon: MapPin, count: null },
            { id: 'settings', label: 'Cài đặt', icon: Settings, count: null },
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

        {/* ──── TAB: QUẢN LÝ VĂN BẢN ──── */}
        {activeMainTab === 'documents' && (
          <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4">
            {/* Thanh tìm kiếm & bộ lọc */}
            <div className="flex flex-wrap gap-2 shrink-0 mb-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm văn bản theo tên hoặc trích yếu..."
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
                <option value="all">Tất cả danh mục</option>
                <option value="Quy hoạch">Quy hoạch</option>
                <option value="Sở ngành">Sở ngành</option>
                <option value="Đất đai">Đất đai</option>
                <option value="Rà phá bom mìn">Rà phá bom mìn</option>
                <option value="Phú Mỹ Hưng">Phú Mỹ Hưng</option>
                <option value="Hạ tầng kỹ thuật">Hạ tầng kỹ thuật</option>
                <option value="Bồi thường">Bồi thường</option>
                <option value="Khác">Khác</option>
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => setDmsSubTab('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${dmsSubTab === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setDmsSubTab('linked')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${dmsSubTab === 'linked' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Đã liên kết
                </button>
              </div>
            </div>

            {/* Đồng bộ kết quả */}
            {syncResult && (
              <div className={`p-3 rounded-xl text-[10px] border flex flex-col gap-1 shrink-0 mb-3 ${syncResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <div className="font-bold flex justify-between items-center">
                  <span>{syncResult.success ? '✓ Đồng bộ hoàn tất' : '✗ Đồng bộ thất bại'}</span>
                  <button onClick={() => setSyncResult(null)} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
                </div>
                <p className="mt-0.5 text-slate-300">{syncResult.message || syncResult.error}</p>
                {syncResult.success && (
                  <div className="flex gap-3 text-slate-400 mt-1 pt-1 border-t border-slate-800/40">
                    <span>Đã quét: <strong className="text-slate-200">{syncResult.scannedCount}</strong> tệp</span>
                    <span>Supabase: <strong className={syncResult.syncedToSupabase ? "text-emerald-400" : "text-amber-400"}>
                      {syncResult.syncedToSupabase ? `Đã lưu ${syncResult.syncedCount}` : "Offline"}
                    </strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Thanh phân trang */}
            <div className="text-[10px] text-slate-400 flex flex-wrap justify-between items-center shrink-0 mb-2 gap-2">
              <span>Tìm thấy <strong className="text-slate-200">{filteredDocuments.length}</strong> văn bản &middot; Trang <strong className="text-slate-200">{currentPage}</strong>/{totalPages}</span>
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
                  {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ổ H:'}
                </button>
              </div>
            </div>

            {/* Danh sách văn bản - CUỘN Ở ĐÂY */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                  <span>Đang tải danh sách văn bản...</span>
                </div>
              ) : paginatedDocs.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-slate-600" />
                  <span>Không tìm thấy tài liệu phù hợp</span>
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
                        title={`Mở tệp (${fileInfo.label})`}>
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
                            Trích yếu: {doc.summary}
                          </p>
                        )}
                        <div className="text-[9px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                          <span className="font-semibold text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">{doc.category}</span>
                          {doc.documentDate && <span className="shrink-0">Ngày: {doc.documentDate}</span>}
                          {doc.issuingAgency && doc.issuingAgency !== 'Đang cập nhật' && <span className="shrink-0">CQ: {doc.issuingAgency}</span>}
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
                          title="Mở bằng app">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setAnalyzingDoc(doc)}
                          className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-lg text-slate-400 hover:text-amber-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                          title="Chỉnh sửa thông tin">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isLinkedToSelected ? (
                          <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ✓ Liên kết
                          </span>
                        ) : (
                          <button onClick={() => handleLinkDocumentToTask(doc.path, doc.name)}
                            className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-400 hover:text-emerald-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] font-semibold"
                            title={`Liên kết: ${selectedTask?.title}`}>
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

        {/* ──── TAB: QUẢN LÝ DỰ ÁN ──── */}
        {activeMainTab === 'projects' && (
          <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => setProjectSubTab('progress')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'progress' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Tiến độ Hạng mục
                  </div>
                </button>
                <button 
                  onClick={() => setProjectSubTab('folders')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'folders' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" /> Thư mục Drive
                  </div>
                </button>
              </div>
              {projectSubTab === 'progress' && <span className="text-[10px] text-slate-400 hidden sm:inline">Chọn việc để liên kết hồ sơ (chuyển sang tab Văn bản)</span>}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {projectSubTab === 'folders' && (
                <div className="h-full w-full">
                  <FolderTree projectId={currentProjectId} allDocuments={documents} />
                </div>
              )}
              
              {projectSubTab === 'progress' && (
                <>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                      <span>Đang tải...</span>
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
                            task.category === 'Rà phá bom mìn' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : task.category === 'Hạ tầng kỹ thuật' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>{task.category}</span>
                          <h4 className="text-xs font-bold text-slate-100 truncate" title={task.title}>{task.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>Đơn vị: {task.assignedTo}</span>
                          </p>
                          {task.documents && task.documents.length > 0 && (
                            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                              <FileText className="w-3 h-3" />
                              <span>{task.documents.length} văn bản đã liên kết</span>
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold flex items-center gap-1.5 shrink-0 ${
                          task.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {task.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
                          {task.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span>Tiến độ:</span>
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

        {/* ──── TAB: BẢN ĐỒ GIS ──── */}
        {activeMainTab === 'gis' && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
            <MapPin className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-300 mb-2">Bản đồ GIS</h3>
            <p className="text-xs text-slate-500 text-center max-w-md">
              Tính năng bản đồ GIS đang được phát triển. Sẽ tích hợp hiển thị vị trí thửa đất, ranh giới quy hoạch và liên kết trực tiếp với hồ sơ văn bản.
            </p>
          </div>
        )}

        {activeMainTab === 'settings' && (<SettingsTab />)}

        </main>
      
      {/* Modal Thêm Dự án */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Cài đặt Dự án mới
              </h3>
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddProject} className="p-5">
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Tên Dự án</label>
                <input 
                  type="text" 
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="VD: Dự án Metro Số 1"
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
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Thêm Dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {analyzingDoc && (
        <DocumentAnalyzeModal 
          document={analyzingDoc} 
          isOpen={!!analyzingDoc} 
          allDocuments={documents}
          onClose={() => setAnalyzingDoc(null)} 
          onSave={(updatedDoc) => {
            // Update local state if necessary or re-fetch data
            fetchData();
            setAnalyzingDoc(null);
          }} 
        />
      )}
    </div>
  );
}

