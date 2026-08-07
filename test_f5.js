const {Pool} = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable'
});
const http = require('http');

async function test() {
  await pool.query("UPDATE drive_file_metadata SET trich_yeu = 'Trích yếu test F5', manually_edited = true WHERE so_vb = '750/BQLĐSĐT-HTKT'");
  
  function fetchFiles() {
    return new Promise(resolve => {
      http.get('http://localhost:3000/api/drive/files?folderId=1_vn7558ky5wmEQd_tf1JGC-bVAvClVF1', (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve(JSON.parse(data)));
      });
    });
  }

  const res1 = await fetchFiles();
  console.log('F5 1:', res1.data.find(f => f.so_vb === '750/BQLĐSĐT-HTKT')?.trich_yeu);
  const res2 = await fetchFiles();
  console.log('F5 2:', res2.data.find(f => f.so_vb === '750/BQLĐSĐT-HTKT')?.trich_yeu);
  
  pool.end();
}
test();
