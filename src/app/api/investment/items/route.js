import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Hàm tính toán lại tổng tiền của Version
async function recalculateVersionTotal(versionId) {
  try {
    const { data: items } = await supabase
      .from('investment_items')
      .select('parent_id, cost_before_tax, vat_cost, cost_after_tax')
      .eq('version_id', versionId);

    if (!items) return;

    // Chỉ tính tổng các node gốc (parent_id is null) để tránh cộng trùng lặp
    const rootItems = items.filter(i => !i.parent_id);
    const totalBeforeTax = rootItems.reduce((sum, i) => sum + Number(i.cost_before_tax || 0), 0);
    const totalVat = rootItems.reduce((sum, i) => sum + Number(i.vat_cost || 0), 0);
    const totalAfterTax = rootItems.reduce((sum, i) => sum + Number(i.cost_after_tax || 0), 0);

    await supabase
      .from('investment_versions')
      .update({
        total_before_tax: totalBeforeTax,
        total_vat: totalVat,
        total_after_tax: totalAfterTax,
        updated_at: new Date().toISOString()
      })
      .eq('id', versionId);
  } catch (e) {
    console.error('Lỗi khi tính lại tổng version:', e);
  }
}

// GET: Lấy danh sách khoản mục TMĐT theo versionId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json({ success: false, error: 'Thiếu versionId' }, { status: 400 });
    }

    // 1. Lấy tất cả items của version
    const { data: items, error } = await supabase
      .from('investment_items')
      .select('*')
      .eq('version_id', versionId)
      .order('item_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 2. Lấy thông tin giải ngân theo từng khoản mục
    const { data: disbursements, error: disbError } = await supabase
      .from('disbursements')
      .select('investment_item_id, amount, disbursement_type');

    const disbMap = {};
    if (!disbError && disbursements) {
      for (const d of disbursements) {
        if (!d.investment_item_id) continue;
        const current = disbMap[d.investment_item_id] || 0;
        // Thu hồi tạm ứng thì trừ đi
        if (d.disbursement_type === 'thu_hoi_tam_ung') {
          disbMap[d.investment_item_id] = current - Number(d.amount || 0);
        } else {
          disbMap[d.investment_item_id] = current + Number(d.amount || 0);
        }
      }
    }

    // Gắn thông tin giải ngân vào items
    const enrichedItems = (items || []).map(item => {
      const disbursedAmount = disbMap[item.id] || 0;
      const costAfterTax = Number(item.cost_after_tax || 0);
      const disbursedPercent = costAfterTax > 0 ? ((disbursedAmount / costAfterTax) * 100).toFixed(1) : 0;
      return {
        ...item,
        disbursed_amount: disbursedAmount,
        disbursed_percent: Number(disbursedPercent)
      };
    });

    return NextResponse.json({ success: true, items: enrichedItems });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khoản mục TMĐT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Thêm mới khoản mục TMĐT
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      versionId,
      projectId,
      parentId,
      itemOrder,
      itemCode,
      name,
      calcSymbol,
      calcRef,
      calcRate,
      calcAdjustRate,
      costBeforeTax,
      vatRate,
      vatCost,
      costAfterTax,
      contractNo,
      notes
    } = body;

    if (!versionId || !projectId || !name) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc (versionId, projectId, name)' }, { status: 400 });
    }

    const { data: newItem, error } = await supabase
      .from('investment_items')
      .insert({
        version_id: versionId,
        project_id: projectId,
        parent_id: parentId || null,
        item_order: Number(itemOrder || 0),
        item_code: itemCode || '',
        name: name,
        calc_symbol: calcSymbol || '',
        calc_ref: calcRef || '',
        calc_rate: calcRate !== undefined && calcRate !== null && calcRate !== '' ? Number(calcRate) : null,
        calc_adjust_rate: calcAdjustRate !== undefined && calcAdjustRate !== null && calcAdjustRate !== '' ? Number(calcAdjustRate) : null,
        cost_before_tax: Number(costBeforeTax || 0),
        vat_rate: Number(vatRate || 0),
        vat_cost: Number(vatCost || 0),
        cost_after_tax: Number(costAfterTax || 0),
        contract_no: contractNo || '',
        notes: notes || ''
      })
      .select()
      .single();

    if (error) throw error;

    // Tính toán lại tổng tiền của version
    await recalculateVersionTotal(versionId);

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Lỗi khi tạo khoản mục TMĐT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật khoản mục TMĐT
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      versionId,
      parentId,
      itemOrder,
      itemCode,
      name,
      calcSymbol,
      calcRef,
      calcRate,
      calcAdjustRate,
      costBeforeTax,
      vatRate,
      vatCost,
      costAfterTax,
      contractNo,
      notes
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu item id' }, { status: 400 });
    }

    const updatePayload = {};
    if (parentId !== undefined) updatePayload.parent_id = parentId || null;
    if (itemOrder !== undefined) updatePayload.item_order = Number(itemOrder);
    if (itemCode !== undefined) updatePayload.item_code = itemCode;
    if (name !== undefined) updatePayload.name = name;
    if (calcSymbol !== undefined) updatePayload.calc_symbol = calcSymbol;
    if (calcRef !== undefined) updatePayload.calc_ref = calcRef;
    if (calcRate !== undefined) updatePayload.calc_rate = calcRate !== null && calcRate !== '' ? Number(calcRate) : null;
    if (calcAdjustRate !== undefined) updatePayload.calc_adjust_rate = calcAdjustRate !== null && calcAdjustRate !== '' ? Number(calcAdjustRate) : null;
    if (costBeforeTax !== undefined) updatePayload.cost_before_tax = Number(costBeforeTax);
    if (vatRate !== undefined) updatePayload.vat_rate = Number(vatRate);
    if (vatCost !== undefined) updatePayload.vat_cost = Number(vatCost);
    if (costAfterTax !== undefined) updatePayload.cost_after_tax = Number(costAfterTax);
    if (contractNo !== undefined) updatePayload.contract_no = contractNo;
    if (notes !== undefined) updatePayload.notes = notes;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('investment_items')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (versionId || updated.version_id) {
      await recalculateVersionTotal(versionId || updated.version_id);
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Lỗi khi cập nhật khoản mục TMĐT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa khoản mục TMĐT
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const versionId = searchParams.get('versionId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu item id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('investment_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (versionId) {
      await recalculateVersionTotal(versionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xóa khoản mục TMĐT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
