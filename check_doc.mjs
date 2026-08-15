import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const res = await client.query("SELECT file_id, file_name, ngay_phat_hanh, so_vb, trich_yeu FROM drive_file_metadata WHERE file_name ILIKE '%104%'");
  console.log('drive_file_metadata results:', res.rows);

  const allMeta = await client.query("SELECT file_id, file_name, ngay_phat_hanh FROM drive_file_metadata LIMIT 10");
  console.log('first 10 docs:', allMeta.rows);

  await client.end();
}

run().catch(console.error);
