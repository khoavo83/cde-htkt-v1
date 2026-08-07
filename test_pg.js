require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function test() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT draft_files FROM drive_file_metadata LIMIT 1');
    console.log('Select success', res.rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}
test();
