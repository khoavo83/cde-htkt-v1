import React, { useState, useMemo } from 'react';
import { Target, Calendar, FileText, X, ExternalLink, Download } from 'lucide-react';

export default function KPITab({ documents = [], onOpenDocument }) {
  const [filterType, setFilterType] = useState('year'); // 'year' hoặc 'range'
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State cho Modal hiển thị chi tiết văn bản
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Sinh danh sách các năm (từ năm nhỏ nhất có trong dữ liệu đến năm hiện tại)
  const availableYears = useMemo(() => {
    const years = new Set([currentYear]);
    documents.forEach(doc => {
      const rawDate = doc.issuedDate || doc.documentDate;
      if (rawDate) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
          years.add(rawDate.split('/')[2]);
        } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          years.add(rawDate.split('-')[0]);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [documents, currentYear]);

  // Hàm parse ngày an toàn
  const parseDate = (rawDate) => {
    if (!rawDate) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const parts = rawDate.split('/');
      return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      return new Date(rawDate.split('T')[0]);
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  // Tính toán số liệu KPI
  const kpiData = useMemo(() => {
    // 1. Chỉ hiển thị các VB có nhân sự xử lý (đã phân công, không rỗng)
    const validDocs = documents.filter(doc => doc.assignedStaff && doc.assignedStaff.trim() !== '');

    const stats = {};

    validDocs.forEach(doc => {
      const staff = doc.assignedStaff.trim();
      const date = parseDate(doc.issuedDate || doc.documentDate);
      
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
  }, [documents, filterType, selectedYear, startDate, endDate]);

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

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-xs font-semibold">
          <Download className="w-3.5 h-3.5" />
          Xuất Excel (Sắp có)
        </button>
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
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sticky left-0 bg-slate-900/95 font-medium text-slate-200 whitespace-nowrap z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-slate-800/50">
                      {row.staffName}
                    </td>
                    
                    {filterType === 'year' && (
                      row.months.map((docs, monthIdx) => (
                        <td key={monthIdx} className="py-3 px-2 text-center">
                          {docs.length > 0 ? (
                            <button
                              onClick={() => handleShowDetails(row.staffName, docs, `Tháng ${monthIdx + 1} / ${selectedYear}`)}
                              className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-500/20 hover:scale-105 inline-flex items-center justify-center"
                              title="Click để xem chi tiết"
                            >
                              {docs.length}
                            </button>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      ))
                    )}

                    <td className="py-3 px-4 text-center">
                      {total > 0 ? (
                        <button
                          onClick={() => handleShowDetails(
                            row.staffName, 
                            filterType === 'year' ? row.months.flat() : row.totalDocs, 
                            filterType === 'year' ? `Năm ${selectedYear}` : 'Khoảng thời gian đã chọn'
                          )}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-lg hover:shadow-emerald-600/20"
                        >
                          {total}
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Chi tiết danh sách văn bản */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Văn bản của: <span className="text-emerald-400">{selectedDetails.staff}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Thời gian: {selectedDetails.title} • Tổng số: <strong className="text-white">{selectedDetails.docs.length}</strong> văn bản</p>
              </div>
              <button 
                onClick={() => setSelectedDetails(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50">
              <div className="grid grid-cols-1 gap-3">
                {selectedDetails.docs.map((doc, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-emerald-500/50 transition-colors group flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold uppercase">
                          {doc.documentType || doc.category || 'Khác'}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">Số: {doc.documentNumber || 'N/A'}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {doc.issuedDate || doc.documentDate || '---'}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 mt-2">{doc.summary || doc.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">Nơi PH: <span className="text-slate-300">{doc.issuer || doc.issuingAgency || '---'}</span></p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if(onOpenDocument) onOpenDocument(doc);
                      }}
                      className="shrink-0 p-2 text-slate-400 bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors"
                      title="Mở tài liệu"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
