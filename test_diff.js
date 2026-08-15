require('dotenv').config({path: '.env.local'});
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function test() {
  try {
    const res = await pool.query(
      SELECT COUNT(*) as count 
      FROM drive_file_metadata dfm
      LEFT JOIN documents d ON d.drive_file_id = dfm.file_id
      WHERE d.id IS NULL
    );
    console.log('Files in drive_file_metadata but not in documents:', res.rows[0].count);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
test();
