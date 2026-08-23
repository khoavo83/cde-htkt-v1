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
  Download,
  AlertTriangle
} from 'lucide-react';
import { formatMoneyVN } from '@/lib/formatters';

export default function DisbursementReconciliationView({
  items = [],
  disbursements = [],
  allocations = [],
  totalTMDT = 0,
  totalAllocated = 0
}) {
  // Định dạng tiền tệ VNĐ chuẩn
  const formatMoney = (val) => {
    if (val === null || val === undefined || val === '' || Number(val) === 0) return '-';
    return formatMoneyVN(val);
  };

  // Tổng hợp dữ liệu giải ngân theo từng khoản mục chi phí TMĐT
  const reconciliationData = useMemo(() => {
    // 1. Phân bổ các chứng từ giải ngân vào item tương ứng
    const itemDisbMap = {};

    disbursements.forEach(d => {
      const itemId = d.investment_item_id || 'unassigned';
      if (!itemDisbMap[itemId]) {
        itemDisbMap[itemId] = {
          advance: 0,      // Tạm ứng
          payment: 0,      // Thanh toán KL A-B
          recovered: 0,    // Thu hồi tạm ứng
          totalNet: 0,     // Thực giải ngân = advance + payment - recovered
          outstandingAdvance: 0 // Dư nợ tạm ứng = advance - recovered
        };
      }

      const amt = Number(d.amount || 0);
      if (d.disbursement_type === 'tam_ung') {
        itemDisbMap[itemId].advance += amt;
        itemDisbMap[itemId].totalNet += amt;
      } else if (d.disbursement_type === 'thu_hoi_tam_ung') {
        itemDisbMap[itemId].recovered += amt;
        itemDisbMap[itemId].totalNet -= amt;
      } else {
        // thanh_toan_kl
        itemDisbMap[itemId].payment += amt;
        itemDisbMap[itemId].totalNet += amt;
      }
      itemDisbMap[itemId].outstandingAdvance = Math.max(0, itemDisbMap[itemId].advance - itemDisbMap[itemId].recovered);
    });

    // 2. Dựng cây phẳng để hiển thị
    const itemMap = {};
    const roots = [];

    items.forEach(item => {
      const disb = itemDisbMap[item.id] || { advance: 0, payment: 0, recovered: 0, totalNet: 0, outstandingAdvance: 0 };
      itemMap[item.id] = { ...item, disb, children: [] };
    });

    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        roots.push(itemMap[item.id]);
      }
    });

    // Hàm rollup tính tổng giải ngân từ con lên cha
    const rollupDisb = (node) => {
      if (node.children.length > 0) {
        let childAdvance = 0;
        let childPayment = 0;
        let childRecovered = 0;
        let childTotalNet = 0;

        node.children.forEach(child => {
          rollupDisb(child);
          childAdvance += child.disb.advance;
          childPayment += child.disb.payment;
          childRecovered += child.disb.recovered;
          childTotalNet += child.disb.totalNet;
        });

        // Nếu node cha chưa có giải ngân trực tiếp thì gán tổng từ các con
        if (node.disb.totalNet === 0) {
          node.disb = {
            advance: childAdvance,
            payment: childPayment,
            recovered: childRecovered,
            totalNet: childTotalNet,
            outstandingAdvance: Math.max(0, childAdvance - childRecovered)
          };
        }
      }
    };
    roots.forEach(r => rollupDisb(r));

    // Duyệt phẳng danh sách kèm depth
    const flatList = [];
    const traverse = (nodes, depth = 0) => {
      nodes.forEach(node => {
        flatList.push({ ...node, depth });
        if (node.children.length > 0) traverse(node.children, depth + 1);
      });
    };
    traverse(roots, 0);

    return flatList;
  }, [items, disbursements]);

  // Tính tổng hàng Root
  let totalAdvance = 0;
  let totalPayment = 0;
  let totalRecovered = 0;
  let totalNetDisbursed = 0;
  let totalOutstandingAdvance = 0;

  disbursements.forEach(d => {
    const amt = Number(d.amount || 0);
    if (d.disbursement_type === 'tam_ung') {
      totalAdvance += amt;
      totalNetDisbursed += amt;
    } else if (d.disbursement_type === 'thu_hoi_tam_ung') {
      totalRecovered += amt;
      totalNetDisbursed -= amt;
    } else {
      totalPayment += amt;
      totalNetDisbursed += amt;
    }
  });
  totalOutstandingAdvance = Math.max(0, totalAdvance - totalRecovered);

  const overallPercentOfAlloc = totalAllocated > 0 ? ((totalNetDisbursed / totalAllocated) * 100).toFixed(1) : 0;
  const overallPercentOfTMDT = totalTMDT > 0 ? ((totalNetDisbursed / totalTMDT) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4 font-sans text-slate-200">
      
      {/* ──── THẺ TỔNG QUAN SO KHỚP ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Hạn mức TMĐT Phê duyệt
          </span>
          <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
            {formatMoney(totalTMDT)}
          </span>
          <span className="text-[10px] text-slate-500">Trần dự toán tối đa</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Kế hoạch Vốn đã giao
          </span>
          <span className="text-base font-black text-blue-400 font-mono mt-0.5 block">
            {formatMoney(totalAllocated)}
          </span>
          <span className="text-[10px] text-blue-400/80 font-medium">
            Đạt {totalTMDT > 0 ? ((totalAllocated / totalTMDT) * 100).toFixed(1) : 0}% so với TMĐT
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Lũy kế Giải ngân thực tế
          </span>
          <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
            {formatMoney(totalNetDisbursed)}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full ${overallPercentOfAlloc >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(overallPercentOfAlloc, 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-amber-400 font-mono">{overallPercentOfAlloc}% vốn giao</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Dư nợ Tạm ứng chưa thu hồi
          </span>
          <span className="text-base font-black text-purple-400 font-mono mt-0.5 block">
            {formatMoney(totalOutstandingAdvance)}
          </span>
          <span className="text-[10px] text-purple-400/80 font-medium">
            Đã ứng: {formatMoney(totalAdvance)} | Đã thu: {formatMoney(totalRecovered)}
          </span>
        </div>

      </div>

      {/* ──── BẢNG SO KHỚP 3 CHIỀU (3-WAY RECONCILIATION TABLE) ──── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={15} /> Bảng Tổng Hợp So Khớp: TMĐT ↔ Kế Hoạch Vốn ↔ Hợp Đồng ↔ Giải Ngân
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kiểm soát hạn mức gói thầu, dòng tiền tạm ứng và tiến độ giải ngân từng khoản mục chi phí
            </p>
          </div>
          <span className="text-[11px] text-slate-500">Đơn vị: VNĐ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-md">
              <tr>
                <th className="px-2 py-3 w-14 text-center border-r border-slate-800">STT</th>
                <th className="px-3 py-3 min-w-[280px] border-r border-slate-800">Khoản mục chi phí TMĐT</th>
                <th className="px-3 py-3 w-36 text-right border-r border-slate-800 text-emerald-400 font-bold">
                  Hạn mức TMĐT (1)
                </th>
                <th className="px-3 py-3 w-32 text-right border-r border-slate-800 text-purple-400 font-semibold">
                  Đã tạm ứng (2)
                </th>
                <th className="px-3 py-3 w-32 text-right border-r border-slate-800 text-blue-400 font-semibold">
                  Thanh toán KL (3)
                </th>
                <th className="px-3 py-3 w-32 text-right border-r border-slate-800 text-slate-400">
                  Thu hồi ứng (4)
                </th>
                <th className="px-3 py-3 w-36 text-right border-r border-slate-800 text-amber-400 font-black bg-amber-950/20">
                  Thực giải ngân (5=2+3-4)
                </th>
                <th className="px-3 py-3 w-28 text-center border-r border-slate-800 font-bold">
                  Tỷ lệ / TMĐT
                </th>
                <th className="px-3 py-3 w-32 text-right border-r border-slate-800 text-purple-300 font-semibold">
                  Dư nợ tạm ứng (2-4)
                </th>
                <th className="px-3 py-3 w-36 text-right text-slate-300">
                  Dư địa TMĐT còn lại (1-5)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {reconciliationData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    Chưa có dữ liệu khoản mục chi phí nào.
                  </td>
                </tr>
              ) : (
                reconciliationData.map(item => {
                  const isRoot = item.depth === 0;
                  const costAfterTax = Number(item.cost_after_tax || 0);
                  const netDisb = item.disb.totalNet;
                  const itemPercent = costAfterTax > 0 ? ((netDisb / costAfterTax) * 100).toFixed(1) : 0;
                  const remainingTMDT = Math.max(0, costAfterTax - netDisb);

                  const rowBg = isRoot
                    ? 'bg-slate-950/70 font-semibold text-slate-100'
                    : item.depth === 1
                    ? 'bg-slate-900/40 text-slate-300'
                    : 'text-slate-400 hover:bg-slate-800/30';

                  return (
                    <tr key={item.id} className={`${rowBg} transition-colors`}>
                      
                      {/* STT */}
                      <td className={`px-2 py-2.5 text-center font-mono border-r border-slate-800/80 ${isRoot ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                        {item.item_code || '-'}
                      </td>

                      {/* Tên khoản mục (thụt lề) */}
                      <td className="px-3 py-2.5 border-r border-slate-800/80">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${item.depth * 18}px` }}>
                          <span className={`line-clamp-2 ${isRoot ? 'uppercase text-slate-100 font-bold text-[11px]' : ''}`} title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Hạn mức TMĐT */}
                      <td className={`px-3 py-2.5 text-right font-mono border-r border-slate-800/80 ${isRoot ? 'font-bold text-emerald-400' : 'text-emerald-300/90'}`}>
                        {formatMoney(costAfterTax)}
                      </td>

                      {/* Đã tạm ứng */}
                      <td className="px-3 py-2.5 text-right font-mono text-purple-400 border-r border-slate-800/80">
                        {formatMoney(item.disb.advance)}
                      </td>

                      {/* Thanh toán KL */}
                      <td className="px-3 py-2.5 text-right font-mono text-blue-400 border-r border-slate-800/80">
                        {formatMoney(item.disb.payment)}
                      </td>

                      {/* Thu hồi ứng */}
                      <td className="px-3 py-2.5 text-right font-mono text-slate-400 border-r border-slate-800/80">
                        {formatMoney(item.disb.recovered)}
                      </td>

                      {/* Thực giải ngân */}
                      <td className={`px-3 py-2.5 text-right font-mono font-black border-r border-slate-800/80 bg-amber-950/10 ${isRoot ? 'text-amber-400 text-xs' : 'text-amber-300'}`}>
                        {formatMoney(netDisb)}
                      </td>

                      {/* Tỷ lệ / TMĐT */}
                      <td className="px-3 py-2.5 text-center font-mono border-r border-slate-800/80">
                        {costAfterTax > 0 && netDisb > 0 ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            Number(itemPercent) >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {itemPercent}%
                          </span>
                        ) : '-'}
                      </td>

                      {/* Dư nợ tạm ứng */}
                      <td className="px-3 py-2.5 text-right font-mono text-purple-300 border-r border-slate-800/80">
                        {formatMoney(item.disb.outstandingAdvance)}
                      </td>

                      {/* Dư địa TMĐT còn lại */}
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300 font-semibold">
                        {formatMoney(remainingTMDT)}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Dòng TỔNG CỘNG */}
            <tfoot className="bg-slate-950 font-bold text-xs uppercase sticky bottom-0 z-10 border-t-2 border-amber-500/50 shadow-2xl text-slate-100">
              <tr>
                <td className="px-2 py-3 text-center text-amber-400 font-mono border-r border-slate-800">V</td>
                <td className="px-3 py-3 text-amber-400 border-r border-slate-800">TỔNG CỘNG TOÀN DỰ ÁN</td>
                <td className="px-3 py-3 text-right font-mono font-black text-emerald-400 border-r border-slate-800">
                  {formatMoney(totalTMDT)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-purple-400 border-r border-slate-800">
                  {formatMoney(totalAdvance)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-blue-400 border-r border-slate-800">
                  {formatMoney(totalPayment)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-slate-400 border-r border-slate-800">
                  {formatMoney(totalRecovered)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-black text-amber-400 border-r border-slate-800 bg-amber-950/30 text-sm">
                  {formatMoney(totalNetDisbursed)}
                </td>
                <td className="px-3 py-3 text-center font-mono text-amber-400 border-r border-slate-800">
                  {overallPercentOfTMDT}%
                </td>
                <td className="px-3 py-3 text-right font-mono text-purple-300 border-r border-slate-800">
                  {formatMoney(totalOutstandingAdvance)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-slate-200">
                  {formatMoney(Math.max(0, totalTMDT - totalNetDisbursed))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

    </div>
  );
}
