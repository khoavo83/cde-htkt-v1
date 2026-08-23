import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách hợp đồng hoặc phụ lục
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const packageId = searchParams.get('packageId');

    let query = supabase
      .from('contracts')
      .select(`
        *,
        packages (
          id, package_code, package_name, estimated_price, investment_item_id
        ),
        contract_appendices (*)
      `)
      .order('created_at', { ascending: true });

    if (projectId) query = query.eq('project_id', projectId);
    if (packageId) query = query.eq('package_id', packageId);

    const { data: contracts, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, contracts: contracts || [] });
  } catch (error) {
    console.error('Lỗi GET /api/procurement/contracts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Thêm mới Hợp đồng hoặc Phụ lục HĐ
export async function POST(request) {
  try {
    const body = await request.json();
    const { type } = body;

    // 1. Thêm Phụ lục hợp đồng
    if (type === 'appendix') {
      const { contract_id, appendix_no, appendix_type, sign_date, delta_amount, new_end_date, notes, document_path } = body;

      if (!contract_id || !appendix_no) {
        return NextResponse.json({ success: false, error: 'Thiếu thông tin phụ lục hợp đồng' }, { status: 400 });
      }

      const { data: appData, error: appError } = await supabase
        .from('contract_appendices')
        .insert({
          contract_id,
          appendix_no,
          appendix_type: appendix_type || 'BO_SUNG_KHOI_LUONG',
          sign_date: sign_date || null,
          delta_amount: Number(delta_amount || 0),
          new_end_date: new_end_date || null,
          notes: notes || null,
          document_path: document_path || null
        })
        .select()
        .single();

      if (appError) throw appError;

      // Cập nhật lại adjusted_contract_value của hợp đồng gốc
      const { data: allApps } = await supabase
        .from('contract_appendices')
        .select('delta_amount')
        .eq('contract_id', contract_id);

      const totalDelta = (allApps || []).reduce((sum, a) => sum + Number(a.delta_amount || 0), 0);

      const { data: contract } = await supabase
        .from('contracts')
        .select('contract_value')
        .eq('id', contract_id)
        .single();

      const newAdjustedValue = Number(contract?.contract_value || 0) + totalDelta;

      await supabase
        .from('contracts')
        .update({ adjusted_contract_value: newAdjustedValue, updated_at: new Date().toISOString() })
        .eq('id', contract_id);

      return NextResponse.json({ success: true, appendix: appData });
    }

    // 2. Thêm Hợp đồng mới
    const {
      project_id,
      package_id,
      contract_no,
      contract_name,
      contractor_name,
      contractor_tax_code,
      contractor_leader,
      sign_date,
      effective_date,
      end_date,
      contract_value,
      advance_guarantee_expiry,
      performance_guarantee_expiry,
      document_path,
      status,
      notes
    } = body;

    if (!project_id || !package_id || !contract_no || !contract_name || !contractor_name) {
      return NextResponse.json({ success: false, error: 'Vui lòng điền đủ thông tin (Gói thầu, Số HĐ, Tên HĐ, Nhà thầu)' }, { status: 400 });
    }

    const initialVal = Number(contract_value || 0);

    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .insert({
        project_id,
        package_id,
        contract_no,
        contract_name,
        contractor_name,
        contractor_tax_code: contractor_tax_code || null,
        contractor_leader: contractor_leader || null,
        sign_date: sign_date || null,
        effective_date: effective_date || null,
        end_date: end_date || null,
        contract_value: initialVal,
        adjusted_contract_value: initialVal,
        advance_guarantee_expiry: advance_guarantee_expiry || null,
        performance_guarantee_expiry: performance_guarantee_expiry || null,
        document_path: document_path || null,
        status: status || 'dang_thuc_hien',
        notes: notes || null
      })
      .select()
      .single();

    if (contractError) throw contractError;

    return NextResponse.json({ success: true, contract: contractData });
  } catch (error) {
    console.error('Lỗi POST /api/procurement/contracts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa hợp đồng hoặc phụ lục
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'appendix' | 'contract'

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID' }, { status: 400 });
    }

    if (type === 'appendix') {
      // Lấy contract_id trước khi xóa
      const { data: app } = await supabase
        .from('contract_appendices')
        .select('contract_id')
        .eq('id', id)
        .single();

      const contractId = app?.contract_id;

      const { error } = await supabase
        .from('contract_appendices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Tính lại adjusted_contract_value
      if (contractId) {
        const { data: allApps } = await supabase
          .from('contract_appendices')
          .select('delta_amount')
          .eq('contract_id', contractId);

        const totalDelta = (allApps || []).reduce((sum, a) => sum + Number(a.delta_amount || 0), 0);

        const { data: contract } = await supabase
          .from('contracts')
          .select('contract_value')
          .eq('id', contractId)
          .single();

        const newAdjustedValue = Number(contract?.contract_value || 0) + totalDelta;

        await supabase
          .from('contracts')
          .update({ adjusted_contract_value: newAdjustedValue, updated_at: new Date().toISOString() })
          .eq('id', contractId);
      }

      return NextResponse.json({ success: true, message: 'Đã xóa phụ lục thành công' });
    }

    // Xóa hợp đồng
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa hợp đồng thành công' });
  } catch (error) {
    console.error('Lỗi DELETE /api/procurement/contracts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
