'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2, 
  Folder, 
  FileText, 
  DollarSign,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { formatMoneyVN } from '@/lib/formatters';

export default function InvestmentTreeGrid({
  items = [],
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddSubItem
}) {
  // Quản lý trạng thái mở/đóng của từng node trong cây
  const [expandedNodes, setExpandedNodes] = useState({});

  // 1. Chuyển đổi mảng phẳng items thành cấu trúc Cây (Tree)
  const { tree, flatRenderList } = useMemo(() => {
    const itemMap = {};
    const roots = [];

    // Tạo bản sao và map
    items.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    // Ráp cây cha - con
    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        roots.push(itemMap[item.id]);
      }
    });

    // Sắp xếp các node theo item_order
    const sortTree = (nodes) => {
      nodes.sort((a, b) => (Number(a.item_order) || 0) - (Number(b.item_order) || 0));
      nodes.forEach(n => {
        if (n.children.length > 0) sortTree(n.children);
      });
    };
    sortTree(roots);

    // Duyệt cây để tạo danh sách phẳng hiển thị (Flat list with depth)
    const flatList = [];
    const traverse = (nodes, depth = 0) => {
      nodes.forEach(node => {
        flatList.push({ ...node, depth, hasChildren: node.children.length > 0 });
        const isExpanded = expandedNodes[node.id] !== false; // Mặc định mở
        if (node.children.length > 0 && isExpanded) {
          traverse(node.children, depth + 1);
        }
      });
    };
    traverse(roots, 0);

    return { tree: roots, flatRenderList: flatList };
  }, [items, expandedNodes]);

  // Toggle một node
  const toggleNode = (id) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  // Mở tất cả / Gấp tất cả
  const expandAll = () => setExpandedNodes({});
  const collapseAll = () => {
    const collapsed = {};
    items.forEach(item => { collapsed[item.id] = false; });
    setExpandedNodes(collapsed);
  };

  // Định dạng tiền tệ chuẩn VN
  const formatMoney = (val) => {
    if (val === null || val === undefined || val === '' || Number(val) === 0) return '-';
    return formatMoneyVN(val);
  };

  // Tính tổng hàng Root
  const rootItems = items.filter(i => !i.parent_id);
  const totalBeforeTax = rootItems.reduce((sum, i) => sum + Number(i.cost_before_tax || 0), 0);
  const totalVat = rootItems.reduce((sum, i) => sum + Number(i.vat_cost || 0), 0);
  const totalAfterTax = rootItems.reduce((sum, i) => sum + Number(i.cost_after_tax || 0), 0);
  const totalDisbursed = items.reduce((sum, i) => sum + Number(i.disbursed_amount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      
      {/* Thanh công cụ bảng */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-300">Cấu trúc Khoản mục TMĐT:</span>
          <span className="text-slate-500">({items.length} mục)</span>
          <div className="flex items-center gap-1.5 ml-3">
            <button
              onClick={expandAll}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
              title="Mở tất cả các nhánh"
            >
              <Maximize2 size={12} /> Mở tất cả
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
              title="Thu gọn tất cả"
            >
              <Minimize2 size={12} /> Gấp tất cả
            </button>
          </div>
        </div>

        <button
          onClick={() => onAddItem()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
        >
          <Plus size={14} /> Thêm Mục Gốc (I, II...)
        </button>
      </div>

      {/* Bảng TreeGrid cuộn */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-md border-b border-slate-800">
            <tr>
              <th className="px-3 py-3 w-16 text-center border-r border-slate-800">STT</th>
              <th className="px-4 py-3 min-w-[320px] border-r border-slate-800">Khoản mục chi phí</th>
              <th className="px-3 py-3 w-24 text-center border-r border-slate-800">Ký hiệu</th>
              <th className="px-3 py-3 w-44 border-r border-slate-800">Cách tính / Tham chiếu</th>
              <th className="px-3 py-3 w-36 text-right border-r border-slate-800">Trước thuế (VNĐ)</th>
              <th className="px-3 py-3 w-32 text-right border-r border-slate-800">Thuế VAT (VNĐ)</th>
              <th className="px-3 py-3 w-40 text-right border-r border-slate-800 text-emerald-400 font-bold">Sau thuế (VNĐ)</th>
              <th className="px-3 py-3 w-36 text-right border-r border-slate-800">Đã giải ngân</th>
              <th className="px-3 py-3 min-w-[160px] border-r border-slate-800">Căn cứ / Số HĐ</th>
              <th className="px-3 py-3 w-28 text-center sticky right-0 bg-slate-950">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {flatRenderList.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  Chưa có khoản mục chi phí nào trong phiên bản TMĐT này. Hãy bấm <b>"Thêm Mục Gốc"</b> để bắt đầu.
                </td>
              </tr>
            ) : (
              flatRenderList.map((item) => {
                const isRoot = item.depth === 0;
                const isExpanded = expandedNodes[item.id] !== false;
                const disbPercent = Number(item.disbursed_percent) || 0;

                // Màu nền theo cấp độ
                const rowBg = isRoot
                  ? 'bg-slate-950/70 hover:bg-slate-900 font-semibold text-slate-200'
                  : item.depth === 1
                  ? 'bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
                  : 'bg-transparent hover:bg-slate-800/40 text-slate-400';

                return (
                  <tr key={item.id} className={`${rowBg} transition-colors group`}>
                    
                    {/* Cột STT / Mã */}
                    <td className={`px-2 py-2.5 text-center font-mono border-r border-slate-800/60 ${isRoot ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                      {item.item_code || '-'}
                    </td>

                    {/* Cột Tên khoản mục (Thụt lề cây) */}
                    <td className="px-3 py-2.5 border-r border-slate-800/60">
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: `${item.depth * 20}px` }}>
                        {item.hasChildren ? (
                          <button
                            onClick={() => toggleNode(item.id)}
                            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                          >
                            {isExpanded ? <ChevronDown size={14} className="text-emerald-400" /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <span className="w-6 shrink-0 inline-flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                          </span>
                        )}

                        <span className={`line-clamp-2 ${isRoot ? 'text-slate-100 uppercase tracking-wide text-[11px]' : ''}`} title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {/* Ký hiệu */}
                    <td className="px-2 py-2.5 text-center font-mono text-amber-300/90 font-medium border-r border-slate-800/60">
                      {item.calc_symbol || '-'}
                    </td>

                    {/* Cách tính / Tham chiếu */}
                    <td className="px-3 py-2.5 text-[11px] text-slate-400 font-mono border-r border-slate-800/60">
                      <div className="line-clamp-2" title={item.calc_ref || ''}>
                        {item.calc_ref && <span className="text-slate-300">{item.calc_ref}</span>}
                        {item.calc_rate && (
                          <span className="ml-1 text-emerald-400">({(item.calc_rate * 100).toFixed(item.calc_rate < 0.01 ? 3 : 1)}%)</span>
                        )}
                        {item.calc_adjust_rate && (
                          <span className="ml-1 text-blue-400">(k={item.calc_adjust_rate})</span>
                        )}
                      </div>
                    </td>

                    {/* Trước thuế */}
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300 border-r border-slate-800/60">
                      {formatMoney(item.cost_before_tax)}
                    </td>

                    {/* VAT */}
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400 border-r border-slate-800/60">
                      {formatMoney(item.vat_cost)}
                      {item.vat_rate > 0 && <span className="text-[10px] text-slate-500 block">({item.vat_rate}%)</span>}
                    </td>

                    {/* Sau thuế */}
                    <td className={`px-3 py-2.5 text-right font-mono border-r border-slate-800/60 ${isRoot ? 'font-bold text-emerald-400 text-xs' : 'font-semibold text-emerald-300/90'}`}>
                      {formatMoney(item.cost_after_tax)}
                    </td>

                    {/* Đã giải ngân & Progress bar */}
                    <td className="px-3 py-2.5 text-right font-mono border-r border-slate-800/60">
                      <div>{formatMoney(item.disbursed_amount)}</div>
                      {item.cost_after_tax > 0 && item.disbursed_amount > 0 && (
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full ${disbPercent >= 100 ? 'bg-emerald-500' : disbPercent > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(disbPercent, 100)}%` }}
                          />
                        </div>
                      )}
                      {item.disbursed_percent > 0 && (
                        <span className="text-[10px] text-slate-500">{item.disbursed_percent}%</span>
                      )}
                    </td>

                    {/* Căn cứ pháp lý / Số HĐ */}
                    <td className="px-3 py-2.5 text-[11px] text-slate-400 border-r border-slate-800/60">
                      <div className="line-clamp-2">
                        {item.contract_no && (
                          <span className="text-emerald-400 font-medium block">{item.contract_no}</span>
                        )}
                        {item.notes && <span>{item.notes}</span>}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td className="px-2 py-2.5 text-center sticky right-0 bg-slate-900/90 backdrop-blur-sm">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onAddSubItem(item)}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title={`Thêm mục con (${item.item_code ? item.item_code + '.1' : ''})`}
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                          title="Sửa mục"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Xóa mục"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Dòng Tổng cộng TMĐT */}
          {items.length > 0 && (
            <tfoot className="bg-slate-950 font-bold text-xs uppercase sticky bottom-0 z-10 border-t-2 border-emerald-500/50 shadow-2xl">
              <tr className="text-slate-200">
                <td className="px-2 py-3 text-center text-emerald-400 font-mono border-r border-slate-800">V</td>
                <td className="px-4 py-3 text-emerald-400 border-r border-slate-800">
                  TỔNG CỘNG TỔNG MỨC ĐẦU TƯ
                </td>
                <td className="px-2 py-3 text-center font-mono text-amber-300 border-r border-slate-800">V</td>
                <td className="px-3 py-3 text-[10px] text-slate-400 font-mono border-r border-slate-800">
                  Ggpmb + Gxd + Gqlda + Gtv + Gk + Gdp
                </td>
                <td className="px-3 py-3 text-right font-mono border-r border-slate-800">
                  {formatMoney(totalBeforeTax)}
                </td>
                <td className="px-3 py-3 text-right font-mono border-r border-slate-800 text-slate-400">
                  {formatMoney(totalVat)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-black text-sm text-emerald-400 border-r border-slate-800 bg-emerald-950/30">
                  {formatMoney(totalAfterTax)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-blue-400 border-r border-slate-800">
                  {formatMoney(totalDisbursed)}
                </td>
                <td className="px-3 py-3 border-r border-slate-800 text-[11px] text-slate-500 font-mono">
                  Làm tròn: {formatMoneyVN(Math.round(totalAfterTax / 1000) * 1000)}
                </td>
                <td className="px-2 py-3 sticky right-0 bg-slate-950"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
