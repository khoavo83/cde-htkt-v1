'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Folder } from 'lucide-react';
import ProjectInfoModal from './ProjectInfoModal';

export default function ProjectListTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách dự án:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    setSelectedProjectId(id);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedProjectId(null); // mode thêm mới
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Thao tác này sẽ xóa tất cả thông tin dự án khỏi cơ sở dữ liệu.')) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert(data.error || 'Có lỗi xảy ra khi xóa');
      }
    } catch (error) {
      alert('Lỗi kết nối khi xóa dự án');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 shrink-0 px-1">
        <h3 className="text-sm font-bold text-emerald-500 flex items-center gap-2">
          <Folder className="w-4 h-4" /> Danh mục Dự án
        </h3>
        <div className="flex gap-2">
          <button onClick={fetchProjects} className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors" title="Làm mới">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Dự án Mới
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 relative">
        <div className="p-0 overflow-x-auto min-h-full">
          <table className="w-full text-left text-sm text-slate-300 border-collapse relative">
            <thead className="text-slate-400 text-xs uppercase sticky top-0 z-20 shadow-md border-b border-slate-700 bg-slate-900">
              <tr>
                <th className="px-4 py-3 w-16 text-center font-semibold">STT</th>
                <th className="px-4 py-3 font-semibold">Tên dự án</th>
                <th className="px-4 py-3 w-40 font-semibold">Tên viết tắt</th>
                <th className="px-4 py-3 font-semibold">Tổ chuyên môn</th>
                <th className="px-4 py-3 font-semibold">Người phụ trách</th>
                <th className="px-4 py-3 font-semibold">Folder ID</th>
                <th className="px-4 py-3 w-28 text-center font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && projects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    Chưa có dự án nào. Hãy bấm "Thêm Dự án Mới" để tạo dự án đầu tiên.
                  </td>
                </tr>
              ) : (
                projects.map((p, idx) => {
                  const basicInfo = p.basic_info || {};
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-emerald-400">{p.name}</td>
                      <td className="px-4 py-3 text-slate-400">{basicInfo.shortName || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{basicInfo.team || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{basicInfo.managementUnit || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.id}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(p.id)} 
                            className="text-amber-500/70 hover:text-amber-400 transition-colors p-1" 
                            title="Sửa thông tin"
                            disabled={saving}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            className="text-red-500/70 hover:text-red-400 transition-colors p-1" 
                            title="Xóa dự án"
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {isModalOpen && (
        <ProjectInfoModal 
          isOpen={isModalOpen}
          projectId={selectedProjectId}
          onClose={() => setIsModalOpen(false)}
          onSaveSuccess={() => {
            fetchProjects();
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
}
