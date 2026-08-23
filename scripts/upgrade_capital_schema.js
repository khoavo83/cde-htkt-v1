require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- NÂNG CẤP SCHEMA CHO GIAI ĐOẠN 2: KẾ HOẠCH VỐN ---');
    
    await client.query(`
      ALTER TABLE capital_allocations 
      ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'Ngân sách Thành phố',
      ADD COLUMN IF NOT EXISTS document_path TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'effective',
      ADD COLUMN IF NOT EXISTS extended_year INTEGER;
    `);

    await client.query(`
      ALTER TABLE capital_plans
      ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'high',
      ADD COLUMN IF NOT EXISTS approved_doc TEXT;
    `);

    // Bổ sung thêm dữ liệu mẫu Kế hoạch vốn trung hạn 2026-2030 cho dự án Bến Thành - Cần Giờ
    const projectId = '1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2';

    const checkMidTerm = await client.query(
      "SELECT id FROM capital_plans WHERE project_id = $1 AND plan_type = 'trung_han'",
      [projectId]
    );

    if (checkMidTerm.rows.length === 0) {
      await client.query(
        `INSERT INTO capital_plans (
          project_id, plan_type, title, period_start_year, period_end_year, planned_amount, funding_source, notes
        ) VALUES ($1, 'trung_han', 'Kế hoạch vốn đầu tư công trung hạn giai đoạn 2026 - 2030', 2026, 2030, 9813320703412, 'Ngân sách Thành phố Hồ Chí Minh', 'Bố trí trọn vẹn theo Tổng mức đầu tư được phê duyệt')`,
        [projectId]
      );
      console.log(' Đã nạp Kế hoạch vốn trung hạn 2026-2030 (9.813 tỷ đồng)');
    }

    console.log(' Nâng cấp Schema Giai đoạn 2 thành công!');
  } catch (err) {
    console.error(' Lỗi:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
