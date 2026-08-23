import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách các phiên bản TMĐT của một dự án
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Thiếu projectId' }, { status: 400 });
    }

    const { data: versions, error } = await supabase
      .from('investment_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, versions: versions || [] });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phiên bản TMĐT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo phiên bản TMĐT mới (hoặc sao chép từ phiên bản cũ để làm bản điều chỉnh)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      projectId,
      versionCode, // 'V1', 'V2'...
      versionName,
      decisionNo,
      decisionDate,
      approvedBy,
      notes,
      cloneFromVersionId // Nếu có -> sao chép toàn bộ cây khoản mục từ version cũ
    } = body;

    if (!projectId || !versionCode || !versionName) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // 1. Tạo bản ghi phiên bản mới
    const { data: newVersion, error: verError } = await supabase
      .from('investment_versions')
      .insert({
        project_id: projectId,
        version_code: versionCode,
        version_name: versionName,
        decision_no: decisionNo,
        decision_date: decisionDate || null,
        approved_by: approvedBy,
        notes: notes,
        is_active: true
      })
      .select()
      .single();

    if (verError) throw verError;

    // Đặt các phiên bản khác thành không active nếu version mới là active
    await supabase
      .from('investment_versions')
      .update({ is_active: false })
      .eq('project_id', projectId)
      .neq('id', newVersion.id);

    // 2. Nếu có cloneFromVersionId -> sao chép toàn bộ cây items
    if (cloneFromVersionId) {
      const { data: oldItems, error: itemsError } = await supabase
        .from('investment_items')
        .select('*')
        .eq('version_id', cloneFromVersionId)
        .order('item_order', { ascending: true });

      if (!itemsError && oldItems && oldItems.length > 0) {
        // Map lưu id cũ -> id mới để tái tạo đúng liên kết cha con
        const idMap = {};
        
        // Phân tách items theo độ sâu hoặc duyệt theo thứ tự cha trước con sau
        // Xử lý các node gốc trước (parent_id is null)
        const roots = oldItems.filter(i => !i.parent_id);
        const nonRoots = oldItems.filter(i => i.parent_id);

        for (const root of roots) {
          const { data: insertedRoot } = await supabase
            .from('investment_items')
            .insert({
              version_id: newVersion.id,
              project_id: projectId,
              parent_id: null,
              item_order: root.item_order,
              item_code: root.item_code,
              name: root.name,
              calc_symbol: root.calc_symbol,
              calc_ref: root.calc_ref,
              calc_rate: root.calc_rate,
              calc_adjust_rate: root.calc_adjust_rate,
              cost_before_tax: root.cost_before_tax,
              vat_rate: root.vat_rate,
              vat_cost: root.vat_cost,
              cost_after_tax: root.cost_after_tax,
              contract_no: root.contract_no,
              notes: root.notes
            })
            .select()
            .single();

          if (insertedRoot) {
            idMap[root.id] = insertedRoot.id;
          }
        }

        // Xử lý các node con
        // Để đảm bảo duyệt được nhiều cấp (1 -> 1.1 -> 1.1.1), lặp cho đến khi hết nonRoots
        let remaining = [...nonRoots];
        let maxLoops = 10;
        while (remaining.length > 0 && maxLoops > 0) {
          const nextRemaining = [];
          for (const item of remaining) {
            if (idMap[item.parent_id]) {
              const { data: insertedChild } = await supabase
                .from('investment_items')
                .insert({
                  version_id: newVersion.id,
                  project_id: projectId,
                  parent_id: idMap[item.parent_id],
                  item_order: item.item_order,
                  item_code: item.item_code,
                  name: item.name,
                  calc_symbol: item.calc_symbol,
                  calc_ref: item.calc_ref,
                  calc_rate: item.calc_rate,
                  calc_adjust_rate: item.calc_adjust_rate,
                  cost_before_tax: item.cost_before_tax,
                  vat_rate: item.vat_rate,
                  vat_cost: item.vat_cost,
                  cost_after_tax: item.cost_after_tax,
                  contract_no: item.contract_no,
                  notes: item.notes
                })
                .select()
                .single();

              if (insertedChild) {
                idMap[item.id] = insertedChild.id;
              }
            } else {
              nextRemaining.push(item);
            }
          }
          remaining = nextRemaining;
          maxLoops--;
        }
      }
    }

    return NextResponse.json({ success: true, version: newVersion });
  } catch (error) {
    console.error('Lỗi khi tạo phiên bản TMĐT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin phiên bản hoặc chuyển active
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, projectId, versionCode, versionName, decisionNo, decisionDate, approvedBy, notes, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu version id' }, { status: 400 });
    }

    if (isActive && projectId) {
      await supabase
        .from('investment_versions')
        .update({ is_active: false })
        .eq('project_id', projectId);
    }

    const updatePayload = {};
    if (versionCode !== undefined) updatePayload.version_code = versionCode;
    if (versionName !== undefined) updatePayload.version_name = versionName;
    if (decisionNo !== undefined) updatePayload.decision_no = decisionNo;
    if (decisionDate !== undefined) updatePayload.decision_date = decisionDate || null;
    if (approvedBy !== undefined) updatePayload.approved_by = approvedBy;
    if (notes !== undefined) updatePayload.notes = notes;
    if (isActive !== undefined) updatePayload.is_active = isActive;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('investment_versions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, version: updated });
  } catch (error) {
    console.error('Lỗi khi cập nhật phiên bản:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa phiên bản
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu version id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('investment_versions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xóa phiên bản:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
