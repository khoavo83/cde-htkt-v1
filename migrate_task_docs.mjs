import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Connected to DB.');
  
  await client.query(`
    ALTER TABLE task_documents 
      ADD COLUMN IF NOT EXISTS file_id TEXT;
  `);

  console.log('Added file_id column to task_documents.');
  await client.end();
}

run().catch(console.error);
