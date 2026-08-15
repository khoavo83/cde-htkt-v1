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
        dfm.file_id, 
        dff.project_id, 
        p.name as project_name 
      FROM drive_file_metadata dfm
      LEFT JOIN drive_folders_flat dff ON dfm.folder_id = dff.folder_id
      LEFT JOIN projects p ON dff.project_id = p.id
      LIMIT 2
    );
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
test();
