import { supabase } from '@/lib/supabase';
import pool from '@/lib/db';

/**
 * Xác thực token từ request và trả về thông tin user + profile
 * @param {Request} request 
 * @returns {Promise<{ user: any, profile: any } | null>}
 */
export async function getAuthUser(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    // Xác thực token với Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    // Lấy thông tin role & profile từ database
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT up.*, s.full_name as staff_name, s.position as staff_position 
         FROM public.user_profiles up
         LEFT JOIN public.staffs s ON up.staff_id = s.id
         WHERE up.id = $1`,
        [user.id]
      );

      let profile = res.rows[0];

      // Nếu chưa có profile trong bảng (fallback), tạo mặc định
      if (!profile) {
        const insertRes = await client.query(
          `INSERT INTO public.user_profiles (id, email, full_name, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
           RETURNING *`,
          [
            user.id,
            user.email,
            user.user_metadata?.full_name || user.email.split('@')[0],
            user.user_metadata?.role || 'viewer'
          ]
        );
        profile = insertRes.rows[0];
      }

      return { user, profile };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Lỗi getAuthUser:', err);
    return null;
  }
}

/**
 * Kiểm tra xem user có một trong các role cho phép không
 * @param {Request} request 
 * @param {string[]} allowedRoles ['admin', 'editor', 'viewer']
 * @returns {Promise<{ authorized: boolean, user?: any, profile?: any, error?: string, status?: number }>}
 */
export async function requireRoles(request, allowedRoles = ['admin']) {
  const auth = await getAuthUser(request);
  
  if (!auth || !auth.user) {
    return { authorized: false, error: 'Yêu cầu đăng nhập để thực hiện thao tác này', status: 401 };
  }

  if (!auth.profile?.is_active) {
    return { authorized: false, error: 'Tài khoản của bạn đã bị vô hiệu hóa', status: 403 };
  }

  const userRole = auth.profile?.role || 'viewer';

  // Admin luôn có mọi quyền
  if (userRole === 'admin' || allowedRoles.includes(userRole)) {
    return { authorized: true, user: auth.user, profile: auth.profile };
  }

  return { 
    authorized: false, 
    error: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: ${allowedRoles.join(', ')}`, 
    status: 403 
  };
}
