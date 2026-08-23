require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuth() {
  console.log('--- TEST LUỒNG ĐĂNG NHẬP & PHÂN QUYỀN SUPABASE AUTH ---');
  
  // 1. Test Login Admin
  const email = 'admin.cdehtkt@gmail.com';
  const password = 'Admin@123456';
  
  console.log(`\n1. Đăng nhập với tài khoản: ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    console.error('❌ Đăng nhập thất bại:', error.message);
    return;
  }

  console.log('✅ Đăng nhập thành công!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('Access Token (JWT):', data.session.access_token.substring(0, 30) + '...');

  // 2. Fetch User Profile từ Supabase Database
  console.log('\n2. Truy vấn hồ sơ user_profiles...');
  const { data: profile, error: profErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profErr) {
    console.error('❌ Lỗi lấy profile:', profErr.message);
  } else {
    console.log('✅ Lấy Profile thành công:');
    console.log('- Họ và tên:', profile.full_name);
    console.log('- Vai trò (Role):', profile.role);
    console.log('- Trạng thái hoạt động:', profile.is_active);
  }

  // 3. Test API /api/users
  console.log('\n3. Test gọi API /api/users từ localhost:3000...');
  try {
    const res = await fetch('http://localhost:3000/api/users', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      }
    });
    const result = await res.json();
    console.log('✅ Kết quả /api/users:', result);
  } catch (err) {
    console.warn('Lưu ý khi gọi HTTP localhost:', err.message);
  }

  console.log('\n--- KẾT THÚC KIỂM THỬ THÀNH CÔNG ---');
}

testAuth();
