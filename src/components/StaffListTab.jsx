'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, RefreshCw, UserCircle, Users, Mail, Phone, Calendar } from 'lucide-react';
import StaffInfoModal from './StaffInfoModal';

export default function StaffListTab() {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, TO, NHOM
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    fetchStaffs();
  }, []);

  const fetchStaffs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staffs');
      const data = await res.json();
      if (data.success) {
        setStaffs(data.data);
      }
    } catch (error) {
      console.error('Error fetching staffs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân sự này? Thao tác không thể phục hồi!')) return;
    
    try {
      const res = await fetch(`/api/staffs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStaffs(staffs.filter(s => s.id !== id));
      } else {
        alert(data.error || 'Lỗi khi xóa');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối');
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

  // Filter
  const filteredStaffs = staffs.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm) ||
    s.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.departments?.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedStaffs = (() => {
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
          if (!groups['Chưa phân công']) groups['Chưa phân công'] = [];
          groups['Chưa phân công'].push(s);
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
          if (!groups['Chưa phân công']) groups['Chưa phân công'] = [];
          groups['Chưa phân công'].push(s);
        } else {
          nhomList.forEach(nhom => {
            if (!groups[nhom.name]) groups[nhom.name] = [];
            groups[nhom.name].push(s);
          });
        }
      });
    }
    
    // Sort groups and staffs
    const sortedGroups = Object.entries(groups)
      .sort((a, b) => {
        if (a[0] === 'Chưa phân công' || a[0] === 'Khác') return 1;
        if (b[0] === 'Chưa phân công' || b[0] === 'Khác') return -1;
        
        // Sort Ban giám đốc lên đầu nếu là tab ALL
        if (activeTab === 'ALL') {
          if (a[0] === 'Ban Giám đốc (BGĐ)') return -1;
          if (b[0] === 'Ban Giám đốc (BGĐ)') return 1;
        }
        
        return a[0].localeCompare(b[0], 'vi', { numeric: true });
      })
      .map(([gName, gStaffs]) => {
        // Hàm so sánh tên theo Tên (từ cuối cùng) rồi mới đến Họ lót
        const compareName = (n1, n2) => {
          const s1 = (n1 || '').trim();
          const s2 = (n2 || '').trim();
          const p1 = s1.split(' ');
          const p2 = s2.split(' ');
          const firstName1 = p1.length > 0 ? p1[p1.length - 1] : '';
          const firstName2 = p2.length > 0 ? p2[p2.length - 1] : '';
          
          const cmp = firstName1.localeCompare(firstName2, 'vi');
          if (cmp !== 0) return cmp;
          
          const lastName1 = p1.slice(0, -1).join(' ');
          const lastName2 = p2.slice(0, -1).join(' ');
          return lastName1.localeCompare(lastName2, 'vi');
        };

        gStaffs.sort((s1, s2) => {
          const getPosWeight = (pos) => {
            const p = (pos || '').toLowerCase();
            if (p === 'giám đốc' || (p.includes('giám đốc') && !p.includes('phó'))) return 1;
            if (p.includes('phó giám đốc')) return 2;
            if (p.includes('chuyên gia')) return 3;
            if (p.includes('chuyên viên')) return 4;
            return 5;
          };

          const w1 = getPosWeight(s1.position);
          const w2 = getPosWeight(s2.position);
          
          if (w1 !== w2) return w1 - w2;

          // Nếu cùng chức vụ ở công ty, thì xét thêm chức danh (Trưởng/Phó) trong Tổ/Nhóm nếu đang ở tab TO/NHOM
          if (activeTab !== 'ALL') {
            const getRoleWeight = (s) => {
              const r = ((s.departments || []).find(d => d.name === gName)?.role || '').toLowerCase();
              if (r.includes('trưởng')) return 1;
              if (r.includes('phó')) return 2;
              return 3;
            };
            const rw1 = getRoleWeight(s1);
            const rw2 = getRoleWeight(s2);
            if (rw1 !== rw2) return rw1 - rw2;
          }

          // Cuối cùng là sắp xếp theo Tên ABC
          return compareName(s1.full_name, s2.full_name);
        });
        return [gName, gStaffs];
      });
      
    return sortedGroups;
  })();

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex flex-col gap-4 mb-4 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 w-1/3 min-w-[250px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Tìm kiếm nhân sự, số điện thoại, phòng ban..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={fetchStaffs} 
              className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700" 
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/20"
            >
              <Plus className="w-4 h-4" /> Thêm Nhân sự
            </button>
          </div>
        </div>
        
        {/* Tabs Điều hướng Nhóm */}
        <div className="flex gap-4 border-b border-slate-700/50 px-1">
          <button onClick={() => setActiveTab('ALL')} className={`pb-2 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'ALL' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>Theo Chức vụ</button>
          <button onClick={() => setActiveTab('TO')} className={`pb-2 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'TO' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>Theo Tổ chuyên môn</button>
          <button onClick={() => setActiveTab('NHOM')} className={`pb-2 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'NHOM' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>Theo Nhóm chuyên môn</button>
        </div>
      </div>

      {/* Danh sách - Table/Grid view */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 relative">
        {loading && !staffs.length ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
            <p>Đang tải dữ liệu nhân sự...</p>
          </div>
        ) : (
          <>
            {/* --- Desktop View (Table) --- */}
            <div className="hidden md:block p-0 min-h-full">
              <table className="w-full text-left text-sm text-slate-300 border-collapse relative">
                <thead className="text-slate-400 text-xs uppercase sticky top-0 z-20 shadow-md border-b border-slate-700" style={{ backgroundColor: '#0f172a' }}>
                  <tr>
                    <th className="px-4 py-3 w-12 text-center font-semibold">STT</th>
                    <th className="px-4 py-3 font-semibold">Nhân sự</th>
                    <th className="px-4 py-3 w-28 font-semibold">Ngày sinh</th>
                    <th className="px-4 py-3 w-36 font-semibold">Điện thoại</th>
                    <th className="px-4 py-3 w-40 font-semibold">Email</th>
                    <th className="px-4 py-3 w-32 font-semibold">Phòng ban</th>
                    <th className="px-4 py-3 w-56 font-semibold">Tổ chuyên môn</th>
                    <th className="px-4 py-3 w-56 font-semibold">Nhóm chuyên môn</th>
                    <th className="px-4 py-3 w-24 text-center font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStaffs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                        Không tìm thấy nhân sự nào.
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
                          <tr key={`group-${groupName}`} className="bg-slate-800/80 border-b border-slate-700">
                            <td colSpan="9" className="px-4 py-2 text-emerald-400 font-bold uppercase text-xs tracking-wider">
                              {groupName} ({groupStaffs.length})
                            </td>
                          </tr>
                        );

                        // Các dòng nhân sự trong nhóm
                        groupStaffs.forEach(staff => {
                          const toList = (staff.departments || []).filter(d => d.type === 'Tổ');
                          const nhomList = (staff.departments || []).filter(d => d.type === 'Nhóm');

                          rows.push(
                            <tr key={`${groupName}-${staff.id}`} className="hover:bg-slate-800/30 transition-colors group">
                              <td className="px-4 py-3 text-center text-slate-500 font-medium">{globalIdx++}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {staff.avatar_url ? (
                                    <img src={staff.avatar_url} alt={staff.full_name} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                                      <UserCircle className="w-5 h-5 text-slate-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-200 truncate">
                                      {staff.full_name}
                                      {staff.short_name && <span className="text-emerald-400/80 font-normal ml-1.5 inline-block bg-emerald-950/30 px-1.5 rounded border border-emerald-800/50 text-[11px] uppercase tracking-wider">{staff.short_name}</span>}
                                    </div>
                                    <div className="text-xs text-emerald-500/80 font-medium truncate">{staff.position || 'Chưa cập nhật'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {staff.dob ? (
                                  <div className="flex items-center gap-1.5 whitespace-nowrap"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {staff.dob}</div>
                                ) : <span className="italic text-slate-500 text-xs">Chưa có</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-xs">
                                {staff.phone ? (
                                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {staff.phone}</div>
                                ) : <span className="italic text-slate-500">--</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-xs">
                                {staff.email ? (
                                  <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> <span className="truncate">{staff.email}</span></div>
                                ) : <span className="italic text-slate-500">--</span>}
                              </td>
                              
                              <td className="px-4 py-3 font-medium text-slate-200">
                                {staff.issuing_agencies?.abbreviation ? (
                                  <span className="inline-flex px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
                                    {staff.issuing_agencies.abbreviation}
                                  </span>
                                ) : <span className="italic text-slate-500 text-xs">--</span>}
                              </td>

                              {/* Cột Tổ chuyên môn */}
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-1.5">
                                  {toList.length > 0 ? (
                                    toList.map((d, i) => (
                                      <span key={i} className="inline-flex flex-col p-1.5 rounded bg-slate-800/60 border border-slate-700/50">
                                        <span className="text-slate-200 font-medium leading-tight">{d.name}</span>
                                        <span className="text-emerald-500 text-[10px] uppercase font-bold">{d.role}</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-500 italic">--</span>
                                  )}
                                </div>
                              </td>

                              {/* Cột Nhóm chuyên môn */}
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-1.5">
                                  {nhomList.length > 0 ? (
                                    nhomList.map((d, i) => (
                                      <span key={i} className="inline-flex flex-col p-1.5 rounded bg-slate-800/60 border border-slate-700/50">
                                        <span className="text-slate-200 font-medium leading-tight">{d.name}</span>
                                        <span className="text-emerald-500 text-[10px] uppercase font-bold">{d.role}</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-500 italic">--</span>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center align-middle">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenModal(staff)} className="text-amber-500/70 hover:text-amber-400 transition-colors p-1" title="Sửa">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(staff.id)} className="text-red-500/70 hover:text-red-400 transition-colors p-1" title="Xóa">
                                    <Trash2 className="w-4 h-4" />
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

            {/* --- Mobile View (Grid Cards) --- */}
            <div className="md:hidden flex flex-col gap-6 p-4">
              {groupedStaffs.map(([groupName, groupStaffs]) => {
                if (groupStaffs.length === 0) return null;
                return (
                  <div key={`mob-group-${groupName}`}>
                    <h3 className="text-emerald-400 font-bold uppercase text-sm mb-3 pl-2 border-l-2 border-emerald-500">
                      {groupName} ({groupStaffs.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {groupStaffs.map(staff => {
                        const toList = (staff.departments || []).filter(d => d.type === 'Tổ');
                        const nhomList = (staff.departments || []).filter(d => d.type === 'Nhóm');
                        
                        return (
                          <div key={`${groupName}-${staff.id}`} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col hover:border-slate-600 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex gap-3 items-center">
                                {staff.avatar_url ? (
                                  <img src={staff.avatar_url} alt={staff.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600">
                                    <UserCircle className="w-6 h-6 text-slate-400" />
                                  </div>
                                )}
                                <div>
                                <h4 className="font-semibold text-slate-200 text-base flex flex-wrap items-center gap-1.5">
                                  {staff.full_name}
                                  {staff.short_name && <span className="text-emerald-400/80 font-normal inline-block bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-800/50 text-[10px] uppercase tracking-wider">{staff.short_name}</span>}
                                </h4>
                                  <p className="text-xs text-emerald-400 font-medium">{staff.position || 'Chưa cập nhật chức vụ'}</p>
                                </div>
                              </div>
                              
                              <div className="flex opacity-100">
                                <button 
                                  onClick={() => handleOpenModal(staff)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                                  title="Sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(staff.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4 text-sm text-slate-300 flex-1">
                              {staff.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  {staff.phone}
                                </div>
                              )}
                              {staff.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="truncate">{staff.email}</span>
                                </div>
                              )}
                              {staff.dob && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  {staff.dob}
                                </div>
                              )}
                            </div>

                            {/* Tổ / Nhóm */}
                            <div className="mt-auto pt-3 border-t border-slate-700/50 space-y-2">
                              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Phòng ban: <span className="text-slate-200 font-medium ml-1">{staff.issuing_agencies?.abbreviation || '--'}</span></div>
                              {toList.length > 0 && (
                                <div>
                                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Tổ chuyên môn:</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {toList.map((d, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 text-xs border border-slate-600">
                                        <span className="text-slate-200">{d.name}</span>
                                        <span className="text-emerald-500/80 font-semibold">({d.role})</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {nhomList.length > 0 && (
                                <div>
                                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Nhóm chuyên môn:</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {nhomList.map((d, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 text-xs border border-slate-600">
                                        <span className="text-slate-200">{d.name}</span>
                                        <span className="text-emerald-500/80 font-semibold">({d.role})</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {toList.length === 0 && nhomList.length === 0 && (
                                <div className="text-xs text-slate-500 italic">Chưa phân công Tổ/Nhóm</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {filteredStaffs.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  Không tìm thấy nhân sự nào.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <StaffInfoModal 
          staff={selectedStaff} 
          onClose={handleModalClose} 
        />
      )}
    </div>
  );
}
