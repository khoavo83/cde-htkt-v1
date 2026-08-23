'use client';

import { useMemo } from 'react';
import { 
  BarChart3, 
  Layers, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Building,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { formatMoneyVN } from '@/lib/formatters';

export default function CapitalMatrixView({
  plans = [],
  allocations = [],
  midTermPlan = null,
  totalTMDT = 0,
  matrixYears = []
}) {
  // Định dạng tiền tệ VNĐ chuẩn
  const formatMoney = (val) => {
    if (val === null || val === undefined || val === '' || Number(val) === 0) return '-';
    return formatMoneyVN(val);
  };

  const formatBillion = (val) => {
    if (!val) return '0 tỷ';
    const bil = Number(val) / 1000000000;
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(bil) + ' tỷ đ';
  };

  // Tổng lũy kế vốn đã giao qua tất cả các năm
  const totalAllocatedAllYears = allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  
  // Vốn còn thiếu cần bố trí
  const remainingBudgetNeeded = Math.max(0, totalTMDT - totalAllocatedAllYears);
  
  // Tỷ lệ % vốn đã được bố trí so với TMĐT
  const allocationPercent = totalTMDT > 0 ? ((totalAllocatedAllYears / totalTMDT) * 100).toFixed(1) : 0;

  // Danh sách các năm duy nhất (nếu chưa có năm nào thì mặc định hiển thị 2026, 2027, 2028, 2029, 2030)
  const yearsList = useMemo(() => {
    const defaultYears = [2026, 2027, 2028, 2029, 2030];
    const actualYears = matrixYears.map(m => m.year);
    const combined = Array.from(new Set([...actualYears, ...defaultYears])).sort((a, b) => a - b);
    return combined;
  }, [matrixYears]);

  // Nhóm các đợt giao vốn theo nguồn vốn
  const sourcesSummary = useMemo(() => {
    const srcMap = {
      'Ngân sách Thành phố': { name: 'Ngân sách Thành phố', total: 0, byYear: {} },
      'Ngân sách Trung ương': { name: 'Ngân sách Trung ương', total: 0, byYear: {} },
      'Vốn ODA / Vay lại': { name: 'Vốn ODA / Vay lại', total: 0, byYear: {} }
    };

    allocations.forEach(a => {
      const src = a.source_type || 'Ngân sách Thành phố';
      if (!srcMap[src]) srcMap[src] = { name: src, total: 0, byYear: {} };
      srcMap[src].total += Number(a.amount || 0);
      srcMap[src].byYear[a.year] = (srcMap[src].byYear[a.year] || 0) + Number(a.amount || 0);
    });

    return Object.values(srcMap);
  }, [allocations]);

  return (
    <div className="space-y-4 font-sans text-slate-200">
      
      {/* ──── THẺ CẢNH BÁO TIẾN ĐỘ CÂN ĐỐI VỐN ──── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Thẻ 1: Khung trung hạn */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Khung Vốn Trung Hạn (2026-2030)
            </span>
            <span className="p-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
              <Layers size={14} />
            </span>
          </div>
          <span className="text-lg font-black text-purple-400 font-mono mt-1 block">
            {formatMoney(midTermPlan?.planned_amount || totalTMDT)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Bố trí 100% TMĐT theo kế hoạch 5 năm
          </span>
        </div>

        {/* Thẻ 2: Lũy kế đã có QĐ giao */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Lũy kế Vốn Đã Giao Thực Tế
            </span>
            <span className="p-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              <CheckCircle2 size={14} />
            </span>
          </div>
          <span className="text-lg font-black text-blue-400 font-mono mt-1 block">
            {formatMoney(totalAllocatedAllYears)}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${allocationPercent >= 80 ? 'bg-emerald-500' : allocationPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(allocationPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-blue-400 font-mono">{allocationPercent}%</span>
          </div>
        </div>

        {/* Thẻ 3: Dư địa vốn cần bố trí tiếp */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Nhu Cầu Vốn Cần Bố Trí Tiếp
            </span>
            <span className="p-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
              <AlertCircle size={14} />
            </span>
          </div>
          <span className="text-lg font-black text-amber-400 font-mono mt-1 block">
            {formatMoney(remainingBudgetNeeded)}
          </span>
          <span className="text-[11px] text-amber-400/80 mt-0.5 block">
            Còn {(100 - allocationPercent).toFixed(1)}% TMĐT cần bố trí các năm tới
          </span>
        </div>

      </div>

      {/* ──── MA TRẬN BỐ TRÍ VỐN ĐA CHIỀU (CAPITAL BALANCE MATRIX) ──── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/70 border-b border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={15} /> Ma Trận Cân Đối Vốn Đầu Tư Công (TMĐT ↔ Trung Hạn ↔ Hàng Năm)
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Đối chiếu tiến độ cấp vốn chi tiết theo từng năm và theo từng nguồn ngân sách
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-[11px] border border-slate-700">
              Đơn vị tính: <b>VNĐ</b>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 min-w-[280px] border-r border-slate-800">Chỉ tiêu / Nguồn vốn</th>
                <th className="px-3 py-3 w-44 text-right border-r border-slate-800 text-purple-400 font-bold">
                  TMĐT / Trung hạn 5 năm
                </th>
                <th className="px-3 py-3 w-40 text-right border-r border-slate-800 text-blue-400 font-bold">
                  Lũy kế đã giao
                </th>
                {yearsList.map(yr => (
                  <th key={yr} className="px-3 py-3 w-36 text-right border-r border-slate-800 font-bold">
                    Năm {yr}
                  </th>
                ))}
                <th className="px-3 py-3 w-40 text-right text-amber-400 font-bold">
                  Còn thiếu cần cấp
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              
              {/* DÒNG 1: TỔNG MỨC ĐẦU TƯ / TỔNG NHU CẦU VỐN */}
              <tr className="bg-slate-950/60 font-bold text-slate-100">
                <td className="px-4 py-3 border-r border-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  TỔNG NHU CẦU VỐN (TMĐT)
                </td>
                <td className="px-3 py-3 text-right font-mono text-emerald-400 font-black border-r border-slate-800 text-xs">
                  {formatMoney(totalTMDT)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-blue-400 font-black border-r border-slate-800 text-xs">
                  {formatMoney(totalAllocatedAllYears)}
                </td>
                {yearsList.map(yr => {
                  const yrData = matrixYears.find(m => m.year === yr);
                  return (
                    <td key={yr} className="px-3 py-3 text-right font-mono font-bold text-slate-200 border-r border-slate-800">
                      {formatMoney(yrData?.totalAllocated || 0)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right font-mono font-black text-amber-400 text-xs">
                  {formatMoney(remainingBudgetNeeded)}
                </td>
              </tr>

              {/* PHÂN RÃ THEO TỪNG NGUỒN VỐN */}
              {sourcesSummary.map((src, idx) => {
                const isTP = src.name === 'Ngân sách Thành phố';
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 text-slate-300">
                    <td className="px-4 py-2.5 pl-8 border-r border-slate-800/80 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      {src.name}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-purple-300 border-r border-slate-800/80">
                      {isTP ? formatMoney(totalTMDT) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-300 font-semibold border-r border-slate-800/80">
                      {formatMoney(src.total)}
                    </td>
                    {yearsList.map(yr => (
                      <td key={yr} className="px-3 py-2.5 text-right font-mono text-slate-300 border-r border-slate-800/80">
                        {formatMoney(src.byYear[yr] || 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                      {isTP ? formatMoney(Math.max(0, totalTMDT - src.total)) : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* DÒNG TỶ LỆ HOÀN THÀNH (%) */}
              <tr className="bg-slate-950/40 font-semibold text-slate-400 text-[11px]">
                <td className="px-4 py-2.5 border-r border-slate-800">
                  Tỷ lệ bố trí vốn / TMĐT (%)
                </td>
                <td className="px-3 py-2.5 text-right font-mono border-r border-slate-800 text-purple-400">
                  100%
                </td>
                <td className="px-3 py-2.5 text-right font-mono border-r border-slate-800 text-blue-400 font-bold">
                  {allocationPercent}%
                </td>
                {yearsList.map(yr => {
                  const yrData = matrixYears.find(m => m.year === yr);
                  const yrPercent = totalTMDT > 0 ? (((yrData?.totalAllocated || 0) / totalTMDT) * 100).toFixed(1) : 0;
                  return (
                    <td key={yr} className="px-3 py-2.5 text-right font-mono border-r border-slate-800 text-slate-400">
                      {yrPercent > 0 ? `${yrPercent}%` : '-'}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-right font-mono text-amber-400 font-bold">
                  {(100 - allocationPercent).toFixed(1)}%
                </td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
