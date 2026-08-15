import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const sampleDoc = await client.query('SELECT file_id, file_name, ngay_phat_hanh, loai_vb, so_vb, trich_yeu FROM drive_file_metadata WHERE ngay_phat_hanh IS NOT NULL LIMIT 1');
  const sampleTask = await client.query('SELECT id, title, start_date, end_date FROM tasks LIMIT 1');
  console.log('Sample Doc:', sampleDoc.rows[0]);
  console.log('Sample Task:', sampleTask.rows[0]);
  
  if (sampleDoc.rows[0] && sampleTask.rows[0]) {
    await client.query('INSERT INTO task_documents (task_id, file_id, document_path) VALUES ($1, $2, $3)', [
      sampleTask.rows[0].id,
      sampleDoc.rows[0].file_id,
      sampleDoc.rows[0].file_name
    ]);
    console.log('Inserted test link into task_documents.');
  }

  const joinRes = await client.query(`
    SELECT 
      td.task_id, 
      td.document_path,
      dfm.file_id, 
      dfm.file_name, 
      dfm.ngay_phat_hanh
    FROM task_documents td
    LEFT JOIN drive_file_metadata dfm 
      ON (td.file_id IS NOT NULL AND td.file_id = dfm.file_id) 
      OR substring(td.document_path from '[^/]+$') = dfm.file_name
  `);
  console.log('Join result:', joinRes.rows);

  await client.end();
}

run().catch(console.error);
