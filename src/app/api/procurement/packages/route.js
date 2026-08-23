import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách Gói thầu của dự án kèm Hợp đồng và TMĐT
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Thiếu projectId' }, { status: 400 });
    }

    const { data: packages, error } = await supabase
      .from('packages')
      .select(`
        *,
        investment_items (
          id, item_code, name, cost_after_tax
        ),
        contracts (
          *,
          contract_appendices (*)
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, packages: packages || [] });
  } catch (error) {
    console.error('Lỗi GET /api/procurement/packages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Thêm mới Gói thầu
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      project_id,
      investment_item_id,
      khlcnt_decision_no,
      khlcnt_decision_date,
      package_code,
      package_name,
      package_type,
      estimated_price,
      procurement_method,
      contract_type,
      bidding_quarter,
      execution_duration,
      status,
      notes
    } = body;

    if (!project_id || !package_code || !package_name) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc (Dự án, Mã gói, Tên gói thầu)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('packages')
      .insert({
        project_id,
        investment_item_id: investment_item_id || null,
        khlcnt_decision_no: khlcnt_decision_no || null,
        khlcnt_decision_date: khlcnt_decision_date || null,
        package_code,
        package_name,
        package_type: package_type || 'Tư vấn',
        estimated_price: Number(estimated_price || 0),
        procurement_method: procurement_method || 'Chỉ định thầu rút gọn',
        contract_type: contract_type || 'Trọn gói',
        bidding_quarter: bidding_quarter || 'Quý I/2026',
        execution_duration: execution_duration || '60 ngày',
        status: status || 'da_ky_hop_dong',
        notes: notes || null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, package: data });
  } catch (error) {
    console.error('Lỗi POST /api/procurement/packages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật Gói thầu
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID gói thầu' }, { status: 400 });
    }

    if (updateFields.estimated_price !== undefined) {
      updateFields.estimated_price = Number(updateFields.estimated_price || 0);
    }
    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('packages')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, package: data });
  } catch (error) {
    console.error('Lỗi PUT /api/procurement/packages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa Gói thầu
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID gói thầu' }, { status: 400 });
    }

    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa gói thầu thành công' });
  } catch (error) {
    console.error('Lỗi DELETE /api/procurement/packages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
