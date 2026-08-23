'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, ChevronDown, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import { formatMoneyVN } from '@/lib/formatters';
import DatePickerVN from './common/DatePickerVN';
import StaffCombobox from './StaffCombobox';

export default function ProjectInfoModal({ isOpen, onClose, projectId, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({ basic: true, scale: false, investment: false });
  const [staffs, setStaffs] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [basicInfo, setBasicInfo] = useState({
    name: '', shortName: '', code: '', managementUnit: '', team: '',
    startDate: '', endDate: '', location: '', group: '', grade: '',
    sector: '', method: '', economicProgramCode: '', typeCode: '', clauseCode: '',
    goal: '', legalDocs: ''
  });

  const [scale, setScale] = useState({
    scopes: [{ title: '', unit: '', projectScope: '', specs: '', requirements: '' }],
    hasLandClearance: 'Có',
    clearanceLocation: '',
    affectedHouseholds: 0,
    affectedOrganizations: 0,
    recoveredArea: 0,
    compensationEstimate: 0,
    resettlementLand: 0,
    resettlementApartment: 0,
    resettlementMoney: 0
  });

  const [investment, setInvestment] = useState({
    construction: 0, landClearance: 0, projectManagement: 0, consulting: 0,
    equipment: 0, others: 0, contingency: 0, loanInterest: 0, vat: 0
  });

  // State cho việc Thêm mới dự án (Folder ID)
  const [folderId, setFolderId] = useState('');
  const isAddMode = !projectId;

  const totalInvestment = Object.values(investment).reduce((a, b) => Number(a || 0) + Number(b || 0), 0);

  useEffect(() => {
    if (isOpen) {
      if (projectId) {
        setFolderId(projectId);
        fetchProject();
      } else {
        // Thêm mới -> reset data
        setFolderId('');
        setBasicInfo({
          name: '', shortName: '', code: '', managementUnit: '', team: '',
          startDate: '', endDate: '', location: '', group: '', grade: '',
          sector: '', method: '', economicProgramCode: '', typeCode: '', clauseCode: '',
          goal: '', legalDocs: ''
        });
        setScale({
          scopes: [{ title: '', unit: '', projectScope: '', specs: '', requirements: '' }],
          hasLandClearance: 'Có',
          clearanceLocation: '', affectedHouseholds: 0, affectedOrganizations: 0,
          recoveredArea: 0, compensationEstimate: 0, resettlementLand: 0,
          resettlementApartment: 0, resettlementMoney: 0
        });
        setInvestment({
          construction: 0, landClearance: 0, projectManagement: 0, consulting: 0,
          equipment: 0, others: 0, contingency: 0, loanInterest: 0, vat: 0
        });
        setLoading(false);
      }
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (isOpen) {
      fetchStaffsAndDepartments();
    }
  }, [isOpen]);

  async function fetchStaffsAndDepartments() {
    try {
      const [staffsRes, deptsRes] = await Promise.all([
        fetch('/api/staffs').then(r => r.json()),
        fetch('/api/departments').then(r => r.json())
      ]);
      if (staffsRes.success) setStaffs(staffsRes.data || []);
      if (deptsRes.success) setDepartments(deptsRes.data || []);
    } catch (e) {
      console.error('Lỗi tải danh sách nhân sự/tổ:', e);
    }
  }

  async function fetchProject() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (data) {
        if (data.name) setBasicInfo(prev => ({ ...prev, name: data.name }));
        if (data.basic_info) setBasicInfo(data.basic_info);
        if (data.scale) setScale(data.scale);
        if (data.total_investment) setInvestment(data.total_investment);
      }
    } catch (error) {
      console.error('Không thể load project details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!folderId || folderId.trim() === '') {
      return alert('Vui lòng nhập Google Drive Folder ID của dự án.');
    }
    if (!basicInfo.name || basicInfo.name.trim() === '') {
      return alert('Vui lòng nhập Tên dự án.');
    }

    try {
      setSaving(true);
      
      // Nếu là chế độ sửa (có projectId ban đầu) và người dùng đã đổi folderId
      if (!isAddMode && folderId !== projectId) {
        // Cập nhật khóa chính trước
        const { error: updateIdError } = await supabase
          .from('projects')
          .update({ id: folderId })
          .eq('id', projectId);

        if (updateIdError) {
          console.error("Lỗi cập nhật ID dự án:", updateIdError);
          return alert('Không thể thay đổi Folder ID. Có thể ID này đã tồn tại hoặc đang bị ràng buộc dữ liệu.');
        }
      }

      const payload = {
        id: folderId,
        name: basicInfo.name,
        basic_info: basicInfo,
        scale: scale,
        total_investment: investment,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('projects')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error("Supabase Error:", error);
        alert('Lỗi lưu thông tin. Xem lại cấu trúc bảng "projects".');
      } else {
        alert('Đã lưu thông tin dự án thành công!');
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleBasicChange = (field, value) => setBasicInfo(prev => ({ ...prev, [field]: value }));
  const handleScaleChange = (field, value) => setScale(prev => ({ ...prev, [field]: value }));
  const handleInvestmentChange = (field, value) => setInvestment(prev => ({ ...prev, [field]: value }));

  const addScope = () => {
    setScale(prev => ({
      ...prev,
      scopes: [...prev.scopes, { title: '', unit: '', projectScope: '', specs: '', requirements: '' }]
    }));
  };

  const updateScope = (index, field, value) => {
    const newScopes = [...scale.scopes];
    newScopes[index][field] = value;
    setScale(prev => ({ ...prev, scopes: newScopes }));
  };

  const removeScope = (index) => {
    const newScopes = scale.scopes.filter((_, i) => i !== index);
    setScale(prev => ({ ...prev, scopes: newScopes }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 font-sans text-sm text-slate-300">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black flex flex-col h-[90vh] w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-emerald-400">
              {isAddMode ? 'Thêm Dự án mới' : 'Cập nhật Thông tin Dự án'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý chi tiết hồ sơ, quy mô và tổng mức đầu tư của dự án
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={saving}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
              <span className="text-slate-500 text-xs">Đang tải thông tin...</span>
            </div>
          ) : (
            <>
              {/* ID DỰ ÁN */}
              <div className="border border-emerald-900/50 rounded-xl overflow-hidden bg-emerald-950/20 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-emerald-400 mb-1">
                      Folder ID (Khóa chính) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={folderId} 
                      onChange={e => setFolderId(e.target.value)} 
                      placeholder="VD: 1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2"
                      className="w-full px-3 py-2 border border-slate-700/50 rounded-lg bg-slate-950 focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                    {isAddMode && <p className="text-[10px] text-slate-500 mt-1 mt-1">Là ID của thư mục dự án trên Google Drive.</p>}
                  </div>
                </div>
              </div>

              {/* THÔNG TIN CƠ BẢN */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                <button 
                  onClick={() => toggleSection('basic')}
                  className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-200">Thông tin cơ bản</span>
                  {openSections.basic ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                </button>
                
                {openSections.basic && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Tên dự án <span className="text-red-500">*</span></label>
                      <input type="text" value={basicInfo.name} onChange={e => handleBasicChange('name', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Tên viết tắt dự án</label>
                      <input type="text" value={basicInfo.shortName} onChange={e => handleBasicChange('shortName', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Mã dự án</label>
                      <input type="text" value={basicInfo.code} onChange={e => handleBasicChange('code', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Người phụ trách</label>
                      <StaffCombobox 
                        staffs={staffs} 
                        value={basicInfo.managementUnit} 
                        onChange={val => handleBasicChange('managementUnit', val)} 
                        placeholder="-- Chọn người phụ trách --"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Tổ chuyên môn</label>
                      <select 
                        value={basicInfo.team || ''} 
                        onChange={e => handleBasicChange('team', e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                      >
                        <option value="">-- Chọn tổ chuyên môn --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Ngày bắt đầu</label>
                        <DatePickerVN
                          value={basicInfo.startDate}
                          onChange={val => handleBasicChange('startDate', val)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Ngày kết thúc</label>
                        <DatePickerVN
                          value={basicInfo.endDate}
                          onChange={val => handleBasicChange('endDate', val)}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Địa điểm đầu tư</label>
                      <textarea rows={2} value={basicInfo.location} onChange={e => handleBasicChange('location', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Phân nhóm dự án</label>
                      <input type="text" value={basicInfo.group} onChange={e => handleBasicChange('group', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Cấp công trình</label>
                      <input type="text" value={basicInfo.grade} onChange={e => handleBasicChange('grade', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>

                    {/* Thông tin mã loại khoản */}
                    <div className="col-span-1 md:col-span-2 border border-slate-800/80 p-3 rounded-lg bg-slate-900/60 mt-2">
                      <h4 className="text-xs font-semibold mb-3 text-cyan-400">Thông tin mã loại khoản</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Lĩnh vực đầu tư</label>
                          <input type="text" value={basicInfo.sector} onChange={e => handleBasicChange('sector', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-950 focus:ring-1 focus:ring-emerald-500 outline-none text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Phương thức đầu tư</label>
                          <input type="text" value={basicInfo.method} onChange={e => handleBasicChange('method', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-950 focus:ring-1 focus:ring-emerald-500 outline-none text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Mã chương kinh tế</label>
                          <input type="text" value={basicInfo.economicProgramCode} onChange={e => handleBasicChange('economicProgramCode', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-950 focus:ring-1 focus:ring-emerald-500 outline-none text-xs" />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Mã loại</label>
                            <input type="text" value={basicInfo.typeCode} onChange={e => handleBasicChange('typeCode', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-950 focus:ring-1 focus:ring-emerald-500 outline-none text-xs" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Mã khoản</label>
                            <input type="text" value={basicInfo.clauseCode} onChange={e => handleBasicChange('clauseCode', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-950 focus:ring-1 focus:ring-emerald-500 outline-none text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Mục tiêu đầu tư</label>
                      <textarea rows={2} value={basicInfo.goal} onChange={e => handleBasicChange('goal', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"></textarea>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Văn bản pháp lý</label>
                      <textarea rows={2} value={basicInfo.legalDocs} onChange={e => handleBasicChange('legalDocs', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"></textarea>
                    </div>
                  </div>
                )}
              </div>

              {/* QUY MÔ DỰ ÁN */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                <button 
                  onClick={() => toggleSection('scale')}
                  className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-200">Quy mô dự án</span>
                  {openSections.scale ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                </button>
                
                {openSections.scale && (
                  <div className="p-4 space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-emerald-400">Phạm vi công trình</h4>
                        <button onClick={addScope} className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-800/50 transition-colors">
                          <Plus size={12} /> Thêm hạng mục
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {scale.scopes.map((item, idx) => (
                          <div key={idx} className="border border-slate-700/60 rounded-lg p-3 bg-slate-900/40 relative">
                            {scale.scopes.length > 1 && (
                              <button onClick={() => removeScope(idx)} className="absolute top-2 right-2 text-red-400 hover:bg-red-500/20 p-1 rounded">
                                <Trash2 size={14} />
                              </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Tiêu đề hạng mục</label>
                                <input type="text" value={item.title} onChange={e => updateScope(idx, 'title', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950 text-xs" />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Đơn vị</label>
                                <input type="text" value={item.unit} onChange={e => updateScope(idx, 'unit', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950 text-xs" />
                              </div>
                              <div className="col-span-1 md:col-span-2">
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Phạm vi dự án</label>
                                <textarea rows={2} value={item.projectScope} onChange={e => updateScope(idx, 'projectScope', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950 text-xs"></textarea>
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Thông số kỹ thuật</label>
                                <input type="text" value={item.specs} onChange={e => updateScope(idx, 'specs', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950 text-xs" />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Yêu cầu kỹ thuật</label>
                                <input type="text" value={item.requirements} onChange={e => updateScope(idx, 'requirements', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950 text-xs" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-4">
                      <div className="flex items-center gap-4 mb-4">
                        <h4 className="text-xs font-bold text-emerald-400">Thực hiện GPMB</h4>
                        <select 
                          value={scale.hasLandClearance} 
                          onChange={e => handleScaleChange('hasLandClearance', e.target.value)}
                          className="px-2 py-1 border border-slate-700 rounded bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                        >
                          <option value="Có">Có</option>
                          <option value="Không">Không</option>
                        </select>
                      </div>

                      {scale.hasLandClearance === 'Có' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-950/20 p-4 rounded-lg border border-orange-900/30">
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Địa điểm</label>
                            <textarea rows={2} value={scale.clearanceLocation} onChange={e => handleScaleChange('clearanceLocation', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900 focus:ring-1 focus:ring-orange-500 outline-none"></textarea>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Số hộ bị ảnh hưởng</label>
                            <input type="number" value={scale.affectedHouseholds} onChange={e => handleScaleChange('affectedHouseholds', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Tổ chức bị ảnh hưởng</label>
                            <input type="number" value={scale.affectedOrganizations} onChange={e => handleScaleChange('affectedOrganizations', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Diện tích đất bị thu hồi (m²)</label>
                            <input type="number" value={scale.recoveredArea} onChange={e => handleScaleChange('recoveredArea', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Dự toán bồi thường (VNĐ)</label>
                            <input type="number" value={scale.compensationEstimate} onChange={e => handleScaleChange('compensationEstimate', e.target.value)} className="w-full px-3 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                          </div>
                          
                          <div className="col-span-1 md:col-span-2 pt-2">
                            <h5 className="text-xs font-semibold text-slate-400 mb-2">Nhu cầu tái định cư:</h5>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Nền đất (m²)</label>
                                <input type="number" value={scale.resettlementLand} onChange={e => handleScaleChange('resettlementLand', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950" />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Căn hộ (Hộ)</label>
                                <input type="number" value={scale.resettlementApartment} onChange={e => handleScaleChange('resettlementApartment', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950" />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase text-slate-500 mb-1">Tiền (VNĐ)</label>
                                <input type="number" value={scale.resettlementMoney} onChange={e => handleScaleChange('resettlementMoney', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded bg-slate-950" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* TỔNG MỨC ĐẦU TƯ */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                <button 
                  onClick={() => toggleSection('investment')}
                  className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-200">Tổng mức đầu tư</span>
                  {openSections.investment ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                </button>
                
                {openSections.investment && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí xây lắp (VNĐ)</label>
                        <input type="number" value={investment.construction} onChange={e => handleInvestmentChange('construction', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí GPMB, di dời HTKT (VNĐ)</label>
                        <input type="number" value={investment.landClearance} onChange={e => handleInvestmentChange('landClearance', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí QLDA (VNĐ)</label>
                        <input type="number" value={investment.projectManagement} onChange={e => handleInvestmentChange('projectManagement', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí tư vấn (VNĐ)</label>
                        <input type="number" value={investment.consulting} onChange={e => handleInvestmentChange('consulting', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí thiết bị (VNĐ)</label>
                        <input type="number" value={investment.equipment} onChange={e => handleInvestmentChange('equipment', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí khác (VNĐ)</label>
                        <input type="number" value={investment.others} onChange={e => handleInvestmentChange('others', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Chi phí dự phòng (VNĐ)</label>
                        <input type="number" value={investment.contingency} onChange={e => handleInvestmentChange('contingency', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Lãi vay trong quá trình (VNĐ)</label>
                        <input type="number" value={investment.loanInterest} onChange={e => handleInvestmentChange('loanInterest', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">VAT (VNĐ)</label>
                        <input type="number" value={investment.vat} onChange={e => handleInvestmentChange('vat', e.target.value)} className="w-full px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-900" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-800/50 rounded-xl mt-4">
                      <span className="font-bold text-emerald-400">Tổng mức đầu tư</span>
                      <span className="text-lg font-black text-emerald-400 bg-emerald-950/50 px-3 py-1 rounded-lg border border-emerald-500/20 shadow-inner font-mono">
                        {formatMoneyVN(totalInvestment)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold shadow-lg shadow-emerald-500/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isAddMode ? 'Tạo Dự án' : 'Lưu Thay Đổi'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
