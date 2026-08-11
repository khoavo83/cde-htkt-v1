const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addShortNameColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE staffs 
      ADD COLUMN IF NOT EXISTS short_name TEXT;
    `);
    
    console.log("Thêm cột short_name thành công!");
  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    await client.end();
  }
}

addShortNameColumn();
