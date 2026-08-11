const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(`ALTER TABLE staffs ADD COLUMN IF NOT EXISTS agency_id INT REFERENCES issuing_agencies(id);`);
    await client.query(`UPDATE staffs SET agency_id = 1 WHERE agency_id IS NULL;`);
    console.log("Cập nhật agency_id thành công!");
  } catch (err) { console.error(err); } finally { await client.end(); }
}
run();
