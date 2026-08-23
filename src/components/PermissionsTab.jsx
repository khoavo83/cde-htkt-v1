'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  KeyRound, 
  User, 
  Plus, 
  Search, 
  RefreshCw, 
  Check, 
  X, 
  Lock, 
  Sparkles, 
  UserCheck, 
  UserX,
  AlertCircle,
  CheckCircle2,
  Users,
  LayoutGrid,
  List
} from 'lucide-react';

export default function PermissionsTab() {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingStaffId, setSavingStaffId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [viewMode, setViewMode] = useState('columns'); // 'columns' | 'table'

  // Modal gán nhanh
  const [quickAssignModal, setQuickAssignModal] = useState({
    open: false,
    targetRole: 'editor' // 'admin' | 'editor' | 'viewer'
  });
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/permissions?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setStaffs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      showToast('Lỗi khi tải dữ liệu phân quyền', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Cập nhật vai trò trực tiếp (1-click)
  const handleRoleChange = async (staff, newRole) => {
    if (!staff.email && !newRole) return;
    
    if (newRole && !staff.email) {
      // Mở modal để nhập email nếu chưa có
      setSelectedStaffId(staff.id);
      setCustomEmail('');
      setQuickAssignModal({ open: true, targetRole: newRole });
      return;
    }

    setSavingStaffId(staff.id);
    try {
      if (newRole === 'none') {
        // Hủy quyền
        const res = await fetch(`/api/permissions?staff_id=${staff.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast(`Đã hủy quyền truy cập của ${staff.full_name}`);
          setStaffs(prev => prev.map(s => s.id === staff.id ? { ...s, role: null, is_active: false } : s));
        } else {
          showToast(data.error || 'Lỗi khi hủy quyền', 'error');
        }
      } else {
        // Gán vai trò
        const res = await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: staff.id,
            email: staff.email,
            role: newRole,
            is_active: true
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || `Đã chuyển ${staff.full_name} sang vai trò [${newRole.toUpperCase()}]`);
          setStaffs(prev => prev.map(s => s.id === staff.id ? { ...s, role: newRole, is_active: true } : s));
        } else {
          showToast(data.error || 'Lỗi khi phân quyền', 'error');
        }
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingStaffId(null);
    }
  };

  // Bật/tắt trạng thái hoạt động
  const handleToggleActive = async (staff) => {
    if (!staff.role) return;
    setSavingStaffId(staff.id);
    try {
      const newStatus = !staff.is_active;
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.id,
          email: staff.email,
          role: staff.role,
          is_active: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(newStatus ? `Đã kích hoạt tài khoản ${staff.full_name}` : `Đã tạm khóa tài khoản ${staff.full_name}`);
        setStaffs(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: newStatus } : s));
      } else {
        showToast(data.error || 'Lỗi cập nhật trạng thái', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setSavingStaffId(null);
    }
  };

  // Lưu gán nhanh từ Modal
  const handleQuickAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) return alert('Vui lòng chọn nhân sự!');

    const targetStaff = staffs.find(s => s.id === selectedStaffId);
    const emailToUse = customEmail.trim() || targetStaff?.email;

    if (!emailToUse) {
      return alert('Nhân sự này bắt buộc phải có Email để đăng nhập!');
    }

    setSavingStaffId(selectedStaffId);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          email: emailToUse,
          role: quickAssignModal.targetRole,
          password: customPassword.trim() || 'Admin@123456',
          is_active: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã gán vai trò [${quickAssignModal.targetRole.toUpperCase()}] thành công!`);
        setQuickAssignModal({ open: false, targetRole: 'editor' });
        setSelectedStaffId('');
        setCustomPassword('');
        setCustomEmail('');
        fetchPermissions();
      } else {
        showToast(data.error || 'Lỗi khi phân quyền', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingStaffId(null);
    }
  };

  // Phân chia 3 nhóm
  const admins = useMemo(() => staffs.filter(s => s.role === 'admin'), [staffs]);
  const editors = useMemo(() => staffs.filter(s => s.role === 'editor'), [staffs]);
  const viewers = useMemo(() => staffs.filter(s => s.role === 'viewer'), [staffs]);
  const unassigned = useMemo(() => staffs.filter(s => !s.role), [staffs]);

  // Lọc tìm kiếm
  const filteredStaffs = useMemo(() => {
    if (!searchTerm.trim()) return staffs;
    const q = searchTerm.toLowerCase();
    return staffs.filter(s => 
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.position?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  }, [staffs, searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30 rounded-2xl border border-slate-800 overflow-hidden relative">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'error' 
            ? 'bg-red-950/90 border-red-500/40 text-red-300' 
            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Phân quyền Người dùng theo Vai trò</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                3 Cấp Quyền
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Lấy danh sách nhân sự và gán vai trò: Quản trị viên, Chuyên viên hoặc Người xem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('columns')}
              className={`p-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === 'columns' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem 3 Nhóm Cột"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3 Nhóm Cột</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem Bảng Danh sách"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bảng Danh sách</span>
            </button>
          </div>

          <button 
            onClick={() => fetchPermissions()} 
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: XEM 3 CỘT NHÓM (COLUMNS VIEW) */}
      {viewMode === 'columns' && (
        <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
          {/* 3 Cột Quyền Hạn */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* CỘT 1: ADMIN (QUẢN TRỊ VIÊN) */}
            <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-4 flex flex-col shadow-lg shadow-amber-950/10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      1. Quản trị viên (Admin)
                    </h3>
                    <span className="text-[10px] text-slate-400 block">Toàn quyền hệ thống & phân quyền</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {admins.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1">
                {admins.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-800 rounded-xl">
                    Chưa có quản trị viên nào.
                  </div>
                ) : (
                  admins.map(staff => (
                    <div key={`admin-${staff.id}`} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between gap-2 group">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{staff.full_name}</span>
                          {staff.short_name && (
                            <span className="text-[9px] px-1 rounded bg-amber-950/50 text-amber-400 font-mono">
                              {staff.short_name}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{staff.email || 'Chưa có email'}</div>
                      </div>

                      {/* Dropdown đổi nhanh */}
                      <select
                        value="admin"
                        disabled={savingStaffId === staff.id}
                        onChange={(e) => handleRoleChange(staff, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-amber-400 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="admin">👑 Admin</option>
                        <option value="editor">✏️ Chuyên viên</option>
                        <option value="viewer">👁️ Người xem</option>
                        <option value="none">❌ Hủy quyền</option>
                      </select>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedStaffId('');
                  setQuickAssignModal({ open: true, targetRole: 'admin' });
                }}
                className="mt-3 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Quản trị viên</span>
              </button>
            </div>

            {/* CỘT 2: EDITOR (CHUYÊN VIÊN) */}
            <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-4 flex flex-col shadow-lg shadow-emerald-950/10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      2. Chuyên viên (Editor)
                    </h3>
                    <span className="text-[10px] text-slate-400 block">Nhập liệu, cập nhật tiến độ, AI</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {editors.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1">
                {editors.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-800 rounded-xl">
                    Chưa có chuyên viên nào.
                  </div>
                ) : (
                  editors.map(staff => (
                    <div key={`editor-${staff.id}`} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-2 group">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{staff.full_name}</span>
                          {staff.short_name && (
                            <span className="text-[9px] px-1 rounded bg-emerald-950/50 text-emerald-400 font-mono">
                              {staff.short_name}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{staff.email || 'Chưa có email'}</div>
                      </div>

                      {/* Dropdown đổi nhanh */}
                      <select
                        value="editor"
                        disabled={savingStaffId === staff.id}
                        onChange={(e) => handleRoleChange(staff, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-emerald-400 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="admin">👑 Admin</option>
                        <option value="editor">✏️ Chuyên viên</option>
                        <option value="viewer">👁️ Người xem</option>
                        <option value="none">❌ Hủy quyền</option>
                      </select>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedStaffId('');
                  setQuickAssignModal({ open: true, targetRole: 'editor' });
                }}
                className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Chuyên viên</span>
              </button>
            </div>

            {/* CỘT 3: VIEWER (NGƯỜI XEM) */}
            <div className="bg-slate-950/60 border border-cyan-500/30 rounded-2xl p-4 flex flex-col shadow-lg shadow-cyan-950/10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      3. Người xem (Viewer)
                    </h3>
                    <span className="text-[10px] text-slate-400 block">Tra cứu văn bản & tiến độ (Read-only)</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {viewers.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1">
                {viewers.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-800 rounded-xl">
                    Chưa có người xem nào.
                  </div>
                ) : (
                  viewers.map(staff => (
                    <div key={`viewer-${staff.id}`} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-2 group">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{staff.full_name}</span>
                          {staff.short_name && (
                            <span className="text-[9px] px-1 rounded bg-cyan-950/50 text-cyan-400 font-mono">
                              {staff.short_name}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{staff.email || 'Chưa có email'}</div>
                      </div>

                      {/* Dropdown đổi nhanh */}
                      <select
                        value="viewer"
                        disabled={savingStaffId === staff.id}
                        onChange={(e) => handleRoleChange(staff, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-cyan-400 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="admin">👑 Admin</option>
                        <option value="editor">✏️ Chuyên viên</option>
                        <option value="viewer">👁️ Người xem</option>
                        <option value="none">❌ Hủy quyền</option>
                      </select>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedStaffId('');
                  setQuickAssignModal({ open: true, targetRole: 'viewer' });
                }}
                className="mt-3 w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Người xem</span>
              </button>
            </div>

          </div>

          {/* Danh sách nhân sự chưa phân quyền (Phía dưới) */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Nhân sự Chưa Cấp Quyền ({unassigned.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Chọn vai trò để cấp quyền đăng nhập tức thì cho nhân sự
              </span>
            </div>

            {unassigned.length === 0 ? (
              <div className="text-xs text-emerald-400 font-medium p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-center">
                ✨ Toàn bộ nhân sự trong danh sách đã được phân quyền đầy đủ!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {unassigned.map(staff => (
                  <div key={`unassigned-${staff.id}`} className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-white truncate">{staff.full_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{staff.position || 'Chuyên viên'}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{staff.email || 'Chưa có email'}</div>
                    </div>

                    <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => handleRoleChange(staff, 'editor')}
                        disabled={savingStaffId === staff.id}
                        className="flex-1 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                        title="Gán quyền Chuyên viên"
                      >
                        + Chuyên viên
                      </button>
                      <button
                        onClick={() => handleRoleChange(staff, 'viewer')}
                        disabled={savingStaffId === staff.id}
                        className="flex-1 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg text-[10px] font-bold border border-cyan-500/30 transition-colors cursor-pointer"
                        title="Gán quyền Người xem"
                      >
                        + Người xem
                      </button>
                      <button
                        onClick={() => handleRoleChange(staff, 'admin')}
                        disabled={savingStaffId === staff.id}
                        className="py-1 px-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                        title="Gán quyền Admin"
                      >
                        👑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: XEM BẢNG DANH SÁCH (TABLE VIEW) */}
      {viewMode === 'table' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/40">
            <div className="relative max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nhân sự theo tên, email, chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="text-slate-400 uppercase sticky top-0 bg-slate-900 border-b border-slate-800 z-10 text-[11px]">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center font-semibold">STT</th>
                  <th className="px-4 py-2.5 font-semibold">Họ và Tên Nhân sự</th>
                  <th className="px-3 py-2.5 font-semibold">Chức vụ</th>
                  <th className="px-4 py-2.5 font-semibold">Email Đăng nhập</th>
                  <th className="px-4 py-2.5 font-semibold w-48">Phân quyền Vai trò</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStaffs.map((staff, idx) => (
                  <tr key={`perm-row-${staff.id}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{staff.full_name}</span>
                        {staff.short_name && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded font-mono">
                            {staff.short_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{staff.position || 'Chuyên viên'}</td>
                    <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{staff.email || <span className="text-slate-600 italic">Chưa có email</span>}</td>
                    
                    {/* Dropdown Phân quyền trực tiếp */}
                    <td className="px-4 py-3">
                      <select
                        value={staff.role || 'none'}
                        disabled={savingStaffId === staff.id}
                        onChange={(e) => handleRoleChange(staff, e.target.value)}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer focus:outline-none ${
                          staff.role === 'admin' 
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' 
                            : staff.role === 'editor'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : staff.role === 'viewer'
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <option value="none">⚪ Chưa cấp quyền (Chặn)</option>
                        <option value="admin">👑 Quản trị viên (Admin)</option>
                        <option value="editor">✏️ Chuyên viên (Editor)</option>
                        <option value="viewer">👁️ Người xem (Viewer)</option>
                      </select>
                    </td>

                    {/* Trạng thái Bật/Tắt */}
                    <td className="px-3 py-3 text-center">
                      {staff.role ? (
                        <button
                          onClick={() => handleToggleActive(staff)}
                          disabled={savingStaffId === staff.id}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            staff.is_active 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' 
                              : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                          }`}
                        >
                          {staff.is_active ? '🟢 Hoạt động' : '🔴 Đã khóa'}
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px] italic">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL GÁN NHANH NHÂN SỰ VÀO NHÓM */}
      {quickAssignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {quickAssignModal.targetRole === 'admin' && <Crown className="w-4 h-4 text-amber-400" />}
                {quickAssignModal.targetRole === 'editor' && <KeyRound className="w-4 h-4 text-emerald-400" />}
                {quickAssignModal.targetRole === 'viewer' && <User className="w-4 h-4 text-cyan-400" />}
                <span>
                  Gán Quyền: {quickAssignModal.targetRole === 'admin' ? 'Quản trị viên' : quickAssignModal.targetRole === 'editor' ? 'Chuyên viên' : 'Người xem'}
                </span>
              </h3>
              <button 
                onClick={() => setQuickAssignModal({ open: false, targetRole: 'editor' })}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAssignSubmit} className="space-y-4">
              {/* Chọn Nhân sự */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chọn Nhân sự từ danh sách <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    const st = staffs.find(s => s.id === e.target.value);
                    if (st) setCustomEmail(st.email || '');
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Chọn Cán bộ / Nhân sự --</option>
                  {staffs.map(s => (
                    <option key={`opt-${s.id}`} value={s.id}>
                      {s.full_name} ({s.position || 'Chuyên viên'}) {s.role ? `[Đang là: ${s.role.toUpperCase()}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Đăng nhập */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Đăng nhập <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="canbo@cde-htkt.vn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Mật khẩu khởi tạo */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Mật khẩu Đăng nhập
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomPassword('Cde@' + Math.floor(100000 + Math.random() * 900000))}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Tạo ngẫu nhiên
                  </button>
                </div>
                <input
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Mặc định: Admin@123456"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickAssignModal({ open: false, targetRole: 'editor' })}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingStaffId !== null}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {savingStaffId ? 'Đang lưu...' : 'Xác nhận Gán Quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
