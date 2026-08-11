import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET departments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
