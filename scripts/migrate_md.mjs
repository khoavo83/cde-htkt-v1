import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  console.log('Connected to Postgres');

  try {
    await client.query(`
      ALTER TABLE drive_file_metadata 
      ADD COLUMN IF NOT EXISTS content_md TEXT,
      ADD COLUMN IF NOT EXISTS is_md_generated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS md_generated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS md_char_count INTEGER;
    `);
    console.log('Successfully updated drive_file_metadata table schema.');

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'drive_file_metadata' AND column_name LIKE '%md%';
    `);
    console.log('MD columns in drive_file_metadata:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
