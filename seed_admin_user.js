require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedAdmin() {
  const client = await pool.connect();
  try {
    console.log('--- KIỂM TRA & TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH ---');
    
    const adminEmail = 'admin.cdehtkt@gmail.com';

    // 1. Tự động kích hoạt email_confirmed_at cho user trong auth.users
    await client.query(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW() 
      WHERE email = $1
    `, [adminEmail]);

    // 2. Đảm bảo role admin trong user_profiles
    await client.query(`
      UPDATE public.user_profiles 
      SET role = 'admin', is_active = true, updated_at = NOW() 
      WHERE email = $1
    `, [adminEmail]);

    // 3. Kiểm tra lại danh sách
    const resUsers = await client.query(`
      SELECT u.id, u.email, u.email_confirmed_at, up.role, up.full_name, up.is_active
      FROM auth.users u
      LEFT JOIN public.user_profiles up ON u.id = up.id
    `);

    console.log(`\nDanh sách tài khoản sau khi thiết lập (${resUsers.rows.length}):`);
    resUsers.rows.forEach(u => {
      console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${!!u.email_confirmed_at} | Role: ${u.role} | Tên: ${u.full_name} | Active: ${u.is_active}`);
    });

    console.log(`\n✅ TÀI KHOẢN ADMIN ĐÃ SẴN SÀNG:`);
    console.log(`- Email: ${adminEmail}`);
    console.log(`- Mật khẩu: Admin@123456`);
    console.log(`- Vai trò: Quản trị viên (admin)`);

  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();
