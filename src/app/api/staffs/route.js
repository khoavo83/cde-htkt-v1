import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { query } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Lấy toàn bộ danh sách nhân sự kèm Tổ/Nhóm và Nơi phát hành
    const { data: staffsData, error: staffErr } = await supabase
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

    if (staffErr) throw staffErr;

    // 2. Lấy thông tin user_profiles tương ứng
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

    // 3. Ghép nối dữ liệu nhân sự và tài khoản phân quyền
    const formattedData = staffsData.map(staff => {
      // Tìm profile khớp theo staff_id hoặc theo email
      const matchedProfile = profiles.find(p => 
        (p.staff_id && p.staff_id === staff.id) ||
        (staff.email && p.email && p.email.trim().toLowerCase() === staff.email.trim().toLowerCase())
      );

      return {
        ...staff,
        departments: (staff.staff_departments || []).map(sd => ({
          id: sd.departments?.id,
          name: sd.departments?.name,
          type: sd.departments?.type,
          role: sd.role
        })),
        account: matchedProfile ? {
          user_id: matchedProfile.user_id,
          email: matchedProfile.email,
          role: matchedProfile.role || 'viewer',
          is_active: matchedProfile.is_active ?? true,
          confirmed: !!matchedProfile.email_confirmed_at
        } : null
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
    const { 
      id, 
      full_name, 
      short_name, 
      position, 
      phone, 
      dob, 
      email, 
      avatar_url, 
      notes, 
      departments, 
      agency_id,
      account // { enabled: boolean, role: string, password?: string, is_active?: boolean }
    } = body;

    // 1. Upsert Staff (Đảm bảo 100% dữ liệu nhân sự được lưu an toàn)
    const staffData = {
      full_name: full_name?.trim() || '',
      short_name: short_name?.trim() || '',
      position: position?.trim() || 'Chuyên viên',
      phone: phone?.trim() || '',
      dob: dob || '',
      email: email?.trim() || '',
      avatar_url: avatar_url || '',
      notes: notes || '',
      agency_id: agency_id ? parseInt(agency_id, 10) : null,
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

    // 2. Cập nhật Tổ/Nhóm (staff_departments)
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

    // 3. Xử lý Phân quyền & Cấp tài khoản đăng nhập (Unified RBAC)
    if (account) {
      const staffEmail = (account.email || email || '').trim().toLowerCase();

      if (account.enabled && staffEmail) {
        await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;`);

        // Kiểm tra xem user đã tồn tại trong auth.users chưa
        const userCheck = await query(`SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)`, [staffEmail]);
        let userId = userCheck.rows[0]?.id;

        const roleToSet = account.role || 'viewer';
        const passToUse = account.password && account.password.trim().length >= 6 
          ? account.password.trim() 
          : 'Cde@123456';

        if (userId) {
          // User đã tồn tại -> Cập nhật thông tin và mật khẩu (nếu có nhập)
          if (account.password && account.password.trim().length >= 6) {
            await query(`
              UPDATE auth.users 
              SET encrypted_password = extensions.crypt($1::text, extensions.gen_salt('bf', 10)),
                  raw_user_meta_data = json_build_object('full_name', $2::text, 'role', $3::text),
                  email_confirmed_at = NOW(),
                  updated_at = NOW()
              WHERE id = $4
            `, [account.password.trim(), full_name, roleToSet, userId]);
          } else {
            await query(`
              UPDATE auth.users 
              SET raw_user_meta_data = json_build_object('full_name', $1::text, 'role', $2::text),
                  email_confirmed_at = NOW(),
                  updated_at = NOW()
              WHERE id = $3
            `, [full_name, roleToSet, userId]);
          }
        } else {
          // User chưa tồn tại -> Tạo mới trực tiếp vào auth.users & auth.identities
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
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '{"provider":"email","providers":["email"]}'::jsonb, 
              json_build_object('sub', $1::text, 'email', $1::text, 'full_name', $3::text, 'role', $4::text), 
              NOW(), 
              NOW()
            ) RETURNING id
          `, [staffEmail, passToUse, full_name, roleToSet]);

          userId = insUser.rows[0].id;
        }

        // Đảm bảo có record trong auth.identities
        await query(`
          DELETE FROM auth.identities WHERE user_id = $1::uuid OR email = $2::text;
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
          );
        `, [userId, staffEmail, full_name, roleToSet]);

        // Ghi nhận vào public.user_profiles
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
        `, [
          userId, 
          staffEmail, 
          full_name, 
          roleToSet, 
          savedStaffId, 
          account.is_active ?? true
        ]);
      } else if (account.enabled === false) {
        // Nếu hủy cấp quyền: Gỡ liên kết staff_id khỏi user_profiles hoặc tạm khóa
        await query(`
          UPDATE public.user_profiles 
          SET staff_id = NULL, is_active = false, updated_at = NOW() 
          WHERE staff_id = $1
        `, [savedStaffId]);
      }
    }

    return NextResponse.json({ success: true, id: savedStaffId });
  } catch (error) {
    console.error("POST staffs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
