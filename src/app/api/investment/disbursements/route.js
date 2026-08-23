import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách giải ngân theo projectId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Thiếu projectId' }, { status: 400 });
    }

    const { data: disbursements, error } = await supabase
      .from('disbursements')
      .select(`
        *,
        investment_items ( id, item_code, name, calc_symbol ),
        capital_allocations ( id, decision_no, year, allocation_phase )
      `)
      .eq('project_id', projectId)
      .order('disbursement_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, disbursements: disbursements || [] });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách giải ngân:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo chứng từ giải ngân mới
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      projectId,
      investmentItemId,
      capitalAllocationId,
      voucherNo,
      disbursementDate,
      amount,
      disbursementType, // 'tam_ung', 'thanh_toan_kl', 'thu_hoi_tam_ung'
      recipient,
      contractNo,
      description
    } = body;

    if (!projectId || !disbursementDate || !amount) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const { data: newDisb, error } = await supabase
      .from('disbursements')
      .insert({
        project_id: projectId,
        investment_item_id: investmentItemId || null,
        capital_allocation_id: capitalAllocationId || null,
        voucher_no: voucherNo || '',
        disbursement_date: disbursementDate,
        amount: Number(amount || 0),
        disbursement_type: disbursementType || 'thanh_toan_kl',
        recipient: recipient || '',
        contract_no: contractNo || '',
        description: description || ''
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, disbursement: newDisb });
  } catch (error) {
    console.error('Lỗi khi tạo giải ngân:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa giải ngân
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu disbursement id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('disbursements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xóa giải ngân:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
