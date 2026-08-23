'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Building2, 
  Trash2 
} from 'lucide-react';

export default function StaffInfoModal({ staff, onClose }) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [agencies, setAgencies] = useState([]);
  
  const [form, setForm] = useState({
    id: '',
    full_name: '',
    short_name: '',
    position: 'Chuyên viên',
    agency_id: '',
    phone: '',
    dob: '',
    email: '',
    avatar_url: '',
    notes: '',
    departments: []
  });

  useEffect(() => {
    fetchDepartments();
    
    if (staff) {
      setForm({
        id: staff.id || '',
        full_name: staff.full_name || '',
        short_name: staff.short_name || '',
        position: staff.position || 'Chuyên viên',
        agency_id: staff.agency_id || '',
        phone: staff.phone || '',
        dob: staff.dob || '',
        email: staff.email || '',
        avatar_url: staff.avatar_url || '',
        notes: staff.notes || '',
        departments: staff.departments || []
      });
    }
  }, [staff]);

  const fetchDepartments = async () => {
    try {
      const [resDept, resAgency] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/settings/agencies')
      ]);
      const dataDept = await resDept.json();
      const dataAgency = await resAgency.json();
      
      if (dataDept.success) setDepartments(dataDept.data || []);
      if (dataAgency.success) setAgencies(dataAgency.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDepartment = (deptId) => {
    if (!deptId) return;
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    
    // Kiểm tra nếu đã tồn tại
    if (form.departments.some(d => d.id === deptId)) return;
    
    setForm(prev => ({
      ...prev,
      departments: [...prev.departments, { id: dept.id, name: dept.name, type: dept.type, role: 'Thành viên' }]
    }));
  };

  const handleUpdateRole = (deptId, newRole) => {
    setForm(prev => ({
      ...prev,
      departments: prev.departments.map(d => 
        d.id === deptId ? { ...d, role: newRole } : d
      )
    }));
  };

  const handleRemoveDepartment = (deptId) => {
    setForm(prev => ({
      ...prev,
      departments: prev.departments.filter(d => d.id !== deptId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return alert('Vui lòng nhập họ và tên nhân sự!');
    
    setLoading(true);
    try {
      const res = await fetch('/api/staffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onClose(true); // Đóng và tải lại danh sách
      } else {
        alert(data.error || 'Lỗi khi lưu thông tin nhân sự');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  // Lọc ra các department chưa được chọn
  const availableDepartments = departments.filter(
    d => !form.departments.some(selected => selected.id === d.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl shadow-emerald-900/20">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            {staff ? `Chỉnh sửa Hồ sơ: ${staff.full_name}` : 'Thêm Nhân sự Mới'}
          </h2>
          <button 
            onClick={() => onClose(false)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Hàng 1: Avatar và Thông tin cơ bản */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Cột trái: Avatar URL */}
              <div className="w-full md:w-1/3 flex flex-col items-center">
                <div className="w-32 h-32 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 overflow-hidden relative flex items-center justify-center mb-3 group shadow-inner">
                  {form.avatar_url ? (
                    <img 
                      src={form.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'; }}
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-500">
                      <User className="w-12 h-12 mx-auto mb-1 opacity-50" />
                      <span className="text-xs">Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">URL Ảnh đại diện</label>
                  <input
                    type="text"
                    name="avatar_url"
                    value={form.avatar_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none truncate font-mono"
                  />
                </div>
              </div>

              {/* Cột phải: Họ tên, Tên viết tắt, Chức vụ, Nơi phát hành */}
              <div className="w-full md:w-2/3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Họ và Tên <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      required
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tên viết tắt</label>
                    <input
                      type="text"
                      name="short_name"
                      value={form.short_name}
                      onChange={handleChange}
                      placeholder="A_NV"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Chức vụ</label>
                    <input
                      type="text"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Chuyên viên, Giám đốc..."
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nơi công tác (Cơ quan)</label>
                    <select
                      name="agency_id"
                      value={form.agency_id}
                      onChange={handleChange}
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Chọn Đơn vị / Cơ quan --</option>
                      {agencies.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.abbreviation ? `[${a.abbreviation}] ${a.name}` : a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Ngày sinh</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        name="dob"
                        value={form.dob}
                        onChange={handleChange}
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="090..."
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="ten@cde-htkt.vn"
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hàng 2: Phân công Tổ / Nhóm */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> Phân công Tổ / Nhóm Chuyên môn
                </label>
                
                {/* Nút thêm Tổ chuyên môn / Nhóm chuyên môn riêng */}
                <div className="flex gap-2">
                  <select 
                    className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 p-1.5 focus:outline-none focus:border-emerald-500 w-36 md:w-40"
                    onChange={(e) => {
                      handleAddDepartment(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Tổ chuyên môn</option>
                    {availableDepartments.filter(d => d.type === 'Tổ').map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>

                  <select 
                    className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 p-1.5 focus:outline-none focus:border-emerald-500 w-36 md:w-40"
                    onChange={(e) => {
                      handleAddDepartment(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Nhóm chuyên môn</option>
                    {availableDepartments.filter(d => d.type === 'Nhóm').map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.departments.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  Nhân sự này chưa thuộc Tổ/Nhóm nào.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2 font-medium">Tổ / Nhóm</th>
                        <th className="px-3 py-2 font-medium w-1/3">Vai trò</th>
                        <th className="px-3 py-2 font-medium w-16 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {form.departments.map(d => (
                        <tr key={d.id}>
                          <td className="px-3 py-2 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] border border-slate-700 bg-slate-800 text-slate-300 font-semibold">
                              {d.type}
                            </span>
                            <span className="font-medium text-white">{d.name}</span>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={d.role}
                              onChange={(e) => handleUpdateRole(d.id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 text-slate-200"
                            >
                              <option value="Thành viên">Thành viên</option>
                              <option value="Tổ trưởng">Tổ trưởng</option>
                              <option value="Tổ phó">Tổ phó</option>
                              <option value="Nhóm trưởng">Nhóm trưởng</option>
                              <option value="Nhóm phó">Nhóm phó</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDepartment(d.id)}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Hàng 3: Ghi chú */}
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Ghi chú thêm</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Ghi chú về chuyên môn, nhiệm vụ được giao..."
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none resize-none"
              ></textarea>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 shrink-0 flex justify-end gap-3 bg-slate-900 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="staff-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Đang lưu...' : 'Lưu Hồ sơ'}
          </button>
        </div>
      </div>
    </div>
  );
}
