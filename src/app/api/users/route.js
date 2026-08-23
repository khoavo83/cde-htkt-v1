import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRoles } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách toàn bộ người dùng và vai trò
export async function GET(request) {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          up.id,
          up.email,
          up.full_name,
          up.role,
          up.staff_id,
          up.avatar_url,
          up.is_active,
          up.created_at,
          up.updated_at,
          s.full_name AS staff_name,
          s.position AS staff_position,
          s.phone AS staff_phone
        FROM public.user_profiles up
        LEFT JOIN public.staffs s ON up.staff_id = s.id
        ORDER BY 
          CASE up.role
            WHEN 'admin' THEN 1
            WHEN 'editor' THEN 2
            WHEN 'viewer' THEN 3
            ELSE 4
          END,
          up.created_at DESC
      `;
      const res = await client.query(query);
      return NextResponse.json({ success: true, data: res.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Lỗi GET /api/users:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo hoặc cập nhật hồ sơ người dùng
export async function POST(request) {
  try {
    const authCheck = await requireRoles(request, ['admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { id, email, full_name, role, staff_id, is_active } = body;

    if (!id || !email || !full_name) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc (id, email, full_name)' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO public.user_profiles (id, email, full_name, role, staff_id, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE
         SET 
           email = EXCLUDED.email,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           staff_id = EXCLUDED.staff_id,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
         RETURNING *`,
        [
          id, 
          email, 
          full_name, 
          role || 'viewer', 
          staff_id || null, 
          is_active !== undefined ? is_active : true
        ]
      );
      return NextResponse.json({ success: true, data: res.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Lỗi POST /api/users:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
