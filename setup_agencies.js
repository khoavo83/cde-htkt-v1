require('dotenv').config({path: '.env.local'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

async function setup() {
  try {
    console.log('Creating table...');
    await pool.query(
      CREATE TABLE IF NOT EXISTS issuing_agencies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        abbreviation VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    );

    console.log('Fetching distinct noi_phat_hanh...');
    const res = await pool.query("SELECT DISTINCT noi_phat_hanh FROM drive_file_metadata WHERE noi_phat_hanh IS NOT NULL AND noi_phat_hanh != ''");
    const agencies = res.rows.map(r => r.noi_phat_hanh).filter(Boolean);

    for (let agency of agencies) {
      let abbreviation = '';
      if (agency === 'Ban Qu?n lý Ðu?ng s?t dô th?' || agency === 'Ban Qu?n lý Ðu?ng s?t Ðô th? TP.HCM' || agency === 'Ban Qu?n lý Ðu?ng s?t dô th? Thành ph? H? Chí Minh' || agency === 'Ban QLÐSÐT') {
        abbreviation = 'Ban QLÐSÐT';
      } else if (agency === '?y ban nhân dân Thành ph? H? Chí Minh' || agency === 'UBND TP.HCM') {
        abbreviation = 'UBND TP.HCM';
      } else if (agency === 'S? Quy hoach - Ki?n trúc' || agency === 'S? Quy ho?ch - Ki?n trúc') {
        abbreviation = 'S? QHKT';
      } else if (agency === 'S? Nông nghi?p & Phát tri?n Nông thôn TP.HCM') {
        abbreviation = 'S? NN&PTNT';
      } else if (agency === 'Ban H? t?ng k? thu?t') {
        abbreviation = 'Ban HTKT';
      } else if (agency === 'Phòng K? ho?ch - K? thu?t') {
        abbreviation = 'Phòng KHKT';
      }

      await pool.query(
        INSERT INTO issuing_agencies (name, abbreviation, notes)
        VALUES (, , )
        ON CONFLICT (name) DO NOTHING
      , [agency, abbreviation, 'Kh?i t?o t? d?ng']);
      console.log(Inserted:  -> );
    }
    console.log('Done!');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
setup();
