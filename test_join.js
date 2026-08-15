require('dotenv').config({path: '.env.local'});
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function test() {
  try {
    const res = await pool.query(
      SELECT 
        d.id,
        COALESCE(dfm.file_name, d.name, d.file_name) AS name,
        COALESCE(dfm.loai_vb, d.document_type) AS "documentType",
        COALESCE(dfm.so_vb, d.document_number) AS "documentNumber"
      FROM documents d
      LEFT JOIN drive_file_metadata dfm ON d.drive_file_id = dfm.file_id
      LIMIT 5
    );
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
test();
