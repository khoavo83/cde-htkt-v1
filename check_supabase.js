const {Pool} = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable'
});

async function check() {
  // Xem tất cả file có manually_edited = true
  const res = await pool.query(`
    SELECT file_id, so_vb, trich_yeu, noi_phat_hanh, ngay_phat_hanh, manually_edited 
    FROM drive_file_metadata 
    WHERE manually_edited = true
    ORDER BY extracted_at DESC
    LIMIT 20
  `);
  console.log('=== Các file đã được người dùng cập nhật thủ công ===');
  console.table(res.rows);

  // Tổng số file trong DB
  const total = await pool.query('SELECT COUNT(*) FROM drive_file_metadata');
  console.log('\nTổng số file trong DB:', total.rows[0].count);

  const totalEdited = await pool.query('SELECT COUNT(*) FROM drive_file_metadata WHERE manually_edited = true');
  console.log('Số file đã chỉnh tay:', totalEdited.rows[0].count);

  pool.end();
}
check();
