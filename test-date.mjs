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
    const fileId = '44f49722-684a-47a4-b6fb-42bb3dee5d01'; // from previous run
    const dateStr = '27/03/2026';
    await pool.query(`
      UPDATE documents 
      SET 
        document_date = $1
      WHERE id::text = $2
    `, [dateStr, fileId]);
    console.log('Update success');
  } catch(e) {
    console.error('Update failed:', e.message);
  } finally {
    pool.end();
  }
}

run();
