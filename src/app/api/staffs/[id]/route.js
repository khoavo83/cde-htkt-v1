import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu ID' }, { status: 400 });

    const { error } = await supabase.from('staffs').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE staff error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
