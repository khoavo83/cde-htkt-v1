const {Pool} = require('pg');
const http = require('http');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable'
});

async function run() {
  // 1. Xem DB đang chứa gì
  const dbRes = await pool.query("SELECT file_id, so_vb, trich_yeu, manually_edited FROM drive_file_metadata WHERE so_vb = '750/BQLĐSĐT-HTKT'");
  console.log('=== DB hiện tại ===');
  console.log(dbRes.rows[0]);

  // 2. Xem API /api/drive/files trả về gì
  function fetchFiles() {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:3000/api/drive/files?folderId=1_vn7558ky5wmEQd_tf1JGC-bVAvClVF1&_t=' + Date.now(), (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
        });
      }).on('error', reject);
    });
  }

  console.log('\n=== Gọi API lần 1 ===');
  const res1 = await fetchFiles();
  const file1 = res1.data?.find(f => f.so_vb === '750/BQLĐSĐT-HTKT');
  console.log('trich_yeu:', file1?.trich_yeu);
  console.log('manually_edited:', file1?.manually_edited);

  // Check DB lại sau khi API đã chạy (để xem API có ghi đè không)
  const dbRes2 = await pool.query("SELECT so_vb, trich_yeu, manually_edited FROM drive_file_metadata WHERE so_vb = '750/BQLĐSĐT-HTKT'");
  console.log('\n=== DB SAU khi gọi API lần 1 ===');
  console.log(dbRes2.rows[0]);

  console.log('\n=== Gọi API lần 2 ===');
  const res2 = await fetchFiles();
  const file2 = res2.data?.find(f => f.so_vb === '750/BQLĐSĐT-HTKT');
  console.log('trich_yeu:', file2?.trich_yeu);
  console.log('manually_edited:', file2?.manually_edited);

  const dbRes3 = await pool.query("SELECT so_vb, trich_yeu, manually_edited FROM drive_file_metadata WHERE so_vb = '750/BQLĐSĐT-HTKT'");
  console.log('\n=== DB SAU khi gọi API lần 2 ===');
  console.log(dbRes3.rows[0]);

  pool.end();
}

run().catch(console.error);
