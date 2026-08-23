import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách nhân sự và phân quyền hiện tại
export async function GET() {
  try {
    // 1. Lấy danh sách nhân sự
    const { data: staffs, error: staffErr } = await supabase
      .from('staffs')
      .select('id, full_name, short_name, position, email, phone, avatar_url')
      .order('full_name', { ascending: true });

    if (staffErr) throw staffErr;

    // 2. Lấy thông tin user_profiles
    const resProfiles = await query(`
      SELECT 
        up.id as user_id, 
        up.email, 
        up.role, 
        up.staff_id, 
        up.is_active, 
        up.full_name,
        u.email_confirmed_at
      FROM public.user_profiles up
      LEFT JOIN auth.users u ON up.id = u.id
    `);
    const profiles = resProfiles.rows || [];

    // 3. Ghép nối nhân sự với vai trò phân quyền
    const result = staffs.map(staff => {
      const matched = profiles.find(p => 
        (p.staff_id && p.staff_id === staff.id) ||
        (staff.email && p.email && p.email.trim().toLowerCase() === staff.email.trim().toLowerCase())
      );

      return {
        id: staff.id,
        full_name: staff.full_name,
        short_name: staff.short_name,
        position: staff.position || 'Chuyên viên',
        email: staff.email || '',
        phone: staff.phone || '',
        avatar_url: staff.avatar_url || '',
        role: matched ? (matched.role || 'viewer') : null, // 'admin' | 'editor' | 'viewer' | null
        is_active: matched ? (matched.is_active ?? true) : false,
        user_id: matched ? matched.user_id : null,
        account_email: matched ? matched.email : null
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET permissions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Gán hoặc đổi vai trò phân quyền cho nhân sự
export async function POST(request) {
  try {
    const body = await request.json();
    const { staff_id, email, role, is_active = true, password } = body;

    if (!staff_id) {
      return NextResponse.json({ success: false, error: 'Thiếu staff_id' }, { status: 400 });
    }

    // 1. Lấy thông tin nhân sự
    const { data: staff, error: sErr } = await supabase
      .from('staffs')
      .select('*')
      .eq('id', staff_id)
      .single();

    if (sErr || !staff) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nhân sự' }, { status: 404 });
    }

    const staffEmail = (email || staff.email || '').trim().toLowerCase();

    if (!staffEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nhân sự này chưa có Email. Vui lòng cập nhật Email cho nhân sự trước khi phân quyền!' 
      }, { status: 400 });
    }

    // Cập nhật lại email vào bảng staffs nếu chưa có
    if (!staff.email) {
      await supabase.from('staffs').update({ email: staffEmail }).eq('id', staff_id);
    }

    // 2. Kiểm tra hoặc tạo user trong auth.users
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;`);

    const userCheck = await query(`SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)`, [staffEmail]);
    let userId = userCheck.rows[0]?.id;

    const roleToSet = role || 'viewer';
    const passToUse = password && password.trim().length >= 6 ? password.trim() : 'Admin@123456';

    if (userId) {
      // Cập nhật user hiện có
      if (password && password.trim().length >= 6) {
        await query(`
          UPDATE auth.users 
          SET encrypted_password = extensions.crypt($1::text, extensions.gen_salt('bf', 10)),
              raw_user_meta_data = json_build_object('full_name', $2::text, 'role', $3::text),
              email_confirmed_at = NOW(),
              updated_at = NOW()
          WHERE id = $4
        `, [password.trim(), staff.full_name, roleToSet, userId]);
      } else {
        await query(`
          UPDATE auth.users 
          SET raw_user_meta_data = json_build_object('full_name', $1::text, 'role', $2::text),
              email_confirmed_at = NOW(),
              updated_at = NOW()
          WHERE id = $3
        `, [staff.full_name, roleToSet, userId]);
      }
    } else {
      // Tạo user mới
      const insUser = await query(`
        INSERT INTO auth.users (
          instance_id, 
          id, 
          aud, 
          role, 
          email, 
          encrypted_password, 
          email_confirmed_at, 
          confirmation_token,
          recovery_token,
          email_change_token_new,
          email_change_token_current,
          reauthentication_token,
          email_change,
          phone_change,
          phone_change_token,
          raw_app_meta_data, 
          raw_user_meta_data, 
          created_at, 
          updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', 
          gen_random_uuid(), 
          'authenticated', 
          'authenticated', 
          $1::text, 
          extensions.crypt($2::text, extensions.gen_salt('bf', 10)), 
          NOW(), 
          '', '', '', '', '', '', '', '',
          '{"provider":"email","providers":["email"]}'::jsonb, 
          json_build_object('sub', $1::text, 'email', $1::text, 'full_name', $3::text, 'role', $4::text), 
          NOW(), 
          NOW()
        ) RETURNING id
      `, [staffEmail, passToUse, staff.full_name, roleToSet]);

      userId = insUser.rows[0].id;
    }

    // 3. Đảm bảo bản ghi trong auth.identities
    await query(`DELETE FROM auth.identities WHERE user_id = $1::uuid OR email = $2::text`, [userId, staffEmail]);
    await query(`
      INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::text,
        $1::uuid,
        json_build_object('sub', $1::text, 'email', $2::text, 'full_name', $3::text, 'role', $4::text, 'email_verified', true, 'phone_verified', false),
        'email',
        NOW(),
        NOW(),
        NOW()
      )
    `, [userId, staffEmail, staff.full_name, roleToSet]);

    // 4. Ghi nhận vào public.user_profiles
    await query(`
      INSERT INTO public.user_profiles (id, email, full_name, role, staff_id, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET 
        email = $2,
        full_name = $3,
        role = $4,
        staff_id = $5,
        is_active = $6,
        updated_at = NOW()
    `, [userId, staffEmail, staff.full_name, roleToSet, staff_id, is_active]);

    return NextResponse.json({ 
      success: true, 
      message: `Đã gán vai trò [${roleToSet.toUpperCase()}] cho ${staff.full_name}` 
    });
  } catch (error) {
    console.error("POST permissions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hủy quyền truy cập của nhân sự
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const staff_id = searchParams.get('staff_id');

    if (!staff_id) {
      return NextResponse.json({ success: false, error: 'Thiếu staff_id' }, { status: 400 });
    }

    await query(`
      UPDATE public.user_profiles 
      SET staff_id = NULL, is_active = false, updated_at = NOW() 
      WHERE staff_id = $1
    `, [staff_id]);

    return NextResponse.json({ success: true, message: 'Đã hủy quyền truy cập của nhân sự' });
  } catch (error) {
    console.error("DELETE permissions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
