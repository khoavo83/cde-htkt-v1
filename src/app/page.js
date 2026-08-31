'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import FolderTree from '@/components/FolderTree';
import DocumentAnalyzeModal from '@/components/DocumentAnalyzeModal';
import SettingsTab from '@/components/SettingsTab';
import KPITab from '@/components/KPITab';
import ProjectProgressTab from '@/components/ProjectProgressTab';
import ProjectOverviewTab from '@/components/project/ProjectOverviewTab';
import InvestmentTab from '@/components/investment/InvestmentTab';
import CapitalPlanTab from '@/components/investment/CapitalPlanTab';
import DisbursementTab from '@/components/investment/DisbursementTab';
import ContractManagementTab from '@/components/procurement/ContractManagementTab';
import LoginScreen from '@/components/LoginScreen';
import { useAuth } from '@/context/AuthContext';
import { formatDateVN, formatMoneyVN } from '@/lib/formatters';
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
  Edit2, 
  Target, 
  LogIn, 
  LogOut, 
  Crown, 
  ShieldCheck, 
  KeyRound, 
  UserCheck,
  Users,
  DollarSign,
  Receipt,
  Building2,
  Info,
  Package 
} from 'lucide-react';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const { user, profile, role, isAdmin, isEditor, isAuthenticated, loading: authLoading, openAuthModal, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
  const [docProjectFilter, setDocProjectFilter] = useState('all');
  const [driveSource, setDriveSource] = useState('loading');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [activeDmsTab, setActiveDmsTab] = useState('all'); // 'all', 'linked'
  const [analyzingDoc, setAnalyzingDoc] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('projects'); // 'documents', 'projects', 'gis'
  const [projectSubTab, setProjectSubTab] = useState('info'); // 'info', 'investment', 'capital', 'progress', 'folders', 'disbursement'
  const [settingsSubTab, setSettingsSubTab] = useState('document_types');
  
  // Trạng thái dự án
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  
  // Trạng thái cài đặt chung
  const [agencies, setAgencies] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);

  // Trạng thái cập nhật dữ liệu
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortDateOrder, setSortDateOrder] = useState('desc'); // 'desc' hoặc 'asc'

  // Load dữ liệu ban đầu
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, docsRes, projRes] = await Promise.all([
        fetch(`/api/tasks?t=${Date.now()}`),
        fetch(`/api/documents?t=${Date.now()}`),
        fetch(`/api/projects?t=${Date.now()}`)
      ]);

      const [tasksData, docsData, projData] = await Promise.all([
        tasksRes.json(),
        docsRes.json(),
        projRes.json()
      ]);

      // Fetch cài đặt độc lập để không ảnh hưởng dữ liệu chính
      try {
        const agRes = await fetch('/api/settings/agencies');
        if (agRes.ok) {
          const agData = await agRes.json();
          if (agData.success) setAgencies(agData.data.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        }
      } catch (e) { console.error('Lỗi tải cơ quan ban hành:', e); }

      try {
        const dtRes = await fetch('/api/settings/document-types');
        if (dtRes.ok) {
          const dtData = await dtRes.json();
          if (dtData.success) setDocumentTypes(dtData.data.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        }
      } catch (e) { console.error('Lỗi tải loại văn bản:', e); }

      const taskList = Array.isArray(tasksData) ? tasksData : (tasksData?.tasks || []);
      setTasks(taskList);
      
      if (projData.projects) {
        setProjects(projData.projects);
        if (projData.projects.length > 0 && !currentProjectId) {
          setCurrentProjectId(projData.projects[0].id);
        }
      }
      
      // Chọn mặc định task đầu tiên nếu có dữ liệu
      if (taskList.length > 0 && !selectedTaskId) {
        setSelectedTaskId(taskList[0].id);
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
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

  // Cập nhật tiến độ công việc (Task)
  const handleUpdateTaskProgress = async (taskId, progressVal) => {
    if (!isEditor) {
      alert("Chỉ Chuyên viên (Editor) hoặc Quản trị viên (Admin) mới có quyền cập nhật tiến độ công việc! Vui lòng đăng nhập.");
      openAuthModal('login');
      return;
    }

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
    if (!isEditor) {
      alert("Chức năng đồng bộ dữ liệu Google Drive yêu cầu quyền Chuyên viên hoặc Quản trị viên! Vui lòng đăng nhập.");
      openAuthModal('login');
      return;
    }

    try {
      setSyncing(true);
      setSyncResult(null);
      
      // Xác định dự án cần đồng bộ (nếu đang lọc theo 1 dự án cụ thể thì đồng bộ dự án đó, nếu "Tất cả" thì đồng bộ toàn bộ)
      let targetProjParam = 'all';
      if (docProjectFilter !== 'all') {
        const found = projects.find(p => (p.basic_info?.shortName || p.name) === docProjectFilter);
        if (found) targetProjParam = found.id;
      } else if (currentProjectId) {
        targetProjParam = 'all';
      }

      const res = await fetch(`/api/drive/sync?projectId=${targetProjParam}`, { method: 'POST' });
      const result = await res.json();
      setSyncResult(result);
      // Tải lại dữ liệu mới sau khi đồng bộ
      await fetchData();
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
      setSyncResult({ success: false, error: "Không thể kết nối đến API đồng bộ Google Drive." });
    } finally {
      setSyncing(false);
    }
  };

  // Liên kết một văn bản với công việc đang chọn
  const handleLinkDocumentToTask = async (docPath, docName) => {
    if (!isEditor) {
      alert("Chỉ Chuyên viên hoặc Quản trị viên mới có quyền liên kết tài liệu vào công việc! Vui lòng đăng nhập.");
      openAuthModal('login');
      return;
    }

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

  // Mở tệp tin (hỗ trợ cả đường dẫn cục bộ và link Google Drive)
  const handleOpenDocument = async (doc) => {
    if (!doc) return;
    if (typeof doc === 'string') {
      try {
        const res = await fetch('/api/documents/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: doc })
        });
        const result = await res.json();
        if (!result.success) {
          alert(result.error);
        }
      } catch (err) {
        console.error("Lỗi khi mở file:", err);
        alert("Không thể kết nối đến API mở file.");
      }
      return;
    }

    const path = doc.path || doc.filePath;
    const link = doc.driveWebLink || doc.webViewLink || doc.web_view_link;
    if (path) {
      try {
        const res = await fetch('/api/documents/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: path })
        });
        const result = await res.json();
        if (!result.success) {
          alert(result.error);
        }
      } catch (err) {
        console.error("Lỗi khi mở file:", err);
        alert("Không thể kết nối đến API mở file.");
      }
    } else if (link) {
      window.open(link, '_blank');
    } else {
      alert("Không có đường dẫn cục bộ hoặc liên kết Google Drive để mở file này.");
    }
  };

  // Tính toán nhanh số liệu thống kê công việc
  const stats = useMemo(() => {
    const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || []);
    const total = taskList.length;
    if (total === 0) return { total: 0, completed: 0, processing: 0, pending: 0, percentCompleted: 0 };
    
    const completed = taskList.filter(t => t.status === 'completed' || t.progress_percent >= 100).length;
    const processing = taskList.filter(t => t.status === 'processing' || (t.progress_percent > 0 && t.progress_percent < 100)).length;
    const pending = taskList.filter(t => t.status === 'pending' || !t.progress_percent).length;
    const percentCompleted = Math.round((completed / total) * 100);

    return { total, completed, processing, pending, percentCompleted };
  }, [tasks]);

  // Bộ lọc văn bản và liên kết
  const selectedTask = Array.isArray(tasks) ? tasks.find(t => t.id === selectedTaskId) : null;
  
  const allDraftFileIds = useMemo(() => {
    const ids = new Set();
    documents.forEach(doc => {
      const drafts = doc.draftFiles || doc.draft_files || [];
      drafts.forEach(id => ids.add(String(id)));
    });
    return ids;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter(doc => {
      // Ẩn các file đã được gán làm dự thảo cho file khác
      if (allDraftFileIds.has(String(doc.id))) return false;
      const docName = doc.name || '';
      const docSummary = doc.summary || '';
      const matchSearch = docName.toLowerCase().includes(docSearch.toLowerCase()) || 
                          docSummary.toLowerCase().includes(docSearch.toLowerCase());
      const matchCategory = docCategory === 'all' || doc.category === docCategory;
      const matchProject = docProjectFilter === 'all' || doc.project_name === docProjectFilter;
      
      if (dmsSubTab === 'linked') {
        const isLinked = selectedTask && selectedTask.documents && selectedTask.documents.includes(doc.name);
        return matchSearch && matchCategory && matchProject && isLinked;
      }
      
      return matchSearch && matchCategory && matchProject;
    });

    // Helper kiểm tra xem văn bản có phải là loại phụ/đính kèm/phụ lục hay không
    const isAttachmentDoc = (doc) => {
      const loaiVb = (doc.documentType || doc.loai_vb || doc.category || '').toLowerCase().trim();
      const name = (doc.name || doc.file_name || '').toLowerCase();
      const trichYeu = (doc.summary || doc.trich_yeu || '').toLowerCase();

      const attachmentKeywords = ['đính kèm', 'dinh kem', 'phụ lục', 'phu luc', 'bản vẽ', 'ban ve', 'dự thảo', 'du thao', 'phiếu trình', 'phieu trinh'];
      if (attachmentKeywords.some(k => loaiVb.includes(k))) return true;
      if (loaiVb === 'khác' || !loaiVb) {
        if (attachmentKeywords.some(k => name.includes(k) || trichYeu.includes(k))) return true;
      }
      return false;
    };

    // Sắp xếp theo ngày phát hành & ưu tiên VB chính đứng trước Đính kèm
    filtered.sort((a, b) => {
      const getValidDate = (dateStr) => {
        if (!dateStr || dateStr === 'Chưa xác định') return 0;
        const s = String(dateStr).trim();
        if (s.includes('/')) {
          const parts = s.split('/');
          if (parts.length === 3) return new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0], 12, 0, 0).getTime();
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
          const parts = s.split('T')[0].split('-');
          return new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2], 12, 0, 0).getTime();
        }
        const t = new Date(s).getTime();
        return isNaN(t) ? 0 : t;
      };

      const timeA = getValidDate(a.documentDate || a.ngay_phat_hanh || a.issuedDate);
      const timeB = getValidDate(b.documentDate || b.ngay_phat_hanh || b.issuedDate);
      
      // 1. Sắp xếp theo ngày phát hành
      if (timeA !== timeB) {
        return sortDateOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }

      // 2. Nhóm các văn bản cùng Số hiệu VB lại với nhau
      const soVbA = (a.documentNumber || a.so_vb || '').trim();
      const soVbB = (b.documentNumber || b.so_vb || '').trim();
      if (soVbA && soVbB && soVbA !== soVbB) {
        const cmpSoVb = soVbA.localeCompare(soVbB, 'vi', { numeric: true });
        if (cmpSoVb !== 0) return cmpSoVb;
      }

      // 3. Ưu tiên: VB Chính đứng TRƯỚC (0), "Đính kèm / Phụ lục" luôn đứng SAU (1)
      const isAttachA = isAttachmentDoc(a) ? 1 : 0;
      const isAttachB = isAttachmentDoc(b) ? 1 : 0;
      if (isAttachA !== isAttachB) {
        return isAttachA - isAttachB;
      }

      // 4. Sắp xếp theo tên file
      const nameA = a.name || a.file_name || '';
      const nameB = b.name || b.file_name || '';
      return nameA.localeCompare(nameB, 'vi', { numeric: true });
    });

    return filtered;
  }, [documents, docSearch, docCategory, docProjectFilter, dmsSubTab, selectedTaskId, tasks, allDraftFileIds]);

  // Lấy danh sách các dự án duy nhất từ documents
  const uniqueProjects = useMemo(() => {
    const projects = new Set(documents.map(d => d.project_name).filter(Boolean));
    return Array.from(projects).sort();
  }, [documents]);

  // Reset trang khi thay đổi bộ lọc hoặc số mục/trang
  useEffect(() => {
    setCurrentPage(1);
  }, [docSearch, docCategory, docProjectFilter, dmsSubTab, itemsPerPage]);

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
    if (!fileName || typeof fileName !== 'string') {
      return { icon: File, color: 'text-slate-400', bg: 'border-slate-600/30', label: 'FILE' };
    }
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
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
        return { icon: File, color: 'text-slate-400', bg: 'border-slate-600/30', label: ext ? ext.toUpperCase() : 'FILE' };
    }
  };

  // Nếu đang kiểm tra phiên làm việc
  if (authLoading || !mounted) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 animate-pulse flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
            <Layers className="w-7 h-7 animate-spin" />
          </div>
        </div>
        <div className="text-xs font-bold text-white tracking-widest uppercase mb-1">Hệ Thống CDE-HTKT</div>
        <div className="text-[11px] text-slate-500">Đang khởi tạo phiên làm việc...</div>
      </div>
    );
  }

  // Bắt buộc đăng nhập trước khi truy cập ứng dụng
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden font-sans text-sm">
      {/* Header - thu gọn */}
      <header className="relative z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap justify-between items-center gap-2 shrink-0 shadow-lg shadow-black/20">
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
              className="bg-transparent border-none text-emerald-400 font-bold focus:outline-none cursor-pointer max-w-[300px] truncate"
              title={projects.find(p => p.id === currentProjectId)?.name || ''}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.basic_info?.shortName || p.name}
                </option>
              ))}
            </select>
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

        {/* Công cụ & Người dùng */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors ml-1 flex items-center justify-center cursor-pointer"
            title="Chuyển đổi Sáng/Tối"
          >
            {mounted && theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Người dùng & Đăng nhập */}
          <div className="relative ml-1">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition-all text-left group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0">
                    {profile?.full_name ? profile.full_name.charAt(0) : user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block text-[11px] leading-tight">
                    <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors max-w-[100px] truncate">
                      {profile?.full_name || user?.email?.split('@')[0]}
                    </div>
                    <div className="flex items-center gap-1">
                      {role === 'admin' ? (
                        <span className="text-[9px] font-bold text-amber-400">👑 Admin</span>
                      ) : role === 'editor' ? (
                        <span className="text-[9px] font-bold text-emerald-400">✏️ Chuyên viên</span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400">👁️ Người xem</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl z-[100] p-2.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3 border-b border-slate-800 mb-1.5 bg-slate-950/60 rounded-xl">
                        <div className="font-bold text-xs text-white truncate">{profile?.full_name || 'Người dùng'}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{user?.email}</div>
                        <div className="mt-2 flex items-center gap-1">
                          {role === 'admin' ? (
                            <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              👑 Quản trị viên (Admin)
                            </span>
                          ) : role === 'editor' ? (
                            <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✏️ Chuyên viên (Editor)
                            </span>
                          ) : (
                            <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              👁️ Người xem (Read-only)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          openAuthModal('change_password');
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-slate-400" />
                        <span>Đổi mật khẩu</span>
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setActiveMainTab('settings');
                              setSettingsSubTab('staffs');
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Users className="w-4 h-4 text-emerald-400" />
                            <span>Quản lý Nhân sự</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setActiveMainTab('settings');
                              setSettingsSubTab('permissions');
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-400" />
                            <span>Quản lý Phân quyền</span>
                          </button>
                        </>
                      )}

                      <div className="h-px bg-slate-800 my-1.5" />

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full px-3 py-2.5 text-left text-xs font-semibold text-red-400 hover:text-white hover:bg-red-600/20 border border-transparent hover:border-red-500/30 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span>Đăng xuất tài khoản</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* === TAB NAVIGATION === */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-3 sm:px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'documents', label: 'Quản lý Văn bản', icon: FolderOpen, count: filteredDocuments.length },
            { id: 'projects', label: 'Quản lý Dự án', icon: Briefcase, count: projects.length },
            { id: 'gis', label: 'Bản đồ GIS', icon: MapPin, count: null },
            { id: 'kpi', label: 'Quản lý KPI', icon: Target, count: null },
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

        {/* ■ TAB: QUẢN LÝ VĂN BẢN ■ */}
        {activeMainTab === 'documents' && (
          <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4">
            
            {/* Project Tabs (Thay thế cho nhóm dự án) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 border-b border-slate-800/50 scrollbar-thin scrollbar-thumb-slate-700">
              <button
                onClick={() => setDocProjectFilter('all')}
                className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  docProjectFilter === 'all'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Tất cả dự án
              </button>
              {uniqueProjects.map(proj => (
                <button
                  key={proj}
                  onClick={() => setDocProjectFilter(proj)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    docProjectFilter === proj
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {proj}
                </button>
              ))}
            </div>

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
                <button 
                  onClick={handleSyncDrive} 
                  disabled={syncing}
                  title="Đồng bộ tự động các văn bản từ thư mục Google Drive của dự án về hệ thống"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40 text-[11px] font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{syncing ? 'Đang đồng bộ Google Drive...' : 'Đồng bộ Google Drive'}</span>
                </button>
              </div>
            </div>

            {/* Danh sách văn bản - Dạng Table */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-slate-400">#</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400">LOẠI VB</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400">SỐ VB</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400 cursor-pointer group" onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                      <div className="flex items-center gap-1">
                        NGÀY PH
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md group-hover:text-emerald-400 transition-colors">
                          {sortDateOrder === 'desc' ? '▼' : '▲'}
                        </span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400">NƠI PH</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400 w-1/3">TRÍCH YẾU ND</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400">NGƯỜI XL</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-400 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-20 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2 mx-auto" />
                        <span>Đang tải danh sách văn bản...</span>
                      </td>
                    </tr>
                  ) : paginatedDocs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-20 text-center text-slate-500">
                        <AlertTriangle className="w-8 h-8 text-slate-600 mb-2 mx-auto" />
                        <span>Không tìm thấy tài liệu phù hợp</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedDocs.map((doc, idx) => {
                      const docName = doc.name || doc.file_name || doc.fileName || '';
                      const isLinkedToSelected = selectedTask && selectedTask.documents && docName && selectedTask.documents.includes(docName);
                      const fileInfo = getFileIcon(docName);
                      const IconComp = fileInfo.icon || File;
                      const actualIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                      const ext = docName.includes('.') ? docName.split('.').pop().toLowerCase() : '';
                      const isDocOrExcel = ['doc', 'docx', 'xls', 'xlsx'].includes(ext);
                      
                      return (
                        <tr key={doc.id || idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                          <td className="py-2 px-3 align-top">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-mono w-5">{actualIndex}</span>
                              <div onClick={() => handleOpenDocument(doc)}
                                className={`p-1.5 border ${fileInfo.bg} rounded-md border-transparent group-hover:border-emerald-500/30 transition-colors cursor-pointer flex items-center justify-center`}
                                title={`Mở tệp (${fileInfo.label})`}>
                                <IconComp className={`w-4 h-4 ${fileInfo.color}`} />
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 align-top text-slate-300">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[100px] block" title={doc.documentType || doc.category || 'Khác'}>
                                {doc.documentType || doc.category || 'Khác'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 align-top">
                            <span className="font-semibold text-emerald-400 hover:underline cursor-pointer" onClick={() => handleOpenDocument(doc)} title={doc.documentNumber || docName}>
                              {doc.documentNumber || (docName ? (docName.length > 15 ? docName.substring(0, 15) + '...' : docName) : '---')}
                            </span>
                          </td>
                          <td className="py-2 px-3 align-top text-slate-400 whitespace-nowrap font-mono">
                            {formatDateVN(doc.issuedDate || doc.documentDate || doc.ngay_phat_hanh)}
                          </td>
                          <td className="py-2 px-3 align-top text-slate-300">
                            <span className="line-clamp-2" title={doc.issuer || doc.issuingAgency || doc.noi_ban_hanh}>
                              {(() => {
                                const name = doc.issuer || doc.issuingAgency || doc.noi_ban_hanh || 'Đang cập nhật';
                                const agency = agencies.find(a => a.name === name);
                                return agency?.abbreviation ? agency.abbreviation : name;
                              })()}
                            </span>
                          </td>
                          <td className="py-2 px-3 align-top">
                            <p className="text-slate-300 line-clamp-2" title={isDocOrExcel ? (docName || '') : (doc.summary || docName || '')}>
                              {isDocOrExcel ? (docName || '---') : (doc.summary || docName || '---')}
                            </p>
                          </td>
                          <td className="py-2 px-3 align-top text-slate-300 whitespace-nowrap">
                            {doc.assignedStaff ? (
                              <span className="text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] uppercase tracking-wider">
                                {doc.assignedStaff}
                              </span>
                            ) : (
                              <span className="text-slate-500">---</span>
                            )}
                          </td>
                          <td className="py-2 px-3 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setAnalyzingDoc(doc)}
                                className="p-1.5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded transition-colors"
                                title="Chỉnh sửa thông tin">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleOpenDocument(doc)}
                                className="p-1.5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded transition-colors"
                                title="Mở bằng app">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              {isLinkedToSelected ? (
                                <span className="inline-flex items-center justify-center p-1.5 text-emerald-400 rounded" title="Đã liên kết">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <button onClick={() => handleLinkDocumentToTask(doc.path || doc.filePath || docName, docName || doc.documentNumber || '')}
                                  className="p-1.5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded transition-colors"
                                  title={`Liên kết: ${selectedTask?.title}`}>
                                  <LinkIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──── TAB: QUẢN LÝ DỰ ÁN ──── */}
        {activeMainTab === 'projects' && (
           <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4">
             <div className="flex justify-between items-center mb-3 shrink-0">
               <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                 {/* 1. Thông tin dự án */}
                 <button 
                   onClick={() => setProjectSubTab('info')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'info' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <Info className="w-3.5 h-3.5 text-emerald-400" /> Thông tin dự án
                   </div>
                 </button>

                 {/* 2. Tổng mức đầu tư */}
                 <button 
                   onClick={() => setProjectSubTab('investment')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'investment' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Tổng mức đầu tư
                   </div>
                 </button>

                 {/* 3. Kế hoạch vốn */}
                 <button 
                   onClick={() => setProjectSubTab('capital')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'capital' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <Calendar className="w-3.5 h-3.5 text-blue-400" /> Kế hoạch vốn
                   </div>
                 </button>

                 {/* 4. Gói thầu & HĐ */}
                 <button 
                   onClick={() => setProjectSubTab('procurement')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'procurement' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <Package className="w-3.5 h-3.5 text-purple-400" /> Gói thầu & HĐ
                   </div>
                 </button>

                 {/* 5. Tiến độ */}
                 <button 
                   onClick={() => setProjectSubTab('progress')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'progress' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Tiến độ
                   </div>
                 </button>

                 {/* 6. Giải ngân */}
                 <button 
                   onClick={() => setProjectSubTab('disbursement')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'disbursement' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <Receipt className="w-3.5 h-3.5 text-amber-400" /> Giải ngân
                   </div>
                 </button>

                 {/* 7. Pháp lý */}
                 <button 
                   onClick={() => setProjectSubTab('folders')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${projectSubTab === 'folders' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                 >
                   <div className="flex items-center gap-1.5">
                     <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> Pháp lý
                   </div>
                 </button>
               </div>
             </div>

             <div className="flex-1 min-h-0 overflow-hidden">
               {/* 1. Tab Thông tin DA */}
               {projectSubTab === 'info' && (
                 <div className="h-full w-full">
                   <ProjectOverviewTab 
                     projectId={currentProjectId}
                     onUpdate={fetchData}
                   />
                 </div>
               )}

               {/* 2. Tab TMĐT */}
               {projectSubTab === 'investment' && (
                 <div className="h-full w-full">
                   <InvestmentTab 
                     projectId={currentProjectId}
                     projectName={projects.find(p => p.id === currentProjectId)?.basic_info?.shortName || projects.find(p => p.id === currentProjectId)?.name}
                   />
                 </div>
               )}

               {/* 3. Tab Kế hoạch vốn */}
               {projectSubTab === 'capital' && (
                 <div className="h-full w-full">
                   <CapitalPlanTab 
                     projectId={currentProjectId}
                     projectName={projects.find(p => p.id === currentProjectId)?.basic_info?.shortName || projects.find(p => p.id === currentProjectId)?.name}
                   />
                 </div>
               )}

               {/* 4. Tab Gói thầu & HĐ */}
               {projectSubTab === 'procurement' && (
                 <div className="h-full w-full">
                   <ContractManagementTab 
                     projectId={currentProjectId}
                     projectName={projects.find(p => p.id === currentProjectId)?.basic_info?.shortName || projects.find(p => p.id === currentProjectId)?.name}
                   />
                 </div>
               )}

               {/* 5. Tab Tiến độ */}
               {projectSubTab === 'progress' && (
                 <div className="h-full w-full">
                   <ProjectProgressTab 
                     projectId={currentProjectId}
                     projectName={projects.find(p => p.id === currentProjectId)?.basic_info?.shortName || projects.find(p => p.id === currentProjectId)?.name}
                     allDocuments={documents}
                     onOpenDocument={handleOpenDocument}
                   />
                 </div>
               )}

               {/* 5. Tab Dữ liệu */}
               {projectSubTab === 'folders' && (
                 <div className="h-full w-full overflow-y-auto">
                   <FolderTree 
                     projectId={currentProjectId} 
                     allDocuments={documents} 
                     onDocumentUpdate={fetchData}
                   />
                 </div>
               )}

               {/* 6. Tab Giải ngân */}
               {projectSubTab === 'disbursement' && (
                 <div className="h-full w-full">
                   <DisbursementTab 
                     projectId={currentProjectId}
                     projectName={projects.find(p => p.id === currentProjectId)?.basic_info?.shortName || projects.find(p => p.id === currentProjectId)?.name}
                   />
                 </div>
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

        {activeMainTab === 'kpi' && (
          <KPITab 
            documents={documents} 
            onOpenDocument={handleOpenDocument}
            onRefresh={fetchData}
          />
        )}

        {activeMainTab === 'settings' && (
          <SettingsTab 
            currentProjectId={currentProjectId} 
            initialSubTab={settingsSubTab} 
            driveSource={driveSource} 
            realtimeStatus={realtimeStatus} 
          />
        )}

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
          agencies={agencies}
          documentTypes={documentTypes}
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

