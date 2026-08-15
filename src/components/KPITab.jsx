import React, { useState, useMemo, useEffect } from 'react';
import { Target, Calendar, FileText, X, ExternalLink, Download, RefreshCw } from 'lucide-react';

export default function KPITab({ documents = [], onOpenDocument, onRefresh }) {
  const [filterType, setFilterType] = useState('year'); // 'year' hoặc 'range'
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [localDocs, setLocalDocs] = useState(documents);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State cho Modal hiển thị chi tiết văn bản
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Đồng bộ props documents vào state
  useEffect(() => {
    if (documents && documents.length > 0) {
      setLocalDocs(documents);
    }
  }, [documents]);

  // Tự động tải lại dữ liệu mới nhất từ Supabase khi mở Tab KPI
  const loadFreshDocs = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/documents?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.documents) {
          setLocalDocs(data.documents);
        }
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Lỗi làm mới dữ liệu KPI:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFreshDocs();
  }, []);

  // Sinh danh sách các năm (từ năm nhỏ nhất có trong dữ liệu đến năm hiện tại)
  const availableYears = useMemo(() => {
    const years = new Set([currentYear]);
    (localDocs || []).forEach(doc => {
      const rawDate = doc.documentDate || doc.ngay_phat_hanh || doc.issuedDate;
      if (rawDate) {
        const s = String(rawDate).trim();
        if (s.includes('/')) {
          const parts = s.split('/');
          if (parts.length === 3) years.add(parts[2]);
        } else if (s.includes('-')) {
          const parts = s.split('T')[0].split('-');
          if (parts.length === 3) years.add(parts[0]);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [localDocs, currentYear]);

  // Hàm parse ngày an toàn (midday để tránh lệch múi giờ)
  const parseDate = (rawDate) => {
    if (!rawDate) return null;
    const s = String(rawDate).trim();
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 12, 0, 0);
      }
    }
    if (s.includes('-')) {
      const parts = s.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  // Tính toán số liệu KPI
  const kpiData = useMemo(() => {
    // 1. Chỉ hiển thị các VB có nhân sự xử lý (đã phân công, không rỗng)
    const validDocs = (localDocs || []).filter(doc => {
      const staff = doc.assignedStaff || doc.nguoi_xu_ly;
      return staff && typeof staff === 'string' && staff.trim() !== '';
    });

    const stats = {};

    validDocs.forEach(doc => {
      const staff = (doc.assignedStaff || doc.nguoi_xu_ly).trim();
      const date = parseDate(doc.documentDate || doc.ngay_phat_hanh || doc.issuedDate);
      
      if (!stats[staff]) {
        stats[staff] = {
          staffName: staff,
          months: Array(12).fill().map(() => []), // Mảng chứa danh sách doc theo từng tháng (index 0 = Jan)
          totalDocs: [] // Chứa danh sách doc tổng (dùng cho 'range')
        };
      }

      if (date) {
        if (filterType === 'year') {
          if (date.getFullYear().toString() === selectedYear) {
            const monthIndex = date.getMonth(); // 0 - 11
            stats[staff].months[monthIndex].push(doc);
          }
        } else if (filterType === 'range') {
          const sDate = startDate ? new Date(startDate) : new Date('2000-01-01');
          sDate.setHours(0, 0, 0, 0);
          
          const eDate = endDate ? new Date(endDate) : new Date('2100-01-01');
          eDate.setHours(23, 59, 59, 999);

          if (date >= sDate && date <= eDate) {
            stats[staff].totalDocs.push(doc);
          }
        }
      }
    });

    // Chuyển sang dạng mảng và sắp xếp theo tổng số lượng giảm dần
    return Object.values(stats).sort((a, b) => {
      if (filterType === 'year') {
        const totalA = a.months.reduce((sum, docs) => sum + docs.length, 0);
        const totalB = b.months.reduce((sum, docs) => sum + docs.length, 0);
        return totalB - totalA;
      } else {
        return b.totalDocs.length - a.totalDocs.length;
      }
    });
  }, [localDocs, filterType, selectedYear, startDate, endDate]);

  const handleShowDetails = (staffName, docs, title) => {
    if (docs.length === 0) return;
    setSelectedDetails({ staff: staffName, title, docs });
  };

  // Tính tổng cột cuối cùng
  const calculateTotal = (staffData) => {
    if (filterType === 'year') {
      return staffData.months.reduce((sum, docs) => sum + docs.length, 0);
    }
    return staffData.totalDocs.length;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-3 sm:p-4 text-sm font-sans">
      {/* Bộ lọc Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterType('year')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterType === 'year' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Theo Năm
            </button>
            <button
              onClick={() => setFilterType('range')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterType === 'range' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Khoảng thời gian
            </button>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

          {filterType === 'year' ? (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
              />
              <span className="text-xs text-slate-400 ml-2">Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadFreshDocs}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-xs font-semibold disabled:opacity-50"
            title="Làm mới số liệu KPI tức thì"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-xs font-semibold">
            <Download className="w-3.5 h-3.5" />
            Xuất Excel (Sắp có)
          </button>
        </div>
      </div>

      {/* Bảng dữ liệu KPI */}
      <div className="flex-1 min-h-0 overflow-auto pr-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-slate-800 shadow-sm">
            <tr>
              <th className="py-3 px-4 font-semibold text-slate-400 whitespace-nowrap sticky left-0 bg-slate-900/95 z-20">NHÂN SỰ XỬ LÝ</th>
              {filterType === 'year' && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <th key={i} className="py-3 px-2 text-center font-semibold text-slate-400">T{i + 1}</th>
                  ))}
                </>
              )}
              <th className="py-3 px-4 font-bold text-emerald-400 text-center">TỔNG CỘNG</th>
            </tr>
          </thead>
          <tbody>
            {kpiData.length === 0 ? (
              <tr>
                <td colSpan={filterType === 'year' ? 14 : 2} className="py-20 text-center text-slate-500">
                  <Target className="w-8 h-8 text-slate-600 mb-2 mx-auto" />
                  <span>Không có dữ liệu thống kê nào phù hợp.</span>
                </td>
              </tr>
            ) : (
              kpiData.map((row, idx) => {
                const total = calculateTotal(row);
                return (
                  <tr 
                    key={row.staffName} 
                    className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                    }`}
                  >
                    {/* Tên nhân sự */}
                    <td className="py-3 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-950/90 backdrop-blur z-10 whitespace-nowrap border-r border-slate-800/40">
                      {row.staffName}
                    </td>

                    {/* Dữ liệu theo Năm (12 tháng) */}
                    {filterType === 'year' && (
                      row.months.map((monthDocs, mIdx) => {
                        const count = monthDocs.length;
                        return (
                          <td key={mIdx} className="py-3 px-2 text-center">
                            {count > 0 ? (
                              <button
                                onClick={() => handleShowDetails(row.staffName, monthDocs, `Tháng ${mIdx + 1}/${selectedYear}`)}
                                className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm cursor-pointer"
                                title={`Xem ${count} văn bản của ${row.staffName} trong Tháng ${mIdx + 1}`}
                              >
                                {count}
                              </button>
                            ) : (
                              <span className="text-slate-600 select-none">-</span>
                            )}
                          </td>
                        );
                      })
                    )}

                    {/* Cột Tổng cộng */}
                    <td className="py-3 px-4 text-center border-l border-slate-800/40">
                      {total > 0 ? (
                        <button
                          onClick={() => handleShowDetails(
                            row.staffName, 
                            filterType === 'year' ? row.months.flat() : row.totalDocs, 
                            filterType === 'year' ? `Cả năm ${selectedYear}` : 'Khoảng thời gian đã chọn'
                          )}
                          className="inline-flex items-center justify-center min-w-[36px] h-8 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold hover:bg-emerald-500 hover:text-white transition-all shadow cursor-pointer text-xs"
                          title={`Xem toàn bộ ${total} văn bản của ${row.staffName}`}
                        >
                          {total}
                        </button>
                      ) : (
                        <span className="text-slate-600 select-none">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL HIỂN THỊ DANH SÁCH VĂN BẢN CHI TIẾT ── */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Danh sách văn bản xử lý: {selectedDetails.staff}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thời gian: <span className="text-emerald-400 font-semibold">{selectedDetails.title}</span> • Tổng số: <span className="text-white font-bold">{selectedDetails.docs.length}</span> văn bản
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danh sách văn bản */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selectedDetails.docs.map((doc, idx) => (
                <div 
                  key={doc.id || idx}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {doc.documentType || 'Văn bản'}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {doc.documentNumber || doc.so_vb || 'Chưa có số'}
                      </span>
                      {(doc.documentDate || doc.ngay_phat_hanh) && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          • Ngày: {doc.documentDate || doc.ngay_phat_hanh}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug line-clamp-2" title={doc.name}>
                      {doc.name}
                    </h4>

                    {(doc.summary || doc.trich_yeu) && (
                      <p className="text-xs text-slate-400 line-clamp-2 italic">
                        {doc.summary || doc.trich_yeu}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      {(doc.issuingAgency || doc.noi_phat_hanh) && (
                        <span>Nơi ban hành: <strong className="text-slate-400">{doc.issuingAgency || doc.noi_phat_hanh}</strong></span>
                      )}
                      {doc.project_name && (
                        <span>Dự án: <strong className="text-slate-400">{doc.project_name}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Nút xem văn bản */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onOpenDocument) onOpenDocument(doc);
                        else if (doc.driveWebLink) window.open(doc.driveWebLink, '_blank');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span>Xem chi tiết</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
