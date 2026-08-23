import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRoles } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// PUT: Cập nhật thông tin vai trò, trạng thái, liên kết nhân sự
export async function PUT(request, { params }) {
  try {
    const authCheck = await requireRoles(request, ['admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await params;
    const body = await request.json();
    const { full_name, role, staff_id, is_active } = body;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE public.user_profiles
         SET 
           full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           staff_id = $3,
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          full_name !== undefined ? full_name : null,
          role !== undefined ? role : null,
          staff_id !== undefined ? staff_id : null,
          is_active !== undefined ? is_active : null,
          id
        ]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: res.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Lỗi PUT /api/users/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa hồ sơ người dùng và tài khoản auth
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireRoles(request, ['admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await params;

    // Không cho phép admin tự xóa chính mình
    if (authCheck.user?.id === id) {
      return NextResponse.json({ success: false, error: 'Bạn không thể tự xóa tài khoản của chính mình!' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Xóa trong public.user_profiles
      await client.query(`DELETE FROM public.user_profiles WHERE id = $1`, [id]);
      
      // Xóa trong auth.users
      await client.query(`DELETE FROM auth.users WHERE id = $1`, [id]);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Lỗi DELETE /api/users/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
