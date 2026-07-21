'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Check, X, RefreshCw, Users, Server, Building2, Wand2, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

export default function SettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState('agencies');
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Trạng thái cho Edit/Add
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', abbreviation: '', notes: '' });
  
  // Trạng thái cho Thêm mới
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', abbreviation: '', notes: '' });

  // Trạng thái cho Chuẩn hóa DB
  const [showNormalize, setShowNormalize] = useState(false);
  const [normalizeData, setNormalizeData] = useState(null);
  const [normalizeLoading, setNormalizeLoading] = useState(false);
  const [normalizeApplying, setNormalizeApplying] = useState(false);
  const [normalizeMappings, setNormalizeMappings] = useState([]);
  const [normalizeResult, setNormalizeResult] = useState(null);
  const [normalizeTab, setNormalizeTab] = useState('issuer');

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/agencies');
      const data = await res.json();
      if (data.success) {
        setAgencies(data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách nơi phát hành:', error);
    } finally {
      setLoading(false);
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
        setAgencies([...agencies, data.data].sort((a, b) => a.name.localeCompare(b.name)));
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
        setAgencies(agencies.map(a => a.id === data.data.id ? data.data : a).sort((a, b) => a.name.localeCompare(b.name)));
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
          onClick={() => setActiveSubTab('agencies')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'agencies' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Building2 className="w-4 h-4" /> Nơi phát hành
        </button>
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'users' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-4 h-4" /> Người dùng
        </button>
        <button 
          onClick={() => setActiveSubTab('system')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'system' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Server className="w-4 h-4" /> Hệ thống
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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

        {activeSubTab === 'users' && (
          <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
            <Users className="w-16 h-16 text-slate-700" />
            <p>Tính năng Quản lý Người dùng đang được phát triển.</p>
          </div>
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
    </div>
  );
}
