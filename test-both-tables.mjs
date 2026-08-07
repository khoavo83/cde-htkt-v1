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
    // Check drive_file_metadata for the same file
    const res1 = await pool.query(`SELECT file_id, file_name, trich_yeu, so_vb, ngay_phat_hanh, manually_edited, loai_vb FROM drive_file_metadata WHERE trich_yeu ILIKE '%tam ung%' OR file_name ILIKE '%750%' LIMIT 5`);
    console.log('drive_file_metadata:', res1.rows);
    
    // Check documents table
    const res2 = await pool.query(`SELECT id, document_number, summary, document_date FROM documents WHERE summary ILIKE '%tam ung%' OR document_number ILIKE '%750%' LIMIT 5`);
    console.log('documents:', res2.rows);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

run();
