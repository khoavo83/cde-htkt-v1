import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const env = fs.readFileSync('.env.local', 'utf-8');
const dbUrl = env.match(/DATABASE_URL="?([^"\n]+)"?/)[1];

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT id, document_number, summary, document_date, updated_at FROM documents WHERE summary = 'Ve thu tuc tam ung kinh phi thuc hien DA'`);
    console.log('Exact match Docs:', res.rows);
  } catch(e) {
    console.error('Fetch error:', e);
  } finally {
    pool.end();
  }
}

run();
