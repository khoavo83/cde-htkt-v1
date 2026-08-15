'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Check, X, RefreshCw, Users, Server, Building2, Wand2, AlertCircle, ArrowRight, CheckCircle2, Loader2, Database, FileText, ShieldCheck, Clock, Sparkles, Zap, BrainCircuit, Briefcase, UserCircle } from 'lucide-react';
import ProjectListTab from './ProjectListTab';
import StaffListTab from './StaffListTab';

export default function SettingsTab({ currentProjectId }) {
  const [activeSubTab, setActiveSubTab] = useState('document_types');
  const [agencies, setAgencies] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Trạng thái cho Edit/Add (Agencies)
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', abbreviation: '', notes: '' });
  
  // Trạng thái cho Edit/Add (Document Types)
  const [docEditingId, setDocEditingId] = useState(null);
  const [docEditForm, setDocEditForm] = useState({ name: '', display_name: '', notes: '' });
  
  // Trạng thái cho Thêm mới (Agencies)
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', abbreviation: '', notes: '' });

  // Trạng thái cho Thêm mới (Document Types)
  const [docIsAdding, setDocIsAdding] = useState(false);
  const [docAddForm, setDocAddForm] = useState({ name: '', display_name: '', notes: '' });
  const [showNormalize, setShowNormalize] = useState(false);
  const [normalizeData, setNormalizeData] = useState(null);
  const [normalizeLoading, setNormalizeLoading] = useState(false);
  const [normalizeApplying, setNormalizeApplying] = useState(false);
  const [normalizeMappings, setNormalizeMappings] = useState([]);
  const [normalizeResult, setNormalizeResult] = useState(null);
  const [normalizeTab, setNormalizeTab] = useState('issuer');

  // ── Trạng thái Migrate tài liệu ──────────────────────────────────────
  const [migrateStatus, setMigrateStatus] = useState(null); // { total, migrated, pending }
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateRunning, setMigrateRunning] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null); // kết quả sau khi chạy
  const [previewItems, setPreviewItems] = useState(null); // danh sách preview
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Trạng thái AI Analysis ────────────────────────────────────────────
  const [aiStatus, setAiStatus] = useState(null);        // { total, analyzed, pending, failed }
  const [aiRunning, setAiRunning] = useState(false);     // đang chạy phân tích
  const [aiLogs, setAiLogs] = useState([]);              // log real-time từng file
  const [aiCurrentFile, setAiCurrentFile] = useState(null); // file đang xử lý
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 }); // tiến độ batch
  const [aiBatchLimit, setAiBatchLimit] = useState(10);  // số file mỗi lần chạy

  useEffect(() => {
    fetchAgencies();
    fetchDocumentTypes();
  }, []);

  // Tự động load trạng thái migrate khi vào tab
  useEffect(() => {
    if (activeSubTab === 'migrate') {
      fetchMigrateStatus();
      fetchAiStatus();  // Cũng load AI status
    }
  }, [activeSubTab]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/agencies');
      const data = await res.json();
      if (data.success) {
        const sorted = data.data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setAgencies(sorted);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách nơi phát hành:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/document-types');
      const data = await res.json();
      if (data.success) {
        const sorted = data.data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setDocumentTypes(sorted);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách loại văn bản:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Hàm migrate ──────────────────────────────────────────────────────
  const fetchMigrateStatus = async () => {
    setMigrateLoading(true);
    try {
      const res = await fetch('/api/documents/migrate');
      const data = await res.json();
      if (data.success) setMigrateStatus(data);
    } catch (e) { console.error(e); }
    finally { setMigrateLoading(false); }
  };

  const runPreview = async () => {
    setPreviewLoading(true);
    setPreviewItems(null);
    try {
      const res = await fetch('/api/documents/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview' })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewItems(data.items);
        setMigrateStatus({ total: data.total, migrated: data.migrated, pending: data.pending });
      }
    } catch (e) { console.error(e); }
    finally { setPreviewLoading(false); }
  };

  const runMigrateAll = async () => {
    if (!confirm(`Bắt đầu migrate ${migrateStatus?.pending || '?'} văn bản vào Supabase?\n\nVăn bản đã sửa tay sẽ được bảo vệ, không bị ghi đè.`)) return;
    setMigrateRunning(true);
    setMigrateResult(null);
    try {
      const res = await fetch('/api/documents/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate_all' })
      });
      const data = await res.json();
      setMigrateResult(data);
      if (data.success) {
        setMigrateStatus({ total: data.total, migrated: data.migrated, pending: data.pending });
        setPreviewItems(null); // reset preview
      }
    } catch (e) {
      setMigrateResult({ success: false, error: e.message });
    } finally {
      setMigrateRunning(false);
    }
  };

  const runMigrateOne = async (fileId, fileName) => {
    try {
      const res = await fetch('/api/documents/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate_one', fileId })
      });
      const data = await res.json();
      if (data.success) {
        setMigrateStatus({ total: data.total, migrated: data.migrated, pending: data.pending });
        // Cập nhật trạng thái item trong preview
        setPreviewItems(prev => prev?.map(item =>
          item.file_id === fileId ? { ...item, already_migrated: true } : item
        ));
      }
    } catch (e) { console.error(e); }
  };

  // ── Hàm AI Analysis ──────────────────────────────────────────────────
  const fetchAiStatus = async () => {
    try {
      const res = await fetch('/api/documents/analyze');
      const data = await res.json();
      if (data.success) setAiStatus(data);
    } catch (e) { console.error('AI status error:', e); }
  };

  const startAIAnalysis = async (retryErrors = false) => {
    if (aiRunning) return;
    setAiRunning(true);
    setAiLogs([]);
    setAiCurrentFile(null);
    setAiProgress({ current: 0, total: 0 });

    const addLog = (entry) => setAiLogs(prev => [entry, ...prev].slice(0, 100)); // giữ 100 log gần nhất

    try {
      const response = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', limit: aiBatchLimit, retryErrors })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(trimmed.slice(6));

            switch (event.type) {
              case 'start':
                setAiProgress({ current: 0, total: event.total });
                addLog({ type: 'info', text: event.message, time: new Date() });
                break;
              case 'progress':
                setAiProgress({ current: event.current, total: event.total, percent: event.percent });
                break;
              case 'processing':
                setAiCurrentFile({ name: event.fileName, folder: event.folder });
                break;
              case 'analyzing':
                addLog({ type: 'info', text: `🤖 ${event.message}`, time: new Date() });
                break;
              case 'success':
                setAiCurrentFile(null);
                addLog({
                  type: 'success',
                  text: `✅ ${event.fileName}`,
                  detail: event.result ? `${event.result.loai_vb || '?'} | ${event.result.noi_phat_hanh || '?'} | ${event.result.ngay_phat_hanh || '?'}` : '',
                  time: new Date()
                });
                // Cập nhật AI status counter
                setAiStatus(prev => prev ? { ...prev, analyzed: parseInt(prev.analyzed)+1, pending: Math.max(0,parseInt(prev.pending)-1) } : prev);
                break;
              case 'error':
                setAiCurrentFile(null);
                addLog({ type: 'error', text: `❌ ${event.fileName}: ${event.error}`, time: new Date() });
                break;
              case 'rate_limit':
                addLog({ type: 'warning', text: event.message, time: new Date() });
                break;
              case 'retry':
                addLog({ type: 'warning', text: event.message, time: new Date() });
                break;
              case 'waiting':
                addLog({ type: 'info', text: event.message, time: new Date() });
                break;
              case 'migrating':
                addLog({ type: 'info', text: event.message, time: new Date() });
                break;
              case 'migrated':
                addLog({ type: 'success', text: `🔄 Đã cập nhật ${event.count} văn bản vào documents`, time: new Date() });
                fetchMigrateStatus();
                break;
              case 'complete':
                setAiCurrentFile(null);
                setAiProgress(prev => ({ ...prev, current: prev.total }));
                addLog({ type: 'complete', text: event.message, remaining: event.remaining, time: new Date() });
                fetchAiStatus();
                break;
              case 'fatal_error':
                addLog({ type: 'error', text: `💥 Lỗi nghiêm trọng: ${event.error}`, time: new Date() });
                break;
            }
          } catch (_) { /* bỏ qua dòng parse lỗi */ }
        }
      }
    } catch (err) {
      addLog({ type: 'error', text: `Lỗi kết nối: ${err.message}`, time: new Date() });
    } finally {
      setAiRunning(false);
      setAiCurrentFile(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return alert('Tên đơn vị không được để trống!');
    
    try {
      setSaving(true);
      const res = await fetch('/api/settings/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (data.success) {
        setAgencies([...agencies, data.data].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        setIsAdding(false);
        setAddForm({ name: '', abbreviation: '', notes: '' });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi thêm mới');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) return alert('Tên đơn vị không được để trống!');
    
    try {
      setSaving(true);
      const res = await fetch('/api/settings/agencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setAgencies(agencies.map(a => a.id === data.data.id ? data.data : a).sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        setEditingId(null);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn vị này?')) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/settings/agencies?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAgencies(agencies.filter(a => a.id !== id));
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    } finally {
      setSaving(false);
    }
  };

  // ── Xử lý Document Types ──────────────────────────────────────────────────────
  const handleDocAdd = async () => {
    if (!docAddForm.name.trim()) return alert('Tên loại văn bản không được để trống!');
    
    try {
      setSaving(true);
      const res = await fetch('/api/settings/document-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docAddForm)
      });
      const data = await res.json();
      if (data.success) {
        setDocumentTypes([...documentTypes, data.data].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        setDocIsAdding(false);
        setDocAddForm({ name: '', display_name: '', notes: '' });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi thêm mới loại văn bản');
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpdate = async () => {
    if (!docEditForm.name.trim()) return alert('Tên loại văn bản không được để trống!');
    
    try {
      setSaving(true);
      const res = await fetch('/api/settings/document-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docEditForm)
      });
      const data = await res.json();
      if (data.success) {
        setDocumentTypes(documentTypes.map(a => a.id === data.data.id ? data.data : a).sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        setDocEditingId(null);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi cập nhật loại văn bản');
    } finally {
      setSaving(false);
    }
  };

  const handleDocDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa loại văn bản này?')) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/settings/document-types?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDocumentTypes(documentTypes.filter(a => a.id !== id));
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa loại văn bản');
    } finally {
      setSaving(false);
    }
  };

  const fetchNormalizeData = async () => {
    setNormalizeLoading(true);
    setNormalizeResult(null);
    try {
      const res = await fetch('/api/settings/agencies/normalize');
      const data = await res.json();
      if (data.success) {
        setNormalizeData(data.data);
        // Khởi tạo mappings từ kết quả phân tích
        const mappings = [
          ...data.data.issuers.map(item => ({
            field: 'issuer',
            original: item.original,
            target_name: item.matched_agency ? item.matched_agency.name : item.original,
            matched_agency: item.matched_agency,
            confidence: item.confidence,
            count: item.count,
            is_already_normalized: item.is_already_normalized,
            enabled: !item.is_already_normalized && item.matched_agency !== null
          })),
          ...data.data.receivers.map(item => ({
            field: 'receiver',
            original: item.original,
            target_name: item.matched_agency ? item.matched_agency.name : item.original,
            matched_agency: item.matched_agency,
            confidence: item.confidence,
            count: item.count,
            is_already_normalized: item.is_already_normalized,
            enabled: !item.is_already_normalized && item.matched_agency !== null
          }))
        ];
        setNormalizeMappings(mappings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNormalizeLoading(false);
    }
  };

  const applyNormalize = async () => {
    const toApply = normalizeMappings.filter(m => m.enabled && m.target_name !== m.original);
    if (toApply.length === 0) return alert('Không có thay đổi nào được chọn!');
    setNormalizeApplying(true);
    try {
      const res = await fetch('/api/settings/agencies/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: toApply })
      });
      const data = await res.json();
      if (data.success) {
        setNormalizeResult(`✅ Đã cập nhật thành công ${data.updated} bản ghi trong database!`);
        // Reload data
        await fetchNormalizeData();
      } else {
        setNormalizeResult(`❌ Lỗi: ${data.error}`);
      }
    } catch (e) {
      setNormalizeResult(`❌ Lỗi kết nối: ${e.message}`);
    } finally {
      setNormalizeApplying(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Cài đặt Hệ thống
        </h2>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-slate-800 shrink-0 mb-6">
        <button 
          onClick={() => setActiveSubTab('document_types')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'document_types' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileText className="w-4 h-4" /> Loại văn bản
        </button>
        <button 
          onClick={() => setActiveSubTab('agencies')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'agencies' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Building2 className="w-4 h-4" /> Nơi phát hành
        </button>
        <button 
          onClick={() => setActiveSubTab('projects')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'projects' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Briefcase className="w-4 h-4" /> Dự án
        </button>
        <button 
          onClick={() => setActiveSubTab('staffs')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'staffs' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <UserCircle className="w-4 h-4" /> Nhân sự
        </button>

        <button 
          onClick={() => setActiveSubTab('system')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'system' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Server className="w-4 h-4" /> Hệ thống
        </button>
        <button 
          onClick={() => setActiveSubTab('migrate')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'migrate' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Database className="w-4 h-4" /> Đồng bộ Tài liệu
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeSubTab === 'projects' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <ProjectListTab />
          </div>
        )}
        
        {activeSubTab === 'staffs' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <StaffListTab />
          </div>
        )}
        
        {activeSubTab === 'document_types' && (
          <>
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-bold text-emerald-500">Danh mục Loại văn bản</h3>
              <div className="flex gap-2">
                <button onClick={fetchDocumentTypes} className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors" title="Làm mới">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button 
                  onClick={() => {
                    setDocIsAdding(true);
                    setDocAddForm({ name: '', display_name: '', notes: '' });
                  }}
                  disabled={docIsAdding}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mới
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 relative">
              <div className="p-0 overflow-x-auto min-h-full">
                <table className="w-full text-left text-sm text-slate-300 border-collapse relative">
                  <thead className="text-slate-400 text-xs uppercase sticky top-0 z-20 shadow-md border-b border-slate-700" style={{ backgroundColor: '#0f172a' }}>
                    <tr>
                      <th className="px-4 py-3 w-16 text-center font-semibold">STT</th>
                      <th className="px-4 py-3 font-semibold">Loại văn bản (Đầy đủ)</th>
                      <th className="px-4 py-3 w-48 font-semibold">Loại VB (hiển thị)</th>
                      <th className="px-4 py-3 w-64 font-semibold">Ghi chú</th>
                      <th className="px-4 py-3 w-28 text-center font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {docIsAdding && (
                      <tr className="bg-emerald-900/20">
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3">
                          <input 
                            autoFocus
                            type="text" 
                            value={docAddForm.name} 
                            onChange={e => setDocAddForm({...docAddForm, name: e.target.value})}
                            placeholder="VD: Quyết định"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={docAddForm.display_name} 
                            onChange={e => setDocAddForm({...docAddForm, display_name: e.target.value})}
                            placeholder="VD: QĐ"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={docAddForm.notes} 
                            onChange={e => setDocAddForm({...docAddForm, notes: e.target.value})}
                            placeholder="Ghi chú..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={handleDocAdd} disabled={saving} className="text-emerald-500 hover:text-emerald-400" title="Lưu">
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setDocIsAdding(false)} disabled={saving} className="text-slate-500 hover:text-slate-300" title="Hủy">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {loading && !documentTypes.length ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Đang tải dữ liệu...
                        </td>
                      </tr>
                    ) : documentTypes.length === 0 && !docIsAdding ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          Chưa có dữ liệu nào. Hãy thêm loại văn bản mới.
                        </td>
                      </tr>
                    ) : (
                      documentTypes.map((dt, idx) => (
                        <tr key={dt.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                          
                          {docEditingId === dt.id ? (
                            <>
                              <td className="px-4 py-3">
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={docEditForm.name} 
                                  onChange={e => setDocEditForm({...docEditForm, name: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="text" 
                                  value={docEditForm.display_name} 
                                  onChange={e => setDocEditForm({...docEditForm, display_name: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="text" 
                                  value={docEditForm.notes} 
                                  onChange={e => setDocEditForm({...docEditForm, notes: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={handleDocUpdate} disabled={saving} className="text-emerald-500 hover:text-emerald-400" title="Lưu">
                                    <Check className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => setDocEditingId(null)} disabled={saving} className="text-slate-500 hover:text-slate-300" title="Hủy">
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium">{dt.name}</td>
                              <td className="px-4 py-3">
                                {dt.display_name ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs border border-emerald-500/20 inline-block font-semibold">
                                    {dt.display_name}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 italic text-xs">Chưa có</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{dt.notes}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setDocEditingId(dt.id);
                                      setDocEditForm({ ...dt });
                                    }} 
                                    className="text-amber-500/70 hover:text-amber-400 transition-colors p-1" 
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDocDelete(dt.id)} 
                                    className="text-red-500/70 hover:text-red-400 transition-colors p-1" 
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeSubTab === 'agencies' && (
          <>
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-bold text-emerald-500">Danh mục Nơi phát hành</h3>
              <div className="flex gap-2">
                <button onClick={fetchAgencies} className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors" title="Làm mới">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button
                  onClick={() => { setShowNormalize(true); fetchNormalizeData(); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-500/30 rounded-lg text-xs font-semibold transition-colors"
                  title="Chuẩn hóa dữ liệu Nơi phát hành trong DB"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Chuẩn hóa DB
                </button>
                <button 
                  onClick={() => {
                    setIsAdding(true);
                    setAddForm({ name: '', abbreviation: '', notes: '' });
                  }}
                  disabled={isAdding}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mới
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 relative">
              <div className="p-0 overflow-x-auto min-h-full">
                <table className="w-full text-left text-sm text-slate-300 border-collapse relative">
                  <thead className="text-slate-400 text-xs uppercase sticky top-0 z-20 shadow-md border-b border-slate-700" style={{ backgroundColor: '#0f172a' }}>
                    <tr>
                      <th className="px-4 py-3 w-16 text-center font-semibold">STT</th>
                      <th className="px-4 py-3 font-semibold">Tên đơn vị (Đầy đủ)</th>
                      <th className="px-4 py-3 w-48 font-semibold">Tên viết tắt (Hiển thị)</th>
                      <th className="px-4 py-3 w-64 font-semibold">Ghi chú</th>
                      <th className="px-4 py-3 w-28 text-center font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isAdding && (
                      <tr className="bg-emerald-900/20">
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3">
                          <input 
                            autoFocus
                            type="text" 
                            value={addForm.name} 
                            onChange={e => setAddForm({...addForm, name: e.target.value})}
                            placeholder="VD: Sở Xây dựng"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={addForm.abbreviation} 
                            onChange={e => setAddForm({...addForm, abbreviation: e.target.value})}
                            placeholder="VD: Sở XD"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={addForm.notes} 
                            onChange={e => setAddForm({...addForm, notes: e.target.value})}
                            placeholder="Ghi chú..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={handleAdd} disabled={saving} className="text-emerald-500 hover:text-emerald-400" title="Lưu">
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsAdding(false)} disabled={saving} className="text-slate-500 hover:text-slate-300" title="Hủy">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {loading && !agencies.length ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Đang tải dữ liệu...
                        </td>
                      </tr>
                    ) : agencies.length === 0 && !isAdding ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          Chưa có dữ liệu nào. Hãy thêm nơi phát hành mới.
                        </td>
                      </tr>
                    ) : (
                      agencies.map((agency, idx) => (
                        <tr key={agency.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                          
                          {editingId === agency.id ? (
                            <>
                              <td className="px-4 py-3">
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={editForm.name} 
                                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="text" 
                                  value={editForm.abbreviation} 
                                  onChange={e => setEditForm({...editForm, abbreviation: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="text" 
                                  value={editForm.notes} 
                                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={handleUpdate} disabled={saving} className="text-emerald-500 hover:text-emerald-400" title="Lưu">
                                    <Check className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 hover:text-slate-300" title="Hủy">
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium">{agency.name}</td>
                              <td className="px-4 py-3">
                                {agency.abbreviation ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs border border-emerald-500/20 inline-block font-semibold">
                                    {agency.abbreviation}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 italic text-xs">Chưa có</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{agency.notes}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingId(agency.id);
                                      setEditForm({ ...agency });
                                    }} 
                                    className="text-amber-500/70 hover:text-amber-400 transition-colors p-1" 
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(agency.id)} 
                                    className="text-red-500/70 hover:text-red-400 transition-colors p-1" 
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}


        {activeSubTab === 'system' && (
          <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
            <Server className="w-16 h-16 text-slate-700" />
            <p>Tính năng Cấu hình Hệ thống đang được phát triển.</p>
          </div>
        )}
      </div>

      {/* Modal Chuẩn hóa dữ liệu */}
      {showNormalize && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-violet-400" /> Chuẩn hóa Dữ liệu Nơi phát hành
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hệ thống phân tích và đề xuất ánh xạ dữ liệu cũ → Tên chuẩn trong danh mục
                </p>
              </div>
              <button onClick={() => { setShowNormalize(false); setNormalizeData(null); setNormalizeResult(null); }} className="p-2 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 px-6 pt-4 shrink-0">
              {[
                { key: 'issuer', label: 'Nơi phát hành (issuer)' },
                { key: 'receiver', label: 'Nơi nhận (receiver)' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setNormalizeTab(t.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${normalizeTab === t.key ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  {t.label}
                  {normalizeData && (
                    <span className="ml-1.5 opacity-60">
                      ({normalizeTab === t.key 
                        ? (normalizeData[t.key === 'issuer' ? 'issuers' : 'receivers'] || []).length 
                        : (normalizeData[t.key === 'issuer' ? 'issuers' : 'receivers'] || []).length} giá trị)
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {normalizeLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                  <span>Đang phân tích dữ liệu...</span>
                </div>
              ) : !normalizeData ? (
                <div className="text-center text-slate-500 py-16">Chưa có dữ liệu.</div>
              ) : (
                <div className="space-y-2">
                  {(normalizeMappings.filter(m => m.field === normalizeTab)).map((m, idx) => {
                    const globalIdx = normalizeMappings.findIndex(x => x.field === m.field && x.original === m.original);
                    const confidenceColor = {
                      'exact': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      'abbreviation': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                      'contains': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      'abbr_contains': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                      'no_match': 'text-red-400 bg-red-500/10 border-red-500/20',
                    }[m.confidence] || '';
                    const confidenceLabel = {
                      'exact': 'Khớp chính xác',
                      'abbreviation': 'Khớp viết tắt',
                      'contains': 'Khớp tên (contains)',
                      'abbr_contains': 'Khớp viết tắt (contains)',
                      'no_match': 'Không tìm thấy',
                    }[m.confidence] || m.confidence;

                    return (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${m.is_already_normalized ? 'border-emerald-900/50 bg-emerald-950/20 opacity-60' : m.confidence === 'no_match' ? 'border-red-900/50 bg-red-950/20' : 'border-slate-800 bg-slate-800/30'}`}>
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          disabled={m.is_already_normalized || m.confidence === 'no_match'}
                          onChange={e => {
                            const updated = [...normalizeMappings];
                            updated[globalIdx] = { ...updated[globalIdx], enabled: e.target.checked };
                            setNormalizeMappings(updated);
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-violet-500 shrink-0"
                        />

                        {/* Original */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-400 mb-0.5">Giá trị gốc trong DB ({m.count} bản ghi):</div>
                          <div className="text-sm font-medium text-slate-200 truncate">{m.original}</div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                        {/* Target */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-400 mb-0.5">Chuẩn hóa thành:</div>
                          {m.is_already_normalized ? (
                            <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã chuẩn
                            </div>
                          ) : m.confidence === 'no_match' ? (
                            <div className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Chưa có trong danh mục
                            </div>
                          ) : (
                            <select
                              value={m.target_name}
                              onChange={e => {
                                const updated = [...normalizeMappings];
                                updated[globalIdx] = { ...updated[globalIdx], target_name: e.target.value };
                                setNormalizeMappings(updated);
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-violet-500 outline-none"
                            >
                              {agencies.map(a => (
                                <option key={a.id} value={a.name}>{a.abbreviation ? `${a.abbreviation} – ${a.name}` : a.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Badge */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${confidenceColor}`}>
                          {confidenceLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 shrink-0 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                {normalizeMappings.filter(m => m.enabled).length} mục được chọn để cập nhật
                {normalizeResult && (
                  <span className={`ml-4 font-semibold ${normalizeResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {normalizeResult}
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={fetchNormalizeData} disabled={normalizeLoading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${normalizeLoading ? 'animate-spin' : ''}`} /> Phân tích lại
                </button>
                <button
                  onClick={applyNormalize}
                  disabled={normalizeApplying || normalizeLoading || normalizeMappings.filter(m => m.enabled).length === 0}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {normalizeApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Áp dụng Chuẩn hóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Đồng bộ Tài liệu ─────────────────────────────────────── */}
      {activeSubTab === 'migrate' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 pr-1">

          {/* Header & Actions */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Database className="w-4 h-4" /> Đồng bộ drive_file_metadata → documents
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Migrate metadata văn bản từ Google Drive vào bảng documents (Supabase)</p>
            </div>
            <button onClick={fetchMigrateStatus} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors" title="Làm mới">
              <RefreshCw className={`w-4 h-4 ${migrateLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Thanh tiến độ tổng quan */}
          {migrateLoading && !migrateStatus && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra trạng thái...
            </div>
          )}

          {migrateStatus && (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">Tiến độ migrate</span>
                <span className="text-xs text-slate-400">
                  {migrateStatus.migrated}/{migrateStatus.total} văn bản
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${migrateStatus.total > 0 ? Math.round(migrateStatus.migrated / migrateStatus.total * 100) : 0}%` }}
                />
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-bold text-slate-200">{migrateStatus.total}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tổng số</div>
                </div>
                <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-bold text-emerald-400">{migrateStatus.migrated}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Đã migrate</div>
                </div>
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-bold text-amber-400">{migrateStatus.pending}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Còn lại</div>
                </div>
              </div>
            </div>
          )}

          {/* Thông báo bảo vệ */}
          <div className="flex items-start gap-2.5 bg-cyan-900/20 border border-cyan-700/30 rounded-xl p-3 shrink-0">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-cyan-300">Bảo vệ dữ liệu tay:</span>{' '}
              Văn bản bạn đã sửa thủ công (<code className="text-amber-300 bg-slate-800 px-1 rounded">manually_edited = true</code>) sẽ <strong>không bị ghi đè</strong>. Chỉ các trường AI điền mới được cập nhật.
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex gap-3 shrink-0 flex-wrap">
            <button
              onClick={runPreview}
              disabled={previewLoading || migrateRunning}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-xl text-sm font-semibold transition-colors"
            >
              {previewLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />}
              Xem trước danh sách
            </button>

            <button
              onClick={runMigrateAll}
              disabled={migrateRunning || migrateLoading || (migrateStatus?.pending === 0)}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
            >
              {migrateRunning
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang migrate...</>
                : <><Database className="w-4 h-4" /> Migrate tất cả ({migrateStatus?.pending ?? '?'} văn bản)</>}
            </button>
          </div>

          {/* Kết quả sau khi chạy */}
          {migrateResult && (
            <div className={`rounded-xl p-4 border shrink-0 ${migrateResult.success ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
              <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${migrateResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {migrateResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {migrateResult.message || migrateResult.error}
              </div>
              {migrateResult.errorCount > 0 && (
                <div className="text-xs text-slate-400 mt-2">
                  <span className="text-red-400 font-medium">{migrateResult.errorCount} lỗi:</span>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    {migrateResult.errors?.map((e, i) => (
                      <li key={i} className="truncate" title={e.file}>{e.file}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Bảng preview từng văn bản */}
          {previewItems && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-xs font-semibold text-slate-400">
                  Danh sách {previewItems.length} văn bản
                </span>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã migrate</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> Chờ migrate</span>
                </div>
              </div>
              <div className="overflow-y-auto rounded-xl border border-slate-700/50 flex-1 min-h-0">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-700/50 z-10">
                    <tr>
                      <th className="text-left px-3 py-2.5 text-slate-400 font-semibold">Tên văn bản</th>
                      <th className="text-left px-3 py-2.5 text-slate-400 font-semibold w-28">Thư mục</th>
                      <th className="text-left px-3 py-2.5 text-slate-400 font-semibold w-20">Ngày</th>
                      <th className="text-center px-3 py-2.5 text-slate-400 font-semibold w-20">Trạng thái</th>
                      <th className="text-center px-3 py-2.5 text-slate-400 font-semibold w-16">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item, idx) => (
                      <tr key={item.file_id}
                        className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${item.already_migrated ? 'opacity-60' : ''}`}
                      >
                        <td className="px-3 py-2 text-slate-300">
                          <div className="flex items-start gap-1.5">
                            {item.manually_edited && (
                              <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" title="Đã sửa tay — được bảo vệ" />
                            )}
                            <span className="truncate max-w-[280px] block" title={item.file_name}>
                              {item.file_name}
                            </span>
                          </div>
                          {item.trich_yeu && item.trich_yeu !== item.file_name && (
                            <div className="text-slate-500 text-[11px] mt-0.5 truncate max-w-[280px]" title={item.trich_yeu}>
                              {item.trich_yeu}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400 truncate max-w-[112px]" title={item.folder_name}>
                          {item.folder_name}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {item.ngay_phat_hanh || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.already_migrated
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/40 text-emerald-400 rounded-full text-[10px] font-medium">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Done
                              </span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded-full text-[10px] font-medium">
                                <Clock className="w-2.5 h-2.5" /> Chờ
                              </span>
                          }
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!item.already_migrated && (
                            <button
                              onClick={() => runMigrateOne(item.file_id, item.file_name)}
                              className="px-2 py-1 bg-cyan-700/30 hover:bg-cyan-600/40 text-cyan-400 rounded-lg text-[10px] font-medium transition-colors"
                              title="Migrate văn bản này"
                            >
                              Migrate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Tab: Đồng bộ Tài liệu — phần AI Analysis ─────────────────── */}
      {activeSubTab === 'migrate' && (
        <div className="shrink-0 mt-4 border-t border-slate-700/50 pt-4 flex flex-col gap-4">

          {/* Header AI section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-violet-400">AI Phân tích nội dung PDF</h3>
                <p className="text-xs text-slate-500">Gemini đọc từng file và trích xuất thông tin chính xác</p>
              </div>
            </div>
            <button onClick={fetchAiStatus} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${!aiStatus && aiRunning ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Trạng thái AI */}
          {aiStatus && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Tổng số', value: aiStatus.total, color: 'text-slate-200', bg: 'bg-slate-800/60' },
                { label: 'Đã phân tích', value: aiStatus.analyzed, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border border-emerald-700/30' },
                { label: 'Chờ phân tích', value: aiStatus.pending, color: 'text-violet-400', bg: 'bg-violet-900/20 border border-violet-700/30' },
                { label: 'Lỗi', value: aiStatus.failed, color: 'text-red-400', bg: 'bg-red-900/20 border border-red-700/30' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar batch hiện tại */}
          {aiRunning && aiProgress.total > 0 && (
            <div className="bg-slate-900/60 border border-violet-700/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-violet-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Đang phân tích...
                </span>
                <span className="text-xs text-slate-400">{aiProgress.current}/{aiProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-700"
                  style={{ width: `${aiProgress.total > 0 ? Math.round(aiProgress.current/aiProgress.total*100) : 0}%` }}
                />
              </div>
              {aiCurrentFile && (
                <div className="mt-2 text-xs text-slate-400 truncate flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0 text-violet-400" />
                  <span className="text-violet-300">[{aiCurrentFile.folder}]</span>
                  <span className="truncate">{aiCurrentFile.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Cài đặt + Nút chạy */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Batch size selector */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Mỗi lần:</span>
              {[5, 10, 20, 50].map(n => (
                <button
                  key={n}
                  onClick={() => setAiBatchLimit(n)}
                  disabled={aiRunning}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    aiBatchLimit === n
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  } disabled:opacity-40`}
                >
                  {n}
                </button>
              ))}
              <span className="text-slate-500">file</span>
            </div>

            {/* Nút Chạy */}
            <button
              onClick={() => startAIAnalysis(false)}
              disabled={aiRunning || (aiStatus?.pending === '0' || aiStatus?.pending === 0)}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
            >
              {aiRunning
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang chạy...</>
                : <><Zap className="w-4 h-4" /> Phân tích {aiBatchLimit} file tiếp theo</>
              }
            </button>

            {/* Nút Thử lại lỗi */}
            {aiStatus?.failed > 0 && (
              <button
                onClick={() => startAIAnalysis(true)}
                disabled={aiRunning}
                className="flex items-center gap-2 px-3 py-2 bg-red-700/20 hover:bg-red-700/30 border border-red-700/40 text-red-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Thử lại {aiStatus.failed} lỗi
              </button>
            )}
          </div>

          {/* Ghi chú rate limit */}
          <div className="flex items-start gap-2 bg-slate-900/40 border border-slate-700/30 rounded-xl p-3 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
            <span>
              Tự động chờ <strong className="text-slate-400">5s</strong> giữa mỗi file để tránh vượt hạn mức Gemini (15 req/phút).
              Khi gặp lỗi 429 → tự động chờ <strong className="text-slate-400">65–195s</strong> rồi tiếp tục.
              Mỗi file được thử lại tối đa <strong className="text-slate-400">3 lần</strong>.
              Dữ liệu tay được bảo vệ <ShieldCheck className="inline w-3 h-3 text-amber-400" />.
            </span>
          </div>

          {/* Log real-time */}
          {aiLogs.length > 0 && (
            <div className="bg-slate-950 border border-slate-700/40 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/60">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5" /> Log phân tích AI
                </span>
                <button onClick={() => setAiLogs([])} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Xóa log</button>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1 font-mono">
                {aiLogs.map((log, i) => (
                  <div key={i} className={`text-[11px] px-2 py-1 rounded flex flex-col gap-0.5 ${
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-amber-400' :
                    log.type === 'complete' ? 'text-cyan-400 font-bold' :
                    'text-slate-400'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-600 shrink-0">[{log.time?.toLocaleTimeString('vi-VN')}]</span>
                      <span className="flex-1 break-all">{log.text}</span>
                    </div>
                    {log.detail && (
                      <div className="pl-14 text-[10px] text-slate-500">{log.detail}</div>
                    )}
                    {log.remaining !== undefined && log.remaining > 0 && (
                      <div className="pl-14 text-[10px] text-violet-400">
                        → Còn {log.remaining} file chờ phân tích. Nhấn "Phân tích tiếp" để tiếp tục.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
