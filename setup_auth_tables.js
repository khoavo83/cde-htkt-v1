require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupAuth() {
  const client = await pool.connect();
  try {
    console.log('--- BẮT ĐẦU THIẾT LẬP BẢNG AUTH & ROLES TRÊN SUPABASE ---');
    await client.query('BEGIN');

    // 1. Tạo bảng public.user_profiles
    console.log('1. Đang tạo bảng public.user_profiles...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
        staff_id UUID REFERENCES public.staffs(id) ON DELETE SET NULL,
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Tạo index để tối ưu hóa truy vấn
    console.log('2. Đang tạo Index cho user_profiles...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON public.user_profiles(staff_id);
    `);

    // 3. Tạo trigger function tự động tạo profile khi user mới đăng ký qua auth.users
    console.log('3. Đang tạo trigger function handle_new_user...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.user_profiles (id, email, full_name, role)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
        )
        ON CONFLICT (id) DO UPDATE
        SET 
          email = EXCLUDED.email,
          full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
          updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 4. Gắn trigger vào bảng auth.users
    console.log('4. Đang kích hoạt Trigger trên auth.users...');
    await client.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);

    // 5. Cấp quyền truy cập cho anon và authenticated role
    console.log('5. Cấp quyền truy cập cho Supabase API...');
    await client.query(`
      GRANT ALL ON public.user_profiles TO authenticated;
      GRANT ALL ON public.user_profiles TO service_role;
      GRANT SELECT ON public.user_profiles TO anon;
    `);

    await client.query('COMMIT');
    console.log('✅ THIẾT LẬP BẢNG USER_PROFILES VÀ TRIGGER THÀNH CÔNG!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi thiết lập bảng Auth:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAuth();
