require('dotenv').config({path: '.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'issuing_agencies';`);
    console.log("issuing_agencies schema:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
