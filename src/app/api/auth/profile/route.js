import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// GET: Lấy profile hiện tại của người dùng
export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: auth.user,
      profile: auth.profile
    });
  } catch (error) {
    console.error('Lỗi GET /api/auth/profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin profile cá nhân
export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, avatar_url } = body;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE public.user_profiles
         SET 
           full_name = COALESCE($1, full_name),
           avatar_url = COALESCE($2, avatar_url),
           updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [full_name || null, avatar_url || null, auth.user.id]
      );

      return NextResponse.json({ success: true, profile: res.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Lỗi PUT /api/auth/profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
