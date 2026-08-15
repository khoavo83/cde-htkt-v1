'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  Link as LinkIcon, 
  ChevronRight, 
  ChevronDown, 
  ExternalLink, 
  FileText, 
  Check, 
  X, 
  Layers, 
  BarChart3, 
  Table as TableIcon,
  HelpCircle,
  FolderPlus,
  Sliders,
  Sparkles,
  Info,
  CalendarDays
} from 'lucide-react';

// Format helper: YYYY-MM-DD to DD/MM/YYYY
const formatDateVN = (isoStr) => {
  if (!isoStr) return '—';
  if (isoStr.includes('/')) return isoStr;
  const parts = isoStr.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoStr;
};

// Format helper: DD/MM/YYYY or Date to YYYY-MM-DD
const toISODate = (val) => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return s.split('T')[0];
};

// Parse DD/MM/YYYY or YYYY-MM-DD to timestamp in ms (dùng 12:00 trưa để tránh lệch múi giờ UTC)
const parseDateToTime = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr.getTime();
  const s = String(dateStr).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d, 12, 0, 0).getTime();
    }
  }
  if (s.includes('-')) {
    const parts = s.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d, 12, 0, 0).getTime();
    }
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
};

export default function ProjectProgressTab({ 
  projectId, 
  projectName, 
  allDocuments = [],
  onOpenDocument
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'gantt'
  const [ganttScale, setGanttScale] = useState('month'); // 'week', 'month', 'quarter', 'year'

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Expanded Groups & Subtasks
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [parentTaskIdForSub, setParentTaskIdForSub] = useState(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTaskForLink, setSelectedTaskForLink] = useState(null);
  const [linkDocSearch, setLinkDocSearch] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedImportRows, setParsedImportRows] = useState([]);
  const [overwriteOnImport, setOverwriteOnImport] = useState(true);

  const [savingTaskId, setSavingTaskId] = useState(null);
  const [message, setMessage] = useState(null);

  const fileInputRef = useRef(null);

  // ── 1. Fetch Tasks ──────────────────────────────────────────────────────────
  const fetchTasks = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}&t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        
        // Auto expand all groups initially
        const groups = {};
        (data.tasks || []).forEach(t => {
          const gName = t.group_name || 'Khác';
          groups[gName] = true;
        });
        setExpandedGroups(groups);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const showToast = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── 2. Seed Default Tasks ───────────────────────────────────────────────────
  const handleSeedDefault = async () => {
    if (!confirm('Bạn có chắc chắn muốn nạp mẫu Kế hoạch chuẩn từ Google Sheet cho dự án này? Thao tác này sẽ làm mới danh sách nhiệm vụ hiện tại.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/tasks/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã nạp thành công mẫu Kế hoạch BT-CG.');
        await fetchTasks();
      } else {
        showToast(data.error || 'Lỗi khi nạp mẫu', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Task Updates (Inline & Progress) ──────────────────────────────────────
  const handleUpdateProgress = async (taskId, newProgress) => {
    setSavingTaskId(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updated = {
        ...task,
        progress_percent: newProgress,
        status: newProgress >= 100 ? 'completed' : (newProgress > 0 ? 'processing' : 'pending')
      };

      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress_percent: newProgress, progress: newProgress } : t));

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: updated })
      });
      const data = await res.json();
      if (!data.success) {
        showToast('Lỗi lưu tiến độ', 'error');
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      fetchTasks();
    } finally {
      setSavingTaskId(null);
    }
  };

  // ── 4. Save Task (Modal) ────────────────────────────────────────────────────
  const handleSaveTaskForm = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const taskPayload = {
      id: editingTask?.id || `task-${Date.now()}`,
      project_id: projectId,
      stt: formData.get('stt') || '',
      title: formData.get('title') || '',
      group_name: formData.get('group_name') || '',
      stage: formData.get('stage') || 'Giai đoạn thực hiện',
      assigned_to: formData.get('assigned_to') || '',
      progress_percent: parseInt(formData.get('progress_percent') || 0, 10),
      start_date: formData.get('start_date') || null,
      end_date: formData.get('end_date') || null,
      duration_days: formData.get('duration_days') || '',
      legal_basis: formData.get('legal_basis') || '',
      notes: formData.get('notes') || '',
      parent_id: parentTaskIdForSub || editingTask?.parent_id || null,
      order_index: editingTask?.order_index || tasks.length + 1
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskPayload })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã lưu thông tin nhiệm vụ thành công.');
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setParentTaskIdForSub(null);
        fetchTasks();
      } else {
        showToast(data.error || 'Lỗi lưu nhiệm vụ', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── 5. Delete Task ──────────────────────────────────────────────────────────
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) return;
    try {
      const res = await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa nhiệm vụ thành công.');
        setTasks(prev => prev.filter(t => t.id !== taskId && t.parent_id !== taskId));
      } else {
        showToast(data.error || 'Lỗi khi xóa', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── 6. Document Linking ─────────────────────────────────────────────────────
  const handleLinkDoc = async (taskId, doc) => {
    try {
      const res = await fetch('/api/tasks/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          fileId: doc.driveFileId || doc.id,
          documentPath: doc.name || doc.file_name
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã liên kết văn bản "${doc.name}"`);
        setSelectedTaskForLink(prev => prev ? {
          ...prev,
          documents: [...(prev.documents || []), doc.name]
        } : null);
        await fetchTasks();
      } else {
        showToast(data.error || 'Lỗi liên kết', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUnlinkDoc = async (taskId, docName) => {
    if (!confirm(`Gỡ liên kết văn bản "${docName}" khỏi nhiệm vụ này?`)) return;
    try {
      const res = await fetch(`/api/tasks/link?taskId=${encodeURIComponent(taskId)}&documentName=${encodeURIComponent(docName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã gỡ liên kết văn bản.');
        setSelectedTaskForLink(prev => prev ? {
          ...prev,
          documents: (prev.documents || []).filter(d => d !== docName)
        } : null);
        await fetchTasks();
      } else {
        showToast(data.error || 'Lỗi khi gỡ liên kết', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── 7. Excel Import & Export ────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawData || rawData.length < 2) {
          alert('File Excel không có dữ liệu hợp lệ.');
          return;
        }

        // Tìm dòng header
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
          const rowStr = rawData[i].join(' ').toLowerCase();
          if (rowStr.includes('nhiệm vụ') || rowStr.includes('stt') || rowStr.includes('tiến độ')) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = rawData[headerRowIdx].map(h => String(h || '').trim());
        const rows = [];
        let currentGroup = 'Nhiệm vụ chung';

        for (let i = headerRowIdx + 1; i < rawData.length; i++) {
          const r = rawData[i];
          if (!r || r.length === 0 || !r.some(cell => cell !== undefined && cell !== '')) continue;

          const stt = String(r[0] || '').trim();
          const title = String(r[1] || '').trim();

          if (!title && !stt) continue;

          // Nếu là dòng tiêu đề nhóm (VD: I, Giai đoạn chuẩn bị...)
          if (stt.match(/^[IVXLCDM]+$/i) || (!r[4] && !r[5] && title.toLowerCase().includes('giai đoạn'))) {
            currentGroup = `${stt ? stt + '. ' : ''}${title}`;
            continue;
          }

          const stage = String(r[2] || '').trim() || 'Giai đoạn thực hiện';
          const assigned_to = String(r[3] || '').trim();
          
          let progressVal = 0;
          if (r[4] !== undefined) {
            const pStr = String(r[4]).replace('%', '').trim();
            progressVal = parseInt(pStr, 10) || 0;
          }

          const start_date = toISODate(r[5]);
          const end_date = toISODate(r[6]);
          const duration_days = String(r[7] || '').trim();
          const legal_basis = String(r[8] || '').trim();
          const notes = String(r[9] || '').trim();

          rows.push({
            stt,
            title,
            group_name: currentGroup,
            stage,
            assigned_to,
            progress_percent: progressVal,
            start_date,
            end_date,
            duration_days,
            legal_basis,
            notes
          });
        }

        if (rows.length === 0) {
          alert('Không tìm thấy dòng dữ liệu nào từ file Excel.');
          return;
        }

        setParsedImportRows(rows);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        alert('Lỗi khi đọc file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (parsedImportRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tasks: parsedImportRows,
          overwrite: overwriteOnImport
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã nhập thành công ${data.count} nhiệm vụ.`);
        setIsImportModalOpen(false);
        setParsedImportRows([]);
        fetchTasks();
      } else {
        showToast(data.error || 'Lỗi khi nhập dữ liệu', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleExportExcel = () => {
    if (tasks.length === 0) {
      alert('Không có dữ liệu tiến độ để xuất.');
      return;
    }

    const exportData = [
      ['STT', 'Nhiệm vụ', 'Giai đoạn', 'Chủ trì', 'Tiến độ (%)', 'Ngày bắt đầu (KH)', 'Ngày kết thúc (KH)', 'Số ngày (KH)', 'Cơ sở pháp lý', 'Ghi chú / Lưu ý', 'Văn bản liên kết', 'Ngày VB trễ nhất', 'Tình trạng']
    ];

    tasks.forEach(t => {
      exportData.push([
        t.stt || '',
        t.title || '',
        t.stage || t.group_name || '',
        t.assigned_to || '',
        `${t.progress_percent || 0}%`,
        formatDateVN(t.start_date),
        formatDateVN(t.end_date),
        t.duration_days || '',
        t.legal_basis || '',
        t.notes || '',
        (t.documents || []).join('; '),
        formatDateVN(t.latestDocDate),
        t.statusText || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TienDoDuAn');
    XLSX.writeFile(wb, `Tien_Do_${projectName ? projectName.replace(/[^a-zA-Z0-9]/g, '_') : 'Du_An'}.xlsx`);
  };

  // ── 8. Hierarchy & Filtering ────────────────────────────────────────────────
  // Lọc danh sách theo search & dropdown
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !searchTerm || 
        (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.assigned_to && t.assigned_to.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.legal_basis && t.legal_basis.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.stt && String(t.stt).toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStage = stageFilter === 'all' || t.stage === stageFilter || t.group_name === stageFilter;
      const matchStatus = statusFilter === 'all' || t.calculatedStatus === statusFilter;

      return matchSearch && matchStage && matchStatus;
    });
  }, [tasks, searchTerm, stageFilter, statusFilter]);

  // Phân nhóm theo group_name
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach(task => {
      const gName = task.group_name || 'Khác';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(task);
    });
    return groups;
  }, [filteredTasks]);

  // Thống kê Metrics
  const stats = useMemo(() => {
    const total = tasks.filter(t => !t.parent_id).length;
    const completed = tasks.filter(t => !t.parent_id && t.progress_percent >= 100).length;
    const inProgress = tasks.filter(t => !t.parent_id && t.progress_percent > 0 && t.progress_percent < 100).length;
    const late = tasks.filter(t => !t.parent_id && (t.calculatedStatus === 'in_progress_late' || t.calculatedStatus === 'completed_late' || t.calculatedStatus === 'overdue')).length;
    
    let sumProgress = 0;
    tasks.filter(t => !t.parent_id).forEach(t => sumProgress += (t.progress_percent || 0));
    const avgProgress = total > 0 ? Math.round(sumProgress / total) : 0;

    return { total, completed, inProgress, late, avgProgress };
  }, [tasks]);

  // ── 9. Gantt Calculation Helpers ────────────────────────────────────────────
  const ganttRange = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31)
      };
    }

    let minTime = Infinity;
    let maxTime = -Infinity;

    tasks.forEach(t => {
      const s = parseDateToTime(t.start_date);
      const e = parseDateToTime(t.end_date);
      const d = parseDateToTime(t.latestDocDate);
      if (s) minTime = Math.min(minTime, s);
      if (e) maxTime = Math.max(maxTime, e);
      if (d) maxTime = Math.max(maxTime, d);
    });

    if (minTime === Infinity) minTime = new Date('2025-12-01').getTime();
    if (maxTime === -Infinity) maxTime = new Date('2026-12-31').getTime();

    // Thêm padding 15 ngày 2 đầu
    return {
      startDate: new Date(minTime - 15 * 86400000),
      endDate: new Date(maxTime + 15 * 86400000)
    };
  }, [tasks]);

  // Helper tính % vị trí trên timeline
  const getGanttPosition = (dateStr) => {
    const t = parseDateToTime(dateStr);
    if (!t) return null;
    const totalMs = ganttRange.endDate.getTime() - ganttRange.startDate.getTime();
    if (totalMs <= 0) return 0;
    const offsetMs = t - ganttRange.startDate.getTime();
    return Math.max(0, Math.min(100, (offsetMs / totalMs) * 100));
  };

  const todayPosition = useMemo(() => {
    return getGanttPosition(new Date().toISOString());
  }, [ganttRange]);

  // Tạo các mốc trục thời gian Gantt
  const timelineTicks = useMemo(() => {
    const ticks = [];
    const curr = new Date(ganttRange.startDate);
    const end = new Date(ganttRange.endDate);

    if (ganttScale === 'month' || ganttScale === 'quarter') {
      curr.setDate(1);
      while (curr <= end) {
        ticks.push({
          label: `T${curr.getMonth() + 1}/${curr.getFullYear()}`,
          date: new Date(curr),
          percent: getGanttPosition(curr.toISOString())
        });
        curr.setMonth(curr.getMonth() + (ganttScale === 'quarter' ? 3 : 1));
      }
    } else if (ganttScale === 'year') {
      curr.setMonth(0, 1);
      while (curr <= end) {
        ticks.push({
          label: `Năm ${curr.getFullYear()}`,
          date: new Date(curr),
          percent: getGanttPosition(curr.toISOString())
        });
        curr.setFullYear(curr.getFullYear() + 1);
      }
    } else {
      // Week
      while (curr <= end) {
        ticks.push({
          label: `${curr.getDate()}/${curr.getMonth() + 1}`,
          date: new Date(curr),
          percent: getGanttPosition(curr.toISOString())
        });
        curr.setDate(curr.getDate() + 7);
      }
    }
    return ticks;
  }, [ganttRange, ganttScale]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* ── TOAST NOTIFICATION ── */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold border backdrop-blur-md transition-all animate-bounce ${
          message.type === 'error' 
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        }`}>
          {message.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── HEADER & METRICS SUMMARY ── */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/40 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Briefcase size={16} />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  Tiến độ Dự án
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {projectName || 'Bồi thường BT-CG'}
                  </span>
                </h2>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-[11px] bg-slate-950/60 p-1.5 px-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tổng tiến độ:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 sm:w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" style={{ width: `${stats.avgProgress}%` }}></div>
                </div>
                <span className="font-bold text-emerald-400">{stats.avgProgress}%</span>
              </div>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div>
              <span className="text-slate-400">Tổng việc: </span>
              <span className="font-bold text-white">{stats.total}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div>
              <span className="text-slate-400">Hoàn thành: </span>
              <span className="font-bold text-emerald-400">{stats.completed}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div>
              <span className="text-slate-400">Đang làm: </span>
              <span className="font-bold text-blue-400">{stats.inProgress}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div>
              <span className="text-slate-400">Trễ hạn: </span>
              <span className={`font-bold ${stats.late > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>{stats.late}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: VIEW TOGGLE & ACTIONS ── */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/30 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        
        {/* Left: View Switcher & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual View Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon size={14} /> Dạng Bảng
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'gantt'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={14} /> Sơ đồ Gantt
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo tên việc, chủ trì..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filter Stage */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Tất cả giai đoạn</option>
            <option value="Giai đoạn chuẩn bị">Giai đoạn chuẩn bị</option>
            <option value="Giai đoạn thực hiện">Giai đoạn thực hiện</option>
            <option value="Giai đoạn kết thúc">Giai đoạn kết thúc</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="completed_on_time">Hoàn thành đúng hạn</option>
            <option value="completed_late">Hoàn thành trễ hạn</option>
            <option value="in_progress_on_time">Đang thực hiện</option>
            <option value="in_progress_late">Trễ hạn tiến độ</option>
            <option value="not_started">Chưa bắt đầu</option>
          </select>
        </div>

        {/* Right: Gantt Zoom / Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {viewMode === 'gantt' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 mr-1 text-[11px]">
              {['week', 'month', 'quarter', 'year'].map(scale => (
                <button
                  key={scale}
                  onClick={() => setGanttScale(scale)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                    ganttScale === scale
                      ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scale === 'week' ? 'Tuần' : scale === 'month' ? 'Tháng' : scale === 'quarter' ? 'Quý' : 'Năm'}
                </button>
              ))}
            </div>
          )}

          {/* Nút Thêm mới */}
          <button
            onClick={() => { setEditingTask(null); setParentTaskIdForSub(null); setIsTaskModalOpen(true); }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus size={14} /> Thêm việc
          </button>

          {/* Nút Nạp mẫu Kế hoạch */}
          <button
            onClick={handleSeedDefault}
            title="Nạp chuẩn 32+ đầu việc theo mẫu Kế hoạch BT-CG"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Sparkles size={14} className="text-amber-400" /> Nạp mẫu Sheet
          </button>

          {/* Nút Nhập Excel */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all"
            title="Nhập dữ liệu từ file Excel / CSV"
          >
            <Upload size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Nhập Excel</span>
          </button>

          {/* Nút Xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all"
            title="Xuất danh sách ra file Excel"
          >
            <Download size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {/* Nút Refresh */}
          <button
            onClick={fetchTasks}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all border border-slate-700"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT (TABLE VIEW OR GANTT VIEW) ── */}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="text-xs">Đang tải danh sách tiến độ...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-300 mb-1">Chưa có dữ liệu tiến độ cho dự án này</h3>
            <p className="text-xs text-slate-500 max-w-md mb-4">
              Bạn có thể nạp mẫu 32+ công việc Kế hoạch Bồi thường BT-CG chuẩn hoặc tải lên file Excel riêng của dự án.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSeedDefault}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Sparkles size={14} /> Nạp mẫu Kế hoạch BT-CG
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
              >
                <Upload size={14} /> Tải file Excel lên
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (

          /* ── TABLE VIEW ── */
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[280px]">Nhiệm vụ</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Chủ trì</th>
                  <th className="py-2.5 px-3 w-36 text-center">Tiến độ (%)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Bắt đầu (KH)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Kết thúc (KH)</th>
                  <th className="py-2.5 px-3 w-16 text-center">Số ngày</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Cơ sở pháp lý</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Văn bản liên kết</th>
                  <th className="py-2.5 px-3 w-28 text-center">Ngày VB trễ nhất</th>
                  <th className="py-2.5 px-3 w-36 text-center">Tình trạng</th>
                  <th className="py-2.5 px-3 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(groupedTasks).map(([groupName, groupTaskList]) => {
                  const isExpanded = expandedGroups[groupName] !== false;
                  
                  return (
                    <React.Fragment key={groupName}>
                      {/* Dòng Header của Nhóm / Giai đoạn */}
                      <tr 
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !isExpanded }))}
                        className="bg-slate-900/90 hover:bg-slate-850 cursor-pointer transition-colors border-y border-slate-800 select-none font-bold"
                      >
                        <td colSpan={12} className="py-2 px-3 text-emerald-400">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{groupName}</span>
                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              {groupTaskList.length} nhiệm vụ
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Danh sách nhiệm vụ trong nhóm */}
                      {isExpanded && groupTaskList.map((task) => {
                        const subTasks = tasks.filter(t => t.parent_id === task.id);
                        const isTaskExpanded = expandedTasks[task.id] !== false;

                        return (
                          <React.Fragment key={task.id}>
                            <tr className={`hover:bg-slate-800/40 transition-colors ${task.parent_id ? 'bg-slate-950/40' : ''}`}>
                              {/* STT */}
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                {task.stt || '—'}
                              </td>

                              {/* Nhiệm vụ */}
                              <td className="py-2.5 px-3 text-slate-100 font-medium">
                                <div className="flex items-start gap-1.5">
                                  {subTasks.length > 0 && (
                                    <button
                                      onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !isTaskExpanded }))}
                                      className="p-0.5 text-slate-500 hover:text-slate-300 mt-0.5"
                                    >
                                      {isTaskExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="block leading-relaxed" title={task.title}>
                                      {task.title}
                                    </span>
                                    {task.notes && (
                                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic" title={task.notes}>
                                        {task.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Chủ trì */}
                              <td className="py-2.5 px-3 text-slate-300">
                                <span className="line-clamp-2 leading-relaxed" title={task.assigned_to}>
                                  {task.assigned_to || '—'}
                                </span>
                              </td>

                              {/* Tiến độ (%) */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={task.progress_percent || 0}
                                    onChange={(e) => handleUpdateProgress(task.id, parseInt(e.target.value, 10))}
                                    className="w-16 sm:w-20 accent-emerald-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                                  />
                                  <span className="font-bold text-slate-200 font-mono text-center w-8">
                                    {task.progress_percent || 0}%
                                  </span>
                                </div>
                              </td>

                              {/* Ngày bắt đầu */}
                              <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                                {formatDateVN(task.start_date)}
                              </td>

                              {/* Ngày kết thúc */}
                              <td className="py-2.5 px-3 text-center font-mono text-slate-300 font-semibold">
                                {formatDateVN(task.end_date)}
                              </td>

                              {/* Số ngày */}
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                {task.duration_days || '—'}
                              </td>

                              {/* Cơ sở pháp lý */}
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                <span className="line-clamp-2" title={task.legal_basis}>
                                  {task.legal_basis || '—'}
                                </span>
                              </td>

                              {/* Văn bản liên kết */}
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1 items-center">
                                  {task.linkedDocs && task.linkedDocs.length > 0 ? (
                                    task.linkedDocs.map((doc, dIdx) => (
                                      <div
                                        key={dIdx}
                                        className="group inline-flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-cyan-300 border border-slate-700/60 max-w-[180px]"
                                        title={`${doc.name} (Ngày PH: ${doc.ngay_phat_hanh || 'Chưa rõ'})`}
                                      >
                                        <FileText size={10} className="shrink-0 text-cyan-400" />
                                        <span className="truncate">{doc.so_vb || doc.name}</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleUnlinkDoc(task.id, doc.name); }}
                                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity ml-0.5"
                                          title="Gỡ liên kết văn bản này"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-slate-500 text-[10px] italic">Chưa liên kết</span>
                                  )}
                                  <button
                                    onClick={() => { setSelectedTaskForLink(task); setIsLinkModalOpen(true); }}
                                    className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                    title="Liên kết thêm văn bản vào nhiệm vụ này"
                                  >
                                    <LinkIcon size={12} />
                                  </button>
                                </div>
                              </td>

                              {/* Ngày VB trễ nhất */}
                              <td className="py-2.5 px-3 text-center font-mono">
                                {task.latestDocDate ? (
                                  <span className="text-cyan-300 font-semibold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                                    {formatDateVN(task.latestDocDate)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>

                              {/* Tình trạng Đánh giá tự động */}
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                  task.statusColor === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  task.statusColor === 'red' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  task.statusColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  task.statusColor === 'yellow' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {task.statusColor === 'green' ? <CheckCircle2 size={11} /> :
                                   task.statusColor === 'red' ? <AlertTriangle size={11} /> :
                                   task.statusColor === 'blue' ? <Clock size={11} /> :
                                   <HelpCircle size={11} />}
                                  <span>{task.statusText}</span>
                                </span>
                              </td>

                              {/* Thao tác */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => { setEditingTask(task); setParentTaskIdForSub(null); setIsTaskModalOpen(true); }}
                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-colors"
                                    title="Chỉnh sửa nhiệm vụ"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingTask(null); setParentTaskIdForSub(task.id); setIsTaskModalOpen(true); }}
                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition-colors"
                                    title="Thêm việc con (Tiến độ chi tiết)"
                                  >
                                    <FolderPlus size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                                    title="Xóa nhiệm vụ này"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

        ) : (

          /* ── GANTT CHART VIEW ── */
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full">
            
            {/* Chú giải màu sắc Gantt */}
            <div className="p-2.5 px-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-blue-500 border border-blue-400"></div>
                  <span className="text-slate-300 font-semibold">Kế hoạch (Baseline Bar)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400"></div>
                  <span className="text-slate-300 font-semibold">Thực tế Đúng hạn (Actual)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-400"></div>
                  <span className="text-slate-300 font-semibold">Thực tế Trễ hạn (Delayed)</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
                <span>Đường đỏ đứt đoạn: Ngày hiện tại (Hôm nay)</span>
              </div>
            </div>

            {/* Khung cuộn Timeline */}
            <div className="flex-1 overflow-auto relative">
              <div className={`p-4 relative ${
                ganttScale === 'week' ? 'min-w-[2800px]' : (ganttScale === 'month' ? 'min-w-[1500px]' : 'min-w-[1100px]')
              }`}>
                
                {/* Trục mốc thời gian CỐ ĐỊNH (Sticky Header) */}
                <div className="sticky top-0 bg-slate-950/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-800 z-30 mb-4 shadow-lg shadow-black/40">
                  <div className="relative h-7">
                    {timelineTicks.map((tick, tIdx) => (
                      <div
                        key={tIdx}
                        className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center select-none"
                        style={{ left: `${tick.percent}%` }}
                      >
                        <span className="text-[10px] font-mono text-slate-300 font-bold whitespace-nowrap bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800/80">
                          {tick.label}
                        </span>
                        <div className="w-px h-2 bg-slate-600 mt-1"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Đường vạch Hôm nay xuyên suốt bảng */}
                {todayPosition !== null && todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    className="absolute top-12 bottom-0 w-px border-l-2 border-dashed border-rose-500 z-20 pointer-events-none"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <span className="sticky top-10 -translate-x-1/2 bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md shadow-rose-600/30 whitespace-nowrap block w-fit">
                      Hôm nay
                    </span>
                  </div>
                )}

                {/* Vertical Grid Lines mờ làm thước gióng */}
                <div className="absolute top-14 bottom-0 left-4 right-4 pointer-events-none z-0">
                  {timelineTicks.map((tick, tIdx) => (
                    <div
                      key={tIdx}
                      className="absolute top-0 bottom-0 w-px border-l border-slate-800/40"
                      style={{ left: `${tick.percent}%` }}
                    ></div>
                  ))}
                </div>

                {/* Danh sách các thanh Gantt */}
                <div className="space-y-4 relative z-10">
                  {Object.entries(groupedTasks).map(([groupName, groupTaskList]) => (
                    <div key={groupName} className="space-y-2.5">
                      <div className="text-xs font-bold text-emerald-400 bg-slate-950/80 p-2 px-3 rounded-lg border border-slate-800 flex items-center justify-between sticky top-12 z-20 shadow-md">
                        <span>{groupName}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          {groupTaskList.length} nhiệm vụ
                        </span>
                      </div>

                      {groupTaskList.map((task) => {
                        const startPos = getGanttPosition(task.start_date);
                        const endPos = getGanttPosition(task.end_date);
                        const docPos = getGanttPosition(task.latestDocDate);

                        const planWidth = (startPos !== null && endPos !== null) ? Math.max(1.5, endPos - startPos) : 0;
                        
                        // Chiều rộng thực tế:
                        // - Nếu có văn bản: Ngày bắt đầu KH -> Ngày phát hành VB mới nhất
                        // - Nếu chưa có văn bản: Ngày bắt đầu KH -> % kế hoạch
                        let actualWidth = 0;
                        if (startPos !== null) {
                          if (docPos !== null) {
                            actualWidth = Math.max(1.5, docPos - startPos);
                          } else if (planWidth > 0 && (task.progress_percent || 0) > 0) {
                            actualWidth = Math.max(1.5, planWidth * ((task.progress_percent || 0) / 100));
                          }
                        }

                        const isLate = task.statusColor === 'red';

                        return (
                          <div key={task.id} className="group hover:bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60 bg-slate-950/40 transition-colors">
                            {/* Thông tin task header */}
                            <div className="flex justify-between items-center text-xs mb-2">
                              <div className="flex items-center gap-2 max-w-[65%]">
                                <span className="font-mono text-slate-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {task.stt || '—'}
                                </span>
                                <span className="font-bold text-slate-100 truncate" title={task.title}>
                                  {task.title}
                                </span>
                                {task.assigned_to && (
                                  <span className="text-[10px] text-slate-400 truncate hidden md:inline">
                                    ({task.assigned_to})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                <span>KH: <strong className="text-slate-300">{formatDateVN(task.start_date)}</strong> → <strong className="text-slate-300">{formatDateVN(task.end_date)}</strong></span>
                                {task.latestDocDate && (
                                  <span>VB mới nhất: <strong className="text-cyan-300">{formatDateVN(task.latestDocDate)}</strong></span>
                                )}
                                <span className="font-bold text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {task.progress_percent || 0}%
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                  isLate ? 'text-rose-300 bg-rose-500/20 border-rose-500/30' : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30'
                                }`}>
                                  {task.statusText}
                                </span>
                              </div>
                            </div>

                            {/* Gantt Bars: TÁCH RIÊNG BIỆT 2 THANH (KẾ HOẠCH & THỰC TẾ) */}
                            <div className="space-y-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                              
                              {/* 1. HÀNG KẾ HOẠCH (XANH DƯƠNG) */}
                              <div className="flex items-center gap-2">
                                <div className="w-8 shrink-0 text-[9px] font-bold text-blue-400 uppercase font-mono tracking-wider">
                                  [K.Hoạch]
                                </div>
                                <div className="flex-1 relative h-4 bg-slate-900/80 rounded overflow-hidden border border-slate-800/50">
                                  {startPos !== null && planWidth > 0 ? (
                                    <div
                                      className="absolute top-0 bottom-0 rounded bg-gradient-to-r from-blue-600 to-blue-500 border border-blue-400 shadow-sm shadow-blue-500/30 flex items-center px-1.5 transition-all"
                                      style={{
                                        left: `${startPos}%`,
                                        width: `${planWidth}%`
                                      }}
                                      title={`Kế hoạch: ${formatDateVN(task.start_date)} đến ${formatDateVN(task.end_date)} (${task.duration_days || ''} ngày)`}
                                    >
                                      <span className="text-[9px] font-mono text-white font-bold truncate drop-shadow">
                                        KH: {formatDateVN(task.start_date)} - {formatDateVN(task.end_date)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-slate-600 italic px-2">Chưa xác định ngày KH</span>
                                  )}
                                </div>
                              </div>

                              {/* 2. HÀNG TIẾN ĐỘ THỰC TẾ (XANH LÁ HOẶC ĐỎ) */}
                              <div className="flex items-center gap-2">
                                <div className="w-8 shrink-0 text-[9px] font-bold font-mono tracking-wider">
                                  <span className={isLate ? 'text-rose-400' : 'text-emerald-400'}>
                                    [T.Tế]
                                  </span>
                                </div>
                                <div className="flex-1 relative h-4 bg-slate-900/80 rounded overflow-hidden border border-slate-800/50">
                                  {startPos !== null && actualWidth > 0 ? (
                                    <div
                                      className={`absolute top-0 bottom-0 rounded flex items-center px-1.5 transition-all ${
                                        isLate 
                                          ? 'bg-gradient-to-r from-rose-600 to-rose-500 border border-rose-400 shadow-sm shadow-rose-500/40' 
                                          : 'bg-gradient-to-r from-emerald-600 to-emerald-500 border border-emerald-400 shadow-sm shadow-emerald-500/40'
                                      }`}
                                      style={{
                                        left: `${startPos}%`,
                                        width: `${actualWidth}%`
                                      }}
                                      title={`Thực tế: ${task.latestDocDate ? `Từ ${formatDateVN(task.start_date)} đến ${formatDateVN(task.latestDocDate)}` : `${task.progress_percent}%`}`}
                                    >
                                      <span className="text-[9px] font-mono text-white font-bold truncate drop-shadow">
                                        {task.latestDocDate 
                                          ? `TT: Đến ${formatDateVN(task.latestDocDate)} (${task.linkedDocs?.[0]?.so_vb || task.documents?.[0] || 'Văn bản'})` 
                                          : `TT: ${task.progress_percent}%`}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-slate-600 italic px-2">Chưa có tiến độ thực tế (0%)</span>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── MODAL: THÊM / SỬA NHIỆM VỤ ── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                {editingTask ? 'Chỉnh sửa Nhiệm vụ' : (parentTaskIdForSub ? 'Thêm Việc con (Tiến độ chi tiết)' : 'Thêm Nhiệm vụ mới')}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTaskForm} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-400 mb-1 font-semibold">STT</label>
                  <input
                    name="stt"
                    defaultValue={editingTask?.stt || ''}
                    placeholder="VD: 1, 2, 5.1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-slate-400 mb-1 font-semibold">Tên Nhiệm vụ <span className="text-rose-400">*</span></label>
                  <input
                    name="title"
                    required
                    defaultValue={editingTask?.title || ''}
                    placeholder="Nhập tên nhiệm vụ..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nhóm / Giai đoạn</label>
                  <input
                    name="group_name"
                    defaultValue={editingTask?.group_name || 'I. Giai đoạn chuẩn bị'}
                    placeholder="VD: I. Giai đoạn chuẩn bị..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Phân loại Giai đoạn</label>
                  <select
                    name="stage"
                    defaultValue={editingTask?.stage || 'Giai đoạn thực hiện'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  >
                    <option value="Giai đoạn chuẩn bị">Giai đoạn chuẩn bị</option>
                    <option value="Giai đoạn thực hiện">Giai đoạn thực hiện</option>
                    <option value="Giai đoạn kết thúc">Giai đoạn kết thúc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Đơn vị chủ trì / phối hợp</label>
                  <input
                    name="assigned_to"
                    defaultValue={editingTask?.assigned_to || ''}
                    placeholder="VD: Sở Tài chính, UBND xã..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tiến độ (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="progress_percent"
                    defaultValue={editingTask?.progress_percent || 0}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Ngày bắt đầu (KH)</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={toISODate(editingTask?.start_date)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Ngày kết thúc (KH)</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={toISODate(editingTask?.end_date)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Số ngày (KH)</label>
                  <input
                    name="duration_days"
                    defaultValue={editingTask?.duration_days || ''}
                    placeholder="VD: 30"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Cơ sở pháp lý quy định</label>
                <input
                  name="legal_basis"
                  defaultValue={editingTask?.legal_basis || ''}
                  placeholder="VD: Điều 5 Quy chế 4490/QĐ-UBND..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Quy định tiến độ / Ghi chú</label>
                <textarea
                  name="notes"
                  rows="2"
                  defaultValue={editingTask?.notes || ''}
                  placeholder="Ghi chú chi tiết hoặc điều kiện thực hiện..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Check size={14} /> Lưu nhiệm vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LIÊN KẾT VĂN BẢN VÀO NHIỆM VỤ ── */}
      {isLinkModalOpen && selectedTaskForLink && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <LinkIcon className="w-4 h-4 text-cyan-400" />
                  Liên kết Văn bản vào Nhiệm vụ
                </h3>
                <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                  {selectedTaskForLink.stt ? `${selectedTaskForLink.stt}. ` : ''}{selectedTaskForLink.title}
                </p>
              </div>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm theo số hiệu, tên file hoặc trích yếu văn bản..."
                  value={linkDocSearch}
                  onChange={(e) => setLinkDocSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/60 text-xs">
              {allDocuments
                .filter(doc => {
                  if (!linkDocSearch) return true;
                  const term = linkDocSearch.toLowerCase();
                  return (doc.name && doc.name.toLowerCase().includes(term)) ||
                         (doc.documentNumber && doc.documentNumber.toLowerCase().includes(term)) ||
                         (doc.so_vb && doc.so_vb.toLowerCase().includes(term)) ||
                         (doc.documentDate && doc.documentDate.toLowerCase().includes(term)) ||
                         (doc.ngay_phat_hanh && doc.ngay_phat_hanh.toLowerCase().includes(term)) ||
                         (doc.issuingAgency && doc.issuingAgency.toLowerCase().includes(term)) ||
                         (doc.noi_phat_hanh && doc.noi_phat_hanh.toLowerCase().includes(term)) ||
                         (doc.summary && doc.summary.toLowerCase().includes(term)) ||
                         (doc.trich_yeu && doc.trich_yeu.toLowerCase().includes(term));
                })
                .slice(0, 100)
                .map(doc => {
                  const docFileName = doc.name || doc.file_name;
                  const isLinked = selectedTaskForLink.documents?.includes(docFileName);

                  return (
                    <div key={doc.id || doc.driveFileId || doc.name} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-cyan-400 shrink-0" />
                          <span className="font-semibold text-slate-200 truncate" title={docFileName}>
                            {docFileName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 mt-1">
                          {(doc.documentDate || doc.ngay_phat_hanh) && (
                            <span>Ngày PH: <strong className="text-cyan-300 font-mono">{formatDateVN(doc.documentDate || doc.ngay_phat_hanh)}</strong></span>
                          )}
                          {(doc.documentNumber || doc.so_vb) && (
                            <span>Số: <strong className="text-slate-300">{doc.documentNumber || doc.so_vb}</strong></span>
                          )}
                          {(doc.issuingAgency || doc.noi_phat_hanh) && (
                            <span>Nơi PH: {doc.issuingAgency || doc.noi_phat_hanh}</span>
                          )}
                          {(doc.summary || doc.trich_yeu) && (
                            <span className="truncate max-w-[300px] text-slate-500" title={doc.summary || doc.trich_yeu}>
                              V/v: {doc.summary || doc.trich_yeu}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {isLinked ? (
                          <button
                            onClick={() => handleUnlinkDoc(selectedTaskForLink.id, docFileName)}
                            className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg font-semibold hover:bg-rose-500/30 text-xs flex items-center gap-1"
                          >
                            <X size={12} /> Đã gắn (Gỡ)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLinkDoc(selectedTaskForLink.id, doc)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20"
                          >
                            <Plus size={12} /> Chọn gắn
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN NHẬP DỮ LIỆU EXCEL ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                Xem trước Dữ liệu nhập từ Excel ({parsedImportRows.length} nhiệm vụ)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 px-5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
              <span>Đã phân tích thành công {parsedImportRows.length} dòng dữ liệu từ file Excel của bạn.</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteOnImport}
                  onChange={(e) => setOverwriteOnImport(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span className="text-slate-300 font-semibold">Xóa & thay thế danh sách cũ của dự án</span>
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-2">STT</th>
                    <th className="p-2">Nhiệm vụ</th>
                    <th className="p-2">Giai đoạn</th>
                    <th className="p-2">Chủ trì</th>
                    <th className="p-2">Bắt đầu</th>
                    <th className="p-2">Kết thúc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedImportRows.slice(0, 30).map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30">
                      <td className="p-2 font-mono text-slate-400">{r.stt}</td>
                      <td className="p-2 font-medium text-slate-200">{r.title}</td>
                      <td className="p-2 text-slate-400">{r.group_name || r.stage}</td>
                      <td className="p-2 text-slate-400">{r.assigned_to}</td>
                      <td className="p-2 font-mono text-slate-300">{formatDateVN(r.start_date)}</td>
                      <td className="p-2 font-mono text-slate-300">{formatDateVN(r.end_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedImportRows.length > 30 && (
                <p className="text-center text-slate-500 mt-2 italic">... và {parsedImportRows.length - 30} dòng khác</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {importing ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                Xác nhận Nhập dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
