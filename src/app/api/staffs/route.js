import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('staffs')
      .select(`
        *,
        issuing_agencies (
          id,
          name,
          abbreviation
        ),
        staff_departments (
          role,
          departments (
            id,
            name,
            type
          )
        )
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Map data to simpler format
    const formattedData = data.map(staff => {
      return {
        ...staff,
        departments: staff.staff_departments.map(sd => ({
          id: sd.departments.id,
          name: sd.departments.name,
          type: sd.departments.type,
          role: sd.role
        }))
      };
    });

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("GET staffs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, full_name, short_name, position, phone, dob, email, avatar_url, notes, departments, agency_id } = body;

    // 1. Upsert Staff
    const staffData = {
      full_name,
      short_name,
      position,
      phone,
      dob,
      email,
      avatar_url,
      notes,
      agency_id: agency_id || null,
      updated_at: new Date().toISOString()
    };

    let savedStaffId = id;

    if (id) {
      const { error: updateErr } = await supabase.from('staffs').update(staffData).eq('id', id);
      if (updateErr) throw updateErr;
    } else {
      const { data, error: insertErr } = await supabase.from('staffs').insert(staffData).select('id').single();
      if (insertErr) throw insertErr;
      savedStaffId = data.id;
    }

    // 2. Update staff_departments (Delete all then Insert)
    if (savedStaffId) {
      await supabase.from('staff_departments').delete().eq('staff_id', savedStaffId);
      
      if (departments && departments.length > 0) {
        const inserts = departments.map(d => ({
          staff_id: savedStaffId,
          department_id: d.id,
          role: d.role || 'Thành viên'
        }));
        
        const { error: depErr } = await supabase.from('staff_departments').insert(inserts);
        if (depErr) throw depErr;
      }
    }

    return NextResponse.json({ success: true, id: savedStaffId });
  } catch (error) {
    console.error("POST staffs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
