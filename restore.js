require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE drive_file_metadata
      SET parent_id = NULL,
          loai_vb = 'Công văn đến' -- Or NULL, but it will show up
      WHERE file_id = '1akH2nv90EYR65-anTY3o6lnhmOuQnwRn'
    `);
    console.log('Fixed DB for 1akH2nv90EYR65-anTY3o6lnhmOuQnwRn');
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
