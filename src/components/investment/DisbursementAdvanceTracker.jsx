'use client';

import { useMemo } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  DollarSign,
  Building
} from 'lucide-react';
import { formatMoneyVN } from '@/lib/formatters';

export default function DisbursementAdvanceTracker({ disbursements = [] }) {
  const formatMoney = (val) => {
    if (!val) return '0 đ';
    return formatMoneyVN(val);
  };

  // Gom nhóm theo từng Hợp đồng / Đơn vị thụ hưởng
  const contractAdvances = useMemo(() => {
    const map = {};

    disbursements.forEach(d => {
      const key = d.contract_no || d.recipient || 'Khác';
      if (!map[key]) {
        map[key] = {
          contractNo: d.contract_no || 'Chưa gắn số HĐ',
          recipient: d.recipient || 'Đang cập nhật',
          itemCode: d.investment_items?.item_code || '',
          itemName: d.investment_items?.name || 'Chi phí chung',
          totalAdvance: 0,
          totalRecovered: 0,
          vouchers: []
        };
      }

      const amt = Number(d.amount || 0);
      if (d.disbursement_type === 'tam_ung') {
        map[key].totalAdvance += amt;
        map[key].vouchers.push(d);
      } else if (d.disbursement_type === 'thu_hoi_tam_ung') {
        map[key].totalRecovered += amt;
        map[key].vouchers.push(d);
      }
    });

    // Chỉ lấy những hợp đồng có phát sinh tạm ứng
    return Object.values(map).filter(c => c.totalAdvance > 0).map(c => {
      const outstanding = Math.max(0, c.totalAdvance - c.totalRecovered);
      const recoveredPercent = c.totalAdvance > 0 ? ((c.totalRecovered / c.totalAdvance) * 100).toFixed(1) : 0;
      return {
        ...c,
        outstanding,
        recoveredPercent: Number(recoveredPercent)
      };
    });
  }, [disbursements]);

  return (
    <div className="space-y-4 font-sans text-slate-200">
      
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={15} /> Bảng Theo Dõi Dư Nợ Tạm Ứng & Thu Hồi Tạm Ứng Hợp Đồng
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kiểm soát số tiền đã tạm ứng cho nhà thầu/đơn vị và tỷ lệ thu hồi qua các đợt nghiệm thu A-B
            </p>
          </div>
          <span className="text-[11px] text-slate-500">Đơn vị: VNĐ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3">Số Hợp đồng / Căn cứ</th>
                <th className="px-3 py-3">Đơn vị thụ hưởng</th>
                <th className="px-3 py-3">Khoản mục TMĐT</th>
                <th className="px-3 py-3 text-right">Tổng tiền đã tạm ứng (VNĐ)</th>
                <th className="px-3 py-3 text-right">Đã thu hồi (VNĐ)</th>
                <th className="px-3 py-3 text-right text-purple-400 font-bold">Dư nợ tạm ứng còn lại</th>
                <th className="px-3 py-3 text-center">Tiến độ thu hồi (%)</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contractAdvances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Không có hợp đồng nào đang có phát sinh tạm ứng.
                  </td>
                </tr>
              ) : (
                contractAdvances.map((c, idx) => {
                  const isDone = c.outstanding === 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-400">
                        {c.contractNo}
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">
                        {c.recipient}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {c.itemCode ? `[${c.itemCode}] ` : ''}{c.itemName}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-purple-400">
                        {formatMoney(c.totalAdvance)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        {formatMoney(c.totalRecovered)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-amber-400">
                        {formatMoney(c.outstanding)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(c.recoveredPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold">{c.recoveredPercent}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isDone ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Đã thu hồi xong
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock size={10} /> Đang thu hồi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
