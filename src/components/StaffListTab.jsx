'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RefreshCw, 
  UserCircle, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  Building2
} from 'lucide-react';
import StaffInfoModal from './StaffInfoModal';
import { useAuth } from '@/context/AuthContext';

export default function StaffListTab() {
  const { isAdmin } = useAuth();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, TO, NHOM
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const fetchStaffs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staffs?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setStaffs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching staffs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân sự này? Thao tác không thể phục hồi!')) return;
    
    try {
      const res = await fetch(`/api/staffs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStaffs(prev => prev.filter(s => s.id !== id));
      } else {
        alert(data.error || 'Lỗi khi xóa nhân sự');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối máy chủ');
    }
  };

  const handleOpenModal = (staff = null) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  const handleModalClose = (needRefresh = false) => {
    setIsModalOpen(false);
    setSelectedStaff(null);
    if (needRefresh) fetchStaffs();
  };

  // Lọc theo từ khóa tìm kiếm
  const filteredStaffs = useMemo(() => {
    return staffs.filter(s => {
      const query = searchTerm.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(query) ||
        s.phone?.includes(query) ||
        s.position?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.departments?.some(d => d.name?.toLowerCase().includes(query))
      );
    });
  }, [staffs, searchTerm]);

  // Gom nhóm danh sách
  const groupedStaffs = useMemo(() => {
    const groups = {};

    if (activeTab === 'ALL') {
      groups['Ban Giám đốc (BGĐ)'] = [];
      groups['Nhóm Chuyên gia'] = [];
      groups['Nhóm Chuyên viên'] = [];
      groups['Khác'] = [];
      
      filteredStaffs.forEach(s => {
        const pos = (s.position || '').toLowerCase();
        if (pos.includes('giám đốc')) groups['Ban Giám đốc (BGĐ)'].push(s);
        else if (pos.includes('chuyên gia')) groups['Nhóm Chuyên gia'].push(s);
        else if (pos.includes('chuyên viên')) groups['Nhóm Chuyên viên'].push(s);
        else groups['Khác'].push(s);
      });
    } else if (activeTab === 'TO') {
      filteredStaffs.forEach(s => {
        const toList = (s.departments || []).filter(d => d.type === 'Tổ');
        if (toList.length === 0) {
          if (!groups['Chưa phân công Tổ']) groups['Chưa phân công Tổ'] = [];
          groups['Chưa phân công Tổ'].push(s);
        } else {
          toList.forEach(to => {
            if (!groups[to.name]) groups[to.name] = [];
            groups[to.name].push(s);
          });
        }
      });
    } else if (activeTab === 'NHOM') {
      filteredStaffs.forEach(s => {
        const nhomList = (s.departments || []).filter(d => d.type === 'Nhóm');
        if (nhomList.length === 0) {
          if (!groups['Chưa phân công Nhóm']) groups['Chưa phân công Nhóm'] = [];
          groups['Chưa phân công Nhóm'].push(s);
        } else {
          nhomList.forEach(nhom => {
            if (!groups[nhom.name]) groups[nhom.name] = [];
            groups[nhom.name].push(s);
          });
        }
      });
    }
    
    return Object.entries(groups)
      .sort((a, b) => {
        if (a[0].startsWith('Chưa phân công') || a[0] === 'Khác') return 1;
        if (b[0].startsWith('Chưa phân công') || b[0] === 'Khác') return -1;
        return 0;
      });
  }, [filteredStaffs, activeTab]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Danh mục Nhân sự Dự án</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {staffs.length} nhân sự
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Quản lý hồ sơ lý lịch, thông tin liên lạc và cơ cấu phân công Tổ/Nhóm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchStaffs()} 
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhân sự</span>
          </button>
        </div>
      </div>

      {/* Search & Grouping Tabs */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/30">
        {/* Tab phân loại */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'ALL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả (Phân loại chức vụ)
          </button>
          <button
            onClick={() => setActiveTab('TO')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'TO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Theo Tổ Chuyên Môn
          </button>
          <button
            onClick={() => setActiveTab('NHOM')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'NHOM' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Theo Nhóm Chuyên Môn
          </button>
        </div>

        {/* Search box */}
        <div className="relative flex-1 sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, chức vụ, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="text-slate-400 uppercase sticky top-0 bg-slate-900 border-b border-slate-800 z-10 text-[11px]">
            <tr>
              <th className="px-3 py-2.5 w-12 text-center font-semibold">STT</th>
              <th className="px-4 py-2.5 font-semibold">Họ và Tên / Chức vụ</th>
              <th className="px-3 py-2.5 w-32 font-semibold">Điện thoại</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-3 py-2.5 w-28 font-semibold">Đơn vị</th>
              <th className="px-4 py-2.5 font-semibold">Tổ / Nhóm Phân công</th>
              <th className="px-3 py-2.5 w-24 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStaffs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  {loading ? 'Đang tải danh sách nhân sự...' : 'Không tìm thấy nhân sự nào phù hợp.'}
                </td>
              </tr>
            ) : (
              (() => {
                let globalIdx = 1;
                const rows = [];

                groupedStaffs.forEach(([groupName, groupStaffs]) => {
                  if (groupStaffs.length === 0) return;
                  
                  // Header Nhóm
                  rows.push(
                    <tr key={`group-header-${groupName}`} className="bg-slate-950/80 border-b border-slate-800/90">
                      <td colSpan={7} className="px-4 py-2 text-emerald-400 font-bold uppercase text-[11px] tracking-wider">
                        {groupName} ({groupStaffs.length})
                      </td>
                    </tr>
                  );

                  // Các dòng nhân sự
                  groupStaffs.forEach((staff, staffIdx) => {
                    const toList = (staff.departments || []).filter(d => d.type === 'Tổ');
                    const nhomList = (staff.departments || []).filter(d => d.type === 'Nhóm');
                    const currentRowIdx = globalIdx++;

                    rows.push(
                      <tr 
                        key={`row-${groupName}-${staff.id || staffIdx}-${currentRowIdx}`} 
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* STT */}
                        <td className="px-3 py-3 text-center text-slate-500 font-mono text-[11px]">
                          {currentRowIdx}
                        </td>

                        {/* Họ tên & Avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {staff.avatar_url ? (
                                <img 
                                  src={staff.avatar_url} 
                                  alt={staff.full_name} 
                                  className="w-9 h-9 rounded-full object-cover border border-slate-700"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.full_name)}&background=1e293b&color=10b981&bold=true`;
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400 font-bold text-xs">
                                  {staff.full_name?.charAt(0) || 'N'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                <span>{staff.full_name}</span>
                                {staff.short_name && (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.2 rounded font-mono">
                                    {staff.short_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {staff.position || 'Chuyên viên'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Điện thoại */}
                        <td className="px-3 py-3 text-slate-300">
                          {staff.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{staff.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">--</span>
                          )}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-slate-300">
                          {staff.email ? (
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] truncate max-w-[200px]">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{staff.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">--</span>
                          )}
                        </td>

                        {/* Đơn vị */}
                        <td className="px-3 py-3">
                          {staff.issuing_agencies?.abbreviation ? (
                            <span className="inline-flex px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] font-medium text-slate-300">
                              {staff.issuing_agencies.abbreviation}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">--</span>
                          )}
                        </td>

                        {/* Tổ / Nhóm */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {toList.map((d, i) => (
                              <span key={`to-badge-${d.id || i}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px]">
                                <span className="text-emerald-400 font-bold">[{d.type}]</span>
                                <span className="text-slate-200 truncate">{d.name}</span>
                                <span className="text-slate-400 font-semibold">({d.role})</span>
                              </span>
                            ))}
                            {nhomList.map((d, i) => (
                              <span key={`nhom-badge-${d.id || i}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px]">
                                <span className="text-cyan-400 font-bold">[{d.type}]</span>
                                <span className="text-slate-200 truncate">{d.name}</span>
                                <span className="text-slate-400 font-semibold">({d.role})</span>
                              </span>
                            ))}
                            {toList.length === 0 && nhomList.length === 0 && (
                              <span className="text-slate-500 italic text-[11px]">Chưa phân công</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => handleOpenModal(staff)} 
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" 
                              title="Sửa hồ sơ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(staff.id)} 
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" 
                              title="Xóa nhân sự"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });

                return rows;
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <StaffInfoModal
          staff={selectedStaff}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
