'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Building2, 
  Server, 
  Briefcase, 
  UserCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Wand2,
  ArrowRight,
  Users,
  ShieldCheck,
  Crown,
  Database,
  Zap,
  FolderOpen,
  Cloud
} from 'lucide-react';
import ProjectListTab from './ProjectListTab';
import StaffListTab from './StaffListTab';
import PermissionsTab from './PermissionsTab';
import { useAuth } from '@/context/AuthContext';

export default function SettingsTab({ 
  currentProjectId, 
  initialSubTab = 'document_types',
  driveSource = 'live_supabase_db',
  realtimeStatus = 'connected'
}) {
  const { isAdmin, role, isAuthenticated, openAuthModal } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
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
  
  // Chuẩn hóa tên nơi phát hành
  const [showNormalize, setShowNormalize] = useState(false);
  const [normalizeData, setNormalizeData] = useState(null);
  const [normalizeLoading, setNormalizeLoading] = useState(false);
  const [normalizeApplying, setNormalizeApplying] = useState(false);
  const [normalizeMappings, setNormalizeMappings] = useState([]);
  const [normalizeResult, setNormalizeResult] = useState(null);
  const [normalizeTab, setNormalizeTab] = useState('issuer');

  useEffect(() => {
    fetchAgencies();
    fetchDocumentTypes();
  }, []);

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

  // ── Thao tác Nơi phát hành (Agencies) ──
  const handleSaveAgency = async (id) => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/agencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm })
      });
      const data = await res.json();
      if (data.success) {
        setAgencies(agencies.map(a => a.id === id ? { ...a, ...editForm } : a));
        setEditingId(null);
      } else {
        alert(data.error || 'Lỗi khi cập nhật nơi phát hành');
      }
    } catch (error) {
      console.error('Lỗi lưu nơi phát hành:', error);
      alert('Lỗi kết nối khi cập nhật nơi phát hành');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAgency = async () => {
    if (!addForm.name.trim()) return;
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
        alert(data.error || 'Lỗi khi thêm nơi phát hành');
      }
    } catch (error) {
      console.error('Lỗi thêm nơi phát hành:', error);
      alert('Lỗi kết nối khi thêm nơi phát hành');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgency = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cơ quan/nơi phát hành này?')) return;
    try {
      const res = await fetch(`/api/settings/agencies?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setAgencies(agencies.filter(a => a.id !== id));
      } else {
        alert(data.error || 'Lỗi khi xóa nơi phát hành');
      }
    } catch (error) {
      console.error('Lỗi xóa nơi phát hành:', error);
      alert('Lỗi kết nối khi xóa nơi phát hành');
    }
  };

  // ── Thao tác Loại văn bản (Document Types) ──
  const handleSaveDocType = async (id) => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/document-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...docEditForm })
      });
      const data = await res.json();
      if (data.success) {
        setDocumentTypes(documentTypes.map(d => d.id === id ? { ...d, ...docEditForm } : d));
        setDocEditingId(null);
      } else {
        alert(data.error || 'Lỗi khi cập nhật loại văn bản');
      }
    } catch (error) {
      console.error('Lỗi lưu loại văn bản:', error);
      alert('Lỗi kết nối khi cập nhật loại văn bản');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocType = async () => {
    if (!docAddForm.name.trim()) return;
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
        alert(data.error || 'Lỗi khi thêm loại văn bản');
      }
    } catch (error) {
      console.error('Lỗi thêm loại văn bản:', error);
      alert('Lỗi kết nối khi thêm loại văn bản');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocType = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa loại văn bản này?')) return;
    try {
      const res = await fetch(`/api/settings/document-types?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDocumentTypes(documentTypes.filter(d => d.id !== id));
      } else {
        alert(data.error || 'Lỗi khi xóa loại văn bản');
      }
    } catch (error) {
      console.error('Lỗi xóa loại văn bản:', error);
      alert('Lỗi kết nối khi xóa loại văn bản');
    }
  };

  // ── Chuẩn hóa nơi phát hành ──
  const fetchNormalizeAnalysis = async () => {
    try {
      setNormalizeLoading(true);
      const res = await fetch('/api/settings/agencies/normalize');
      const data = await res.json();
      if (data.success) {
        setNormalizeData(data);
        const initial = data.unmatched.map(u => ({
          original: u.name,
          target: u.suggestedMatch || u.name,
          count: u.count,
          type: u.type
        }));
        setNormalizeMappings(initial);
      }
    } catch (error) {
      console.error('Lỗi tải phân tích chuẩn hóa:', error);
    } finally {
      setNormalizeLoading(false);
    }
  };

  const applyNormalize = async () => {
    try {
      setNormalizeApplying(true);
      const res = await fetch('/api/settings/agencies/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: normalizeMappings })
      });
      const data = await res.json();
      if (data.success) {
        setNormalizeResult(data);
        fetchNormalizeAnalysis();
      } else {
        alert(data.error || 'Lỗi khi áp dụng chuẩn hóa');
      }
    } catch (error) {
      console.error('Lỗi chuẩn hóa:', error);
      alert('Lỗi kết nối');
    } finally {
      setNormalizeApplying(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Cài đặt Hệ thống</h2>
            <p className="text-xs text-slate-400">Quản lý danh mục loại văn bản, nơi phát hành, nhân sự và dự án</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs điều hướng */}
      <div className="flex items-center gap-4 border-b border-slate-800 mb-4 shrink-0 overflow-x-auto text-xs sm:text-sm">
        <button 
          onClick={() => setActiveSubTab('document_types')}
          className={`pb-2.5 font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'document_types' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Loại văn bản
        </button>

        <button 
          onClick={() => setActiveSubTab('agencies')}
          className={`pb-2.5 font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'agencies' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" /> Nơi phát hành
        </button>

        <button 
          onClick={() => setActiveSubTab('projects')}
          className={`pb-2.5 font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'projects' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Dự án
        </button>

        <button 
          onClick={() => setActiveSubTab('staffs')}
          className={`pb-2.5 font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'staffs' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Nhân sự
        </button>

        <button 
          onClick={() => setActiveSubTab('permissions')}
          className={`pb-2.5 font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'permissions' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" /> Phân quyền
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
            3 Nhóm
          </span>
        </button>

        <button 
          onClick={() => setActiveSubTab('system')}
          className={`pb-2.5 font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'system' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" /> Hệ thống
        </button>
      </div>

      {/* Nội dung Sub-tabs */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ── TAB NHÂN SỰ ── */}
        {activeSubTab === 'staffs' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <StaffListTab />
          </div>
        )}

        {/* ── TAB PHÂN QUYỀN ── */}
        {activeSubTab === 'permissions' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <PermissionsTab />
          </div>
        )}

        {/* ── TAB DỰ ÁN ── */}
        {activeSubTab === 'projects' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <ProjectListTab />
          </div>
        )}
        
        {/* ── TAB LOẠI VĂN BẢN ── */}
        {activeSubTab === 'document_types' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-xs sm:text-sm font-bold text-emerald-400">Danh mục Loại văn bản ({documentTypes.length})</h3>
              <div className="flex gap-2">
                <button onClick={fetchDocumentTypes} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors" title="Làm mới">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button 
                  onClick={() => {
                    setDocIsAdding(true);
                    setDocAddForm({ name: '', display_name: '', notes: '' });
                  }}
                  disabled={docIsAdding}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mới
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead className="text-slate-400 uppercase sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Tên Loại văn bản</th>
                    <th className="py-2.5 px-3 font-semibold">Tên hiển thị</th>
                    <th className="py-2.5 px-3 font-semibold">Ghi chú</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {docIsAdding && (
                    <tr className="bg-slate-800/40 border-b border-emerald-500/30">
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          placeholder="Tên loại VB..." 
                          value={docAddForm.name}
                          onChange={(e) => setDocAddForm({ ...docAddForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          autoFocus
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          placeholder="Tên hiển thị..." 
                          value={docAddForm.display_name}
                          onChange={(e) => setDocAddForm({ ...docAddForm, display_name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          placeholder="Ghi chú..." 
                          value={docAddForm.notes}
                          onChange={(e) => setDocAddForm({ ...docAddForm, notes: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={handleAddDocType} disabled={saving} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDocIsAdding(false)} className="p-1 text-slate-400 hover:bg-slate-700 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {documentTypes.map((dt) => {
                    const isEditing = docEditingId === dt.id;
                    return (
                      <tr key={dt.id} className="hover:bg-slate-800/30">
                        {isEditing ? (
                          <>
                            <td className="py-2 px-3">
                              <input 
                                type="text" 
                                value={docEditForm.name}
                                onChange={(e) => setDocEditForm({ ...docEditForm, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input 
                                type="text" 
                                value={docEditForm.display_name}
                                onChange={(e) => setDocEditForm({ ...docEditForm, display_name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input 
                                type="text" 
                                value={docEditForm.notes}
                                onChange={(e) => setDocEditForm({ ...docEditForm, notes: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => handleSaveDocType(dt.id)} disabled={saving} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDocEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-700 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 font-semibold text-white">{dt.name}</td>
                            <td className="py-2.5 px-3 text-slate-400">{dt.display_name || dt.name}</td>
                            <td className="py-2.5 px-3 text-slate-500 italic">{dt.notes || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setDocEditingId(dt.id);
                                    setDocEditForm({ name: dt.name, display_name: dt.display_name || dt.name, notes: dt.notes || '' });
                                  }}
                                  className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDocType(dt.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB NƠI PHÁT HÀNH ── */}
        {activeSubTab === 'agencies' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-xs sm:text-sm font-bold text-emerald-400">Danh mục Nơi phát hành ({agencies.length})</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setShowNormalize(!showNormalize);
                    if (!showNormalize && !normalizeData) fetchNormalizeAnalysis();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Chuẩn hóa tên
                </button>
                <button onClick={fetchAgencies} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors" title="Làm mới">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button 
                  onClick={() => {
                    setIsAdding(true);
                    setAddForm({ name: '', abbreviation: '', notes: '' });
                  }}
                  disabled={isAdding}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mới
                </button>
              </div>
            </div>

            {/* Bảng danh sách cơ quan */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead className="text-slate-400 uppercase sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Tên Nơi phát hành (Đầy đủ)</th>
                    <th className="py-2.5 px-3 font-semibold">Tên viết tắt</th>
                    <th className="py-2.5 px-3 font-semibold">Ghi chú</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isAdding && (
                    <tr className="bg-slate-800/40 border-b border-emerald-500/30">
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          placeholder="Tên cơ quan đầy đủ..." 
                          value={addForm.name}
                          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          autoFocus
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          placeholder="Viết tắt..." 
                          value={addForm.abbreviation}
                          onChange={(e) => setAddForm({ ...addForm, abbreviation: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          placeholder="Ghi chú..." 
                          value={addForm.notes}
                          onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={handleAddAgency} disabled={saving} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:bg-slate-700 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {agencies.map((a) => {
                    const isEditing = editingId === a.id;
                    return (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        {isEditing ? (
                          <>
                            <td className="py-2 px-3">
                              <input 
                                type="text" 
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input 
                                type="text" 
                                value={editForm.abbreviation}
                                onChange={(e) => setEditForm({ ...editForm, abbreviation: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input 
                                type="text" 
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => handleSaveAgency(a.id)} disabled={saving} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-700 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 font-semibold text-white">{a.name}</td>
                            <td className="py-2.5 px-3 text-cyan-400 font-mono">{a.abbreviation || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-500 italic">{a.notes || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingId(a.id);
                                    setEditForm({ name: a.name, abbreviation: a.abbreviation || '', notes: a.notes || '' });
                                  }}
                                  className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAgency(a.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB HỆ THỐNG ── */}
        {activeSubTab === 'system' && (
          <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
            {/* Thẻ Trạng thái Kết nối & Hạ tầng */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Trạng thái Kết nối & Hạ tầng Kỹ thuật
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                  Thời gian thực (Realtime Status)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Supabase Database */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-cyan-400" /> Cơ sở dữ liệu
                      </span>
                      {driveSource === 'live_supabase_db' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          Local DB
                        </span>
                      )}
                    </div>
                    <div className="text-white font-bold text-xs mb-1">
                      {driveSource === 'live_supabase_db' ? 'Supabase PostgreSQL' : 'Cơ sở dữ liệu Cục bộ'}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Lưu trữ metadata văn bản, tài khoản, phân quyền và kế hoạch đầu tư.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                    Bảng: drive_file_metadata
                  </div>
                </div>

                {/* 2. Realtime SSE Sync */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" /> Đồng bộ Realtime
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${
                        realtimeStatus === 'connected' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        {realtimeStatus === 'connected' ? 'LIVE' : 'Đang kết nối lại'}
                      </span>
                    </div>
                    <div className="text-white font-bold text-xs mb-1">
                      Server-Sent Events (SSE)
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tự động cập nhật tiến độ công việc giữa các máy trạm mà không cần tải lại trang.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                    Luồng: /api/realtime
                  </div>
                </div>

                {/* 3. Google Drive API */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Lưu trữ Tệp lớn
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Hoạt động
                      </span>
                    </div>
                    <div className="text-white font-bold text-xs mb-1">
                      Google Drive API v3
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Lưu trữ và đọc các tệp dữ liệu gốc (PDF, CAD DWG, Excel, Hình ảnh khảo sát).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                    Thư mục: CDE-HTKT Workspace
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin Kiến trúc & Cơ chế vận hành */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-cyan-400" /> Kiến trúc Phân tách Dữ liệu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="font-semibold text-emerald-400 mb-1">Quản lý Metadata & Nghiệp vụ</div>
                  <p className="text-slate-400 leading-relaxed">
                    Thông tin số hiệu văn bản, ngày phát hành, cơ quan, liên kết pháp lý, kế hoạch vốn, tổng mức đầu tư và gói thầu được truy vấn tốc độ cao qua Supabase PostgreSQL.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="font-semibold text-amber-400 mb-1">Lưu trữ Tệp tin & Xem trực tuyến</div>
                  <p className="text-slate-400 leading-relaxed">
                    Tài liệu dung lượng lớn được lưu an toàn trên Google Drive, hỗ trợ trích xuất văn bản tự động (OCR PDF) và mở trực tiếp tệp tin với quyền bảo mật.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
