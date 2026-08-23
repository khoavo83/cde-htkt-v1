'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDateVN } from '@/lib/formatters';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Edit3, 
  Trash2, 
  Search, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Unlock,
  Link as LinkIcon,
  Crown,
  Briefcase,
  UserCheck,
  UserX,
  Mail
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function UserManagementTab() {
  const { session, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'viewer',
    staff_id: '',
    password: '',
    is_active: true
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  const fetchStaffs = React.useCallback(async () => {
    try {
      const res = await fetch('/api/staffs');
      const data = await res.json();
      if (data.success) {
        setStaffs(data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhân sự:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStaffs();
  }, [fetchUsers, fetchStaffs]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'viewer',
      staff_id: '',
      password: '',
      is_active: true
    });
    setModalError('');
    setModalSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      staff_id: user.staff_id || '',
      password: '',
      is_active: user.is_active !== false
    });
    setModalError('');
    setModalSuccess('');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);

    try {
      if (editingUser) {
        // Cập nhật thông tin và vai trò người dùng
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            role: formData.role,
            staff_id: formData.staff_id || null,
            is_active: formData.is_active
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Cập nhật thất bại');

        setModalSuccess('Cập nhật người dùng thành công!');
        await fetchUsers();
        setTimeout(() => setIsModalOpen(false), 800);
      } else {
        // Thêm tài khoản mới qua Supabase Auth
        if (!formData.email || !formData.password || !formData.full_name) {
          throw new Error('Vui lòng điền đầy đủ Email, Họ tên và Mật khẩu!');
        }

        const { supabase } = await import('@/lib/supabase');
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password.trim(),
          options: {
            data: {
              full_name: formData.full_name.trim(),
              role: formData.role
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Gán staff_id nếu có
          await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({
              id: authData.user.id,
              email: formData.email.trim(),
              full_name: formData.full_name.trim(),
              role: formData.role,
              staff_id: formData.staff_id || null,
              is_active: formData.is_active
            })
          });
        }

        setModalSuccess('Tạo tài khoản người dùng mới thành công!');
        await fetchUsers();
        setTimeout(() => setIsModalOpen(false), 800);
      }
    } catch (err) {
      setModalError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser?.id) {
      alert('Bạn không thể khóa tài khoản của chính mình!');
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          is_active: !user.is_active
        })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
      } else {
        alert(data.error || 'Lỗi cập nhật trạng thái');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert('Bạn không thể xóa tài khoản của chính mình!');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.full_name} (${user.email})"? Thao tác này không thể hoàn tác!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        alert(data.error || 'Lỗi khi xóa người dùng');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ');
    }
  };

  // Filter
  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.staff_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchRole = roleFilter === 'all' || u.role === roleFilter;

    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Danh sách Người dùng & Phân quyền Truy cập
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý tài khoản, gán vai trò (Admin, Chuyên viên, Người xem) và liên kết với hồ sơ nhân sự.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs flex items-center gap-1.5"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Thêm tài khoản mới
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, nhân sự..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="admin">👑 Quản trị viên (Admin)</option>
          <option value="editor">✏️ Chuyên viên (Editor)</option>
          <option value="viewer">👁️ Người xem (Viewer)</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Người dùng</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-4">Nhân sự liên kết</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-md shrink-0">
                            {u.full_name ? u.full_name.charAt(0) : u.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {u.full_name || 'Chưa đặt tên'}
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Tạo ngày: {formatDateVN(u.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            <Crown className="w-3 h-3" />
                            QUẢN TRỊ VIÊN
                          </span>
                        ) : u.role === 'editor' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <Edit3 className="w-3 h-3" />
                            CHUYÊN VIÊN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700/40 border border-slate-600/40 text-slate-300">
                            <Eye className="w-3 h-3" />
                            NGƯỜI XEM
                          </span>
                        )}
                      </td>

                      {/* Linked Staff */}
                      <td className="py-3 px-4">
                        {u.staff_name ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Briefcase className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <div>
                              <span className="font-semibold text-white">{u.staff_name}</span>
                              {u.staff_position && (
                                <span className="text-[10px] text-slate-400 block">{u.staff_position}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Chưa liên kết</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            u.is_active !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                          } ${isCurrent ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Không thể khóa chính mình' : 'Bấm để đổi trạng thái'}
                        >
                          {u.is_active !== false ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              Đã khóa
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 bg-slate-800 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors"
                            title="Sửa quyền & hồ sơ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400'
                            }`}
                            title={isCurrent ? 'Không thể xóa chính mình' : 'Xóa tài khoản'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal Thêm / Sửa Người dùng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {editingUser ? 'Cập nhật Người dùng & Vai trò' : 'Thêm Tài khoản Người dùng Mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Địa chỉ Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  placeholder="name@cde-htkt.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 ${
                    editingUser ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Họ và tên <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Password (Chỉ khi tạo mới) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mật khẩu khởi tạo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vai trò Phân quyền <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'admin', label: '👑 Admin', desc: 'Toàn quyền hệ thống' },
                    { id: 'editor', label: '✏️ Editor', desc: 'Nhập liệu & Tiến độ' },
                    { id: 'viewer', label: '👁️ Viewer', desc: 'Chỉ tra cứu & Xem' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        formData.role === r.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link with Staff */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Liên kết với Hồ sơ Nhân sự
                </label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Không liên kết --</option>
                  {staffs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.position ? `(${s.position})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Giúp hệ thống tự động gán KPI và theo dõi văn bản phân công cho tài khoản này.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Trạng thái tài khoản</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {modalLoading ? 'Đang lưu...' : editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
