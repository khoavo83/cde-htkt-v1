import { Pool } from 'pg';

async function test() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  console.log('Connected to Postgres');

  try {
    const res = await client.query(`
      SELECT file_id, file_name, loai_vb, so_vb, trich_yeu, is_md_generated, md_char_count, md_generated_at
      FROM drive_file_metadata
      WHERE file_name IS NOT NULL
      ORDER BY is_md_generated DESC, file_name ASC
      LIMIT 5
    `);
    console.log('Sample documents:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

test().catch(console.error);
