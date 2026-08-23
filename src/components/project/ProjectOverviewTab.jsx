'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Users, 
  FileText, 
  Edit3, 
  CheckCircle2, 
  ShieldCheck, 
  Folder,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatNumberVN, formatMoneyVN, formatDateVN } from '@/lib/formatters';
import ProjectInfoModal from '../ProjectInfoModal';

export default function ProjectOverviewTab({ projectId, onUpdate }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchProject = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (data) setProject(data);
    } catch (err) {
      console.error('Lỗi khi tải thông tin dự án:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
        Đang tải thông tin dự án...
      </div>
    );
  }

  const basic = project?.basic_info || {};
  const scale = project?.scale || {};
  const scopes = scale?.scopes || [];

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1 font-sans text-slate-200">
      
      {/* ──── HEADER DỰ ÁN ──── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs">
              {basic.shortName || 'Dự án trọng điểm'}
            </span>
            {basic.code && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-mono rounded text-xs">
                Mã: {basic.code}
              </span>
            )}
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
              {basic.group ? `Dự án ${basic.group}` : 'Nhóm A'} - {basic.grade || 'Cấp đặc biệt'}
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-black text-slate-100 leading-snug">
            {project?.name || 'Tên dự án'}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-emerald-400" />
              <span>Chủ đầu tư/Lãnh đạo: <b className="text-slate-200">{basic.managementUnit || 'Ban QLĐSĐT'}</b></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-blue-400" />
              <span>Tổ chuyên môn: <b className="text-slate-200">{basic.team || 'Tổ Dự án'}</b></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-400" />
              <span>Thời gian: <b className="text-slate-200">{formatDateVN(basic.startDate)} - {formatDateVN(basic.endDate)}</b></span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-purple-400" />
              <span>Địa điểm: <b className="text-slate-200">{basic.location || 'TP. Hồ Chí Minh'}</b></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
        >
          <Edit3 size={14} /> Chỉnh sửa Hồ sơ Dự án
        </button>
      </div>

      {/* ──── MỤC TIÊU DỰ ÁN ──── */}
      {basic.goal && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Mục Tiêu Đầu Tư
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {basic.goal}
          </p>
        </div>
      )}

      {/* ──── QUY MÔ & CÔNG TÁC BỒI THƯỜNG GPMB ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Khối GPMB */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-md">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MapPin size={14} /> Công Tác Bồi Thường Giải Phóng Mặt Bằng
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Số hộ bị ảnh hưởng:</span>
              <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                {scale.affectedHouseholds || 0} hộ
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Tổ chức bị ảnh hưởng:</span>
              <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                {scale.affectedOrganizations || 0} tổ chức
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Diện tích đất thu hồi:</span>
              <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                {formatNumberVN(scale.recoveredArea || 0)} m²
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Dự toán bồi thường:</span>
              <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                {formatMoneyVN(scale.compensationEstimate || 0)}
              </span>
            </div>
          </div>

          {scale.clearanceLocation && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
              <span className="text-slate-500 font-medium">Địa điểm GPMB:</span> {scale.clearanceLocation}
            </div>
          )}

          {/* Tái định cư */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-2">Nhu cầu Tái định cư:</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Nền đất</span>
                <b className="text-slate-200">{formatNumberVN(scale.resettlementLand || 0)} m²</b>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Căn hộ</span>
                <b className="text-slate-200">{formatNumberVN(scale.resettlementApartment || 0)} hộ</b>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tiền tự lo TĐC</span>
                <b className="text-slate-200">{formatMoneyVN(scale.resettlementMoney || 0)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Khối Pháp lý & Mã số ngân sách */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Mã Ngân Sách & Căn Cứ Pháp Lý
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Mã Chương</span>
                <b className="font-mono text-slate-200">{basic.economicProgramCode || '-'}</b>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Mã Loại - Khoản</span>
                <b className="font-mono text-slate-200">{basic.typeCode ? `${basic.typeCode} - ${basic.clauseCode || ''}` : '-'}</b>
              </div>
            </div>

            {basic.legalDocs && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Căn cứ pháp lý chủ yếu:</span>
                <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800 whitespace-pre-line">
                  {basic.legalDocs}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-emerald-400" />
              <span className="text-slate-300">Google Drive Folder ID:</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">{project?.id}</span>
          </div>
        </div>

      </div>

      {/* Modal chỉnh sửa */}
      {isEditModalOpen && (
        <ProjectInfoModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          projectId={projectId}
          onSaveSuccess={() => {
            fetchProject();
            if (onUpdate) onUpdate();
          }}
        />
      )}

    </div>
  );
}
