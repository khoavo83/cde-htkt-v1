import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Lấy danh sách dự án
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, basic_info, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, projects: data || [] });
  } catch (error) {
    console.error('Lỗi khi tải danh sách dự án:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách dự án' }, { status: 500 });
  }
}

// Xóa dự án (Chỉ cho phép xóa từ API riêng nếu cần)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID dự án' }, { status: 400 });
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa dự án' });
  } catch (error) {
    console.error('Lỗi khi xóa dự án:', error);
    return NextResponse.json({ success: false, error: 'Không thể xóa dự án' }, { status: 500 });
  }
}
