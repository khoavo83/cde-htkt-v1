import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Connected to database.');

  await client.query(`
    ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS stt TEXT,
      ADD COLUMN IF NOT EXISTS group_name TEXT,
      ADD COLUMN IF NOT EXISTS stage TEXT,
      ADD COLUMN IF NOT EXISTS duration_days TEXT,
      ADD COLUMN IF NOT EXISTS legal_basis TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS parent_id TEXT,
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS task_documents (
      id SERIAL PRIMARY KEY,
      task_id TEXT NOT NULL,
      file_id TEXT,
      document_path TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  console.log('Schema migration completed.');
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
