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
    await pool.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS is_outgoing BOOLEAN DEFAULT FALSE;
    `);
    console.log('Successfully added is_outgoing column.');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
