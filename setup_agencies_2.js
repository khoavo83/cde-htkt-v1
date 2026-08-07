require('dotenv').config({path: '.env.local'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

async function setup() {
  try {
    console.log('Creating table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issuing_agencies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        abbreviation VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Fetching distinct noi_phat_hanh...');
    const res = await pool.query("SELECT DISTINCT noi_phat_hanh FROM drive_file_metadata WHERE noi_phat_hanh IS NOT NULL AND noi_phat_hanh != ''");
    const agencies = res.rows.map(r => r.noi_phat_hanh).filter(Boolean);

    for (let agency of agencies) {
      let abbreviation = '';
      if (agency.includes('Ban Quản lý Đường sắt') || agency.includes('Ban QLĐSĐT')) abbreviation = 'Ban QLĐSĐT';
      else if (agency.includes('Ủy ban nhân dân Thành phố Hồ Chí Minh') || agency.includes('UBND TP.HCM')) abbreviation = 'UBND TP.HCM';
      else if (agency.includes('Quy hoach - Kiến trúc') || agency.includes('Quy hoạch - Kiến trúc')) abbreviation = 'Sở QHKT';
      else if (agency.includes('Nông nghiệp & Phát triển')) abbreviation = 'Sở NN&PTNT';
      else if (agency === 'Ban Hạ tầng kỹ thuật') abbreviation = 'Ban HTKT';
      else if (agency === 'Phòng Kế hoạch - Kỹ thuật') abbreviation = 'Phòng KHKT';

      await pool.query(`
        INSERT INTO issuing_agencies (name, abbreviation, notes)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [agency, abbreviation, 'Khởi tạo tự động']);
      console.log(`Inserted: ${agency} -> ${abbreviation}`);
    }
    console.log('Done!');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
setup();
