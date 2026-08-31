'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Sparkles, 
  FileCode, 
  Folder, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  ArrowUpRight,
  Clock,
  Eye,
  Edit3,
  Check,
  X,
  FileCheck2,
  Tag,
  Hash
} from 'lucide-react';
import { formatDateVN, formatNumberVN, formatPercentVN } from '@/lib/formatters';
import DocumentAnalyzeModal from './DocumentAnalyzeModal';

export default function SystemMetadataStats({ 
  agencies = [], 
  documentTypes = [],
  onDocumentUpdate
}) {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [activeFilter, setActiveFilter] = useState('missing_meta'); // 'all', 'missing_meta', 'has_meta', 'missing_md', 'has_md'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Modal phân tích / cập nhật metadata & MD
  const [analyzingDoc, setAnalyzingDoc] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        filter: activeFilter,
        search: searchQuery,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      const res = await fetch(`/api/settings/system-stats?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStatsData(data);
      } else {
        console.error('Lỗi khi tải thống kê:', data.error);
      }
    } catch (err) {
      console.error('Lỗi kết nối API thống kê:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, activeFilter, searchQuery, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset trang về 1 khi đổi bộ lọc hoặc tìm kiếm
  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    setCurrentPage(1);
  };

  const handleProjectChange = (newProjectId) => {
    setSelectedProjectId(newProjectId);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const overall = statsData?.overall || {
    total: 0,
    hasMeta: 0,
    missingMeta: 0,
    hasMd: 0,
    missingMd: 0,
    metaPercent: 0,
    mdPercent: 0
  };

  const byProject = statsData?.byProject || [];
  const files = statsData?.files || [];
  const pagination = statsData?.pagination || { page: 1, limit: 50, totalFiltered: 0, totalPages: 1 };

  return (
    <div className="space-y-5 text-xs">
      {/* ── 1. THANH ĐIỀU HƯỚNG & NÚT LÀM MỚI ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-100">Bảng Thống kê & Quản trị Dữ liệu Tệp tin (Google Drive / Supabase)</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc Dự Án */}
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/80 font-medium"
          >
            <option value="all">📁 Tất cả các dự án ({formatNumberVN(overall.total)} tệp)</option>
            {byProject.map((p) => (
              <option key={p.projectId || 'null'} value={p.projectId || 'null'}>
                {p.projectName} ({formatNumberVN(p.total)} tệp)
              </option>
            ))}
          </select>

          {/* Nút Làm Mới */}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. THẺ KPI TỔNG QUAN (METRICS CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Tổng số tệp */}
        <div 
          onClick={() => handleFilterChange('all')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'all' 
              ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/40' 
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Tổng số tệp</span>
            <Folder className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-white mb-1 font-mono">
            {formatNumberVN(overall.total)}
          </div>
          <div className="text-[10px] text-slate-400">
            Tất cả văn bản & tài liệu trong CSDL
          </div>
        </div>

        {/* 2. Đã có Metadata */}
        <div 
          onClick={() => handleFilterChange('has_meta')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'has_meta' 
              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40' 
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1.5">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Đã có Metadata</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mb-1 font-mono flex items-baseline gap-2">
            <span>{formatNumberVN(overall.hasMeta)}</span>
            <span className="text-xs font-normal text-emerald-500/80">({formatPercentVN(overall.metaPercent)})</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${overall.metaPercent}%` }}
            />
          </div>
        </div>

        {/* 3. Chưa có / Thiếu Metadata */}
        <div 
          onClick={() => handleFilterChange('missing_meta')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'missing_meta' 
              ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40' 
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1.5">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Chưa / Thiếu Metadata</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 mb-1 font-mono flex items-baseline gap-2">
            <span>{formatNumberVN(overall.missingMeta)}</span>
            <span className="text-xs font-normal text-amber-500/80">
              ({formatPercentVN(100 - overall.metaPercent)})
            </span>
          </div>
          <div className="text-[10px] text-amber-400/80 flex items-center gap-1 font-medium">
            <span>⚠️ Cần bóc tách / cập nhật</span>
          </div>
        </div>

        {/* 4. Đã có .md */}
        <div 
          onClick={() => handleFilterChange('has_md')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'has_md' 
              ? 'bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40' 
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-400 mb-1.5">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Đã số hóa (.md)</span>
            <FileCode className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-400 mb-1 font-mono flex items-baseline gap-2">
            <span>{formatNumberVN(overall.hasMd)}</span>
            <span className="text-xs font-normal text-cyan-500/80">({formatPercentVN(overall.mdPercent)})</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${overall.mdPercent}%` }}
            />
          </div>
        </div>

        {/* 5. Chưa có .md */}
        <div 
          onClick={() => handleFilterChange('missing_md')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'missing_md' 
              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40' 
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Chưa có .md</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-300 mb-1 font-mono">
            {formatNumberVN(overall.missingMd)}
          </div>
          <div className="text-[10px] text-slate-400">
            Chưa trích xuất văn bản Markdown
          </div>
        </div>
      </div>

      {/* ── 3. BẢNG PHÂN BỐ THEO TỪNG DỰ ÁN ── */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <h4 className="font-bold text-xs text-slate-200 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Tiến độ chuẩn hóa Metadata & Số hóa Markdown theo Dự án
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3 font-semibold">DỰ ÁN</th>
                <th className="py-2 px-3 font-semibold text-right">TỔNG SỐ FILE</th>
                <th className="py-2 px-3 font-semibold text-right">ĐÃ CÓ METADATA</th>
                <th className="py-2 px-3 font-semibold text-right">THIẾU METADATA</th>
                <th className="py-2 px-3 font-semibold text-center w-36">TỶ LỆ METADATA</th>
                <th className="py-2 px-3 font-semibold text-right">ĐÃ CÓ .MD</th>
                <th className="py-2 px-3 font-semibold text-right">CHƯA CÓ .MD</th>
                <th className="py-2 px-3 font-semibold text-center w-36">TỶ LỆ SỐ HÓA MD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {byProject.map((proj) => (
                <tr 
                  key={proj.projectId || 'unknown'} 
                  onClick={() => handleProjectChange(proj.projectId || 'null')}
                  className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    selectedProjectId === (proj.projectId || 'null') ? 'bg-slate-800/60 font-semibold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${proj.total > 0 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    {proj.projectName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-200 font-bold">
                    {formatNumberVN(proj.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                    {formatNumberVN(proj.hasMeta)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                    {formatNumberVN(proj.missingMeta)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${proj.metaPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 min-w-[36px] text-right">
                        {formatPercentVN(proj.metaPercent)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-cyan-400 font-semibold">
                    {formatNumberVN(proj.hasMd)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {formatNumberVN(proj.missingMd)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="bg-cyan-500 h-full rounded-full" 
                          style={{ width: `${proj.mdPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 min-w-[36px] text-right">
                        {formatPercentVN(proj.mdPercent)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. BẢNG DANH SÁCH CHI TIẾT CÁC TỆP TIN ĐỂ THEO DÕI & CẬP NHẬT ── */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
        {/* Bộ lọc & Tìm kiếm */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          {/* Filter Sub-Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                activeFilter === 'all' 
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              Tất cả ({formatNumberVN(overall.total)})
            </button>
            <button
              onClick={() => handleFilterChange('missing_meta')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === 'missing_meta' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-850'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Thiếu Metadata ({formatNumberVN(overall.missingMeta)})</span>
            </button>
            <button
              onClick={() => handleFilterChange('has_meta')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === 'has_meta' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-850'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Đã có Metadata ({formatNumberVN(overall.hasMeta)})</span>
            </button>
            <button
              onClick={() => handleFilterChange('missing_md')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === 'missing_md' 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-850'
              }`}
            >
              <span>Chưa có .md ({formatNumberVN(overall.missingMd)})</span>
            </button>
            <button
              onClick={() => handleFilterChange('has_md')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === 'has_md' 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-850'
              }`}
            >
              <FileCode className="w-3 h-3 text-cyan-400" />
              <span>Đã có .md ({formatNumberVN(overall.hasMd)})</span>
            </button>
          </div>

          {/* Ô Tìm kiếm */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên tệp, số VB, trích yếu..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80"
            />
          </div>
        </div>

        {/* Thanh đếm & Phân trang */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>
            Tìm thấy <strong className="text-slate-200">{formatNumberVN(pagination.totalFiltered)}</strong> tệp tin &middot; Trang <strong className="text-slate-200">{pagination.page}</strong>/{pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
            >
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                disabled={currentPage === 1}
                className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-bold text-slate-200">{currentPage}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.totalPages))} 
                disabled={currentPage === pagination.totalPages}
                className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bảng Dữ Liệu Chi Tiết */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-slate-400 w-12 text-center">#</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400 min-w-[280px]">TÊN TỆP TIN / VĂN BẢN</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">DỰ ÁN & THƯ MỤC</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">SỐ HIỆU VB</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">NGÀY PH</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">NƠI PHÁT HÀNH</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400 text-center">SỐ HÓA MD</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                    <span>Đang tải dữ liệu tệp tin...</span>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Không có tệp tin nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                files.map((file, idx) => {
                  const hasFullMeta = file.hasMeta;
                  const hasMd = file.hasMd;

                  return (
                    <tr 
                      key={file.id || idx} 
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      {/* Tên tệp tin */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-100 hover:text-emerald-400 cursor-pointer transition-colors leading-snug break-words"
                              onClick={() => setAnalyzingDoc(file)}
                              title={file.name || file.fileName}
                            >
                              {file.name || file.fileName}
                            </div>
                            {file.summary && file.summary !== file.name && (
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={file.summary}>
                                {file.summary}
                              </div>
                            )}
                          </div>
                          {file.webViewLink && (
                            <a 
                              href={file.webViewLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-slate-500 hover:text-cyan-400 shrink-0 p-1"
                              title="Mở trên Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Dự án & Thư mục */}
                      <td className="py-2.5 px-3 text-[11px]">
                        <div className="text-slate-300 font-semibold">{file.projectName}</div>
                        <div className="text-slate-500 text-[10px] truncate max-w-[180px]" title={file.folderName}>
                          📂 {file.folderName || 'Root'}
                        </div>
                      </td>

                      {/* Số hiệu VB */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {file.soVb && file.soVb !== 'Đang cập nhật' && file.soVb !== '—' ? (
                          <span className="text-cyan-300 font-semibold">{file.soVb}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Chưa có
                          </span>
                        )}
                      </td>

                      {/* Ngày phát hành */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {file.ngayPhatHanh ? (
                          <span className="text-slate-200">{formatDateVN(file.ngayPhatHanh)}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Chưa có
                          </span>
                        )}
                      </td>

                      {/* Nơi phát hành */}
                      <td className="py-2.5 px-3 text-[11px]">
                        {file.noiPhatHanh && file.noiPhatHanh !== 'Đang cập nhật' ? (
                          <span className="text-slate-300">{file.noiPhatHanh}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Chưa có
                          </span>
                        )}
                      </td>

                      {/* Trạng thái Markdown */}
                      <td className="py-2.5 px-3 text-center">
                        {hasMd ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="w-2.5 h-2.5" />
                            <span>MD ({file.mdCharCount || 'Có'} ký tự)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Chưa có
                          </span>
                        )}
                      </td>

                      {/* Nút thao tác */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setAnalyzingDoc(file)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-colors text-[11px] font-semibold flex items-center gap-1 ml-auto"
                          title="Mở cửa sổ AI bóc tách & số hóa Markdown"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Cập nhật</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MODAL PHÂN TÍCH & BÓC TÁCH METADATA / SỐ HÓA .MD ── */}
      {analyzingDoc && (
        <DocumentAnalyzeModal
          document={analyzingDoc}
          isOpen={true}
          onClose={() => setAnalyzingDoc(null)}
          agencies={agencies}
          documentTypes={documentTypes}
          onSave={() => {
            fetchStats();
            if (onDocumentUpdate) onDocumentUpdate();
          }}
        />
      )}
    </div>
  );
}
