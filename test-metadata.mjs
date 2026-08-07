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
    const res = await pool.query(`SELECT file_id, file_name, trich_yeu FROM drive_file_metadata WHERE trich_yeu ILIKE '%tam ung kinh phi%' LIMIT 5`);
    console.log('drive_file_metadata Docs found:', res.rows);
  } catch(e) {
    console.error('Fetch error:', e);
  } finally {
    pool.end();
  }
}

run();
