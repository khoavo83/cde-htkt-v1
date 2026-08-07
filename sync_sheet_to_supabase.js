require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function loadAuth() {
  const credsContent = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const creds = JSON.parse(credsContent);
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
  
  const tokenContent = fs.readFileSync(TOKEN_PATH, 'utf8');
  const token = JSON.parse(tokenContent);
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials({
    access_token: token.token || token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry ? new Date(token.expiry).getTime() : null,
  });
  return oAuth2Client;
}

async function syncSheetToSupabase() {
  console.log('[1/3] Kết nối Google Sheets...');
  const auth = await loadAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  
  console.log(`[2/3] Đang tải dữ liệu từ Sheet ID: ${SPREADSHEET_ID}...`);
  
  // Tự động lấy tên Sheet đầu tiên
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetName = meta.data.sheets[0].properties.title;
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A2:J`,
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('Không tìm thấy dữ liệu trong Sheet.');
    return;
  }

  console.log(`[3/3] Bắt đầu đồng bộ ${rows.length} dòng vào Supabase...`);
  
  let successCount = 0;
  
  const client = await pool.connect();
  try {
    // Đảm bảo bảng tồn tại
    await client.query(`
      CREATE TABLE IF NOT EXISTS drive_file_metadata (
        file_id       VARCHAR(255) PRIMARY KEY,
        file_name     TEXT,
        loai_vb       TEXT,
        so_vb         TEXT,
        ngay_phat_hanh TEXT,
        noi_phat_hanh  TEXT,
        trich_yeu      TEXT,
        noi_gui        TEXT,
        web_view_link  TEXT,
        manually_edited BOOLEAN DEFAULT FALSE,
        extracted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_time  TIMESTAMP,
        custom_order_index INTEGER DEFAULT 0
      );
    `);

    for (const row of rows) {
      // Cấu trúc cột trong Sheet (A-J):
      // A: File ID
      // B: Tên File Gốc
      // C: Link Google Drive
      // D: Loại VB
      // E: Số VB
      // F: Ngày PH
      // G: Nơi PH
      // H: Trích yếu
      // I: Nơi gửi/Nhận
      // J: Lỗi (nếu có)
      
      const fileId = row[0];
      if (!fileId || row[9]) continue; // Bỏ qua nếu có lỗi AI (Cột J) hoặc ko có ID
      
      const fileName = row[1] || '';
      const webLink = row[2] || '';
      const loaiVb = row[3] || '';
      const soVb = row[4] || '';
      const ngayPh = row[5] || '';
      const noiPh = row[6] || '';
      const trichYeu = row[7] || '';
      const noiGui = row[8] || '';

      await client.query(`
        INSERT INTO drive_file_metadata (
          file_id, file_name, web_view_link, 
          loai_vb, so_vb, ngay_phat_hanh, noi_phat_hanh, trich_yeu, noi_gui
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (file_id) DO UPDATE SET
          loai_vb = EXCLUDED.loai_vb,
          so_vb = EXCLUDED.so_vb,
          ngay_phat_hanh = EXCLUDED.ngay_phat_hanh,
          noi_phat_hanh = EXCLUDED.noi_phat_hanh,
          trich_yeu = EXCLUDED.trich_yeu,
          noi_gui = EXCLUDED.noi_gui
        WHERE drive_file_metadata.manually_edited = false;
      `, [fileId, fileName, webLink, loaiVb, soVb, ngayPh, noiPh, trichYeu, noiGui]);
      
      successCount++;
    }
    console.log(`\n✅ HOÀN TẤT! Đã đồng bộ thành công ${successCount} file vào Supabase.`);
    console.log(`👉 Bạn có thể làm mới (F5) trang web để xem kết quả!`);
  } catch (error) {
    console.error('Lỗi khi lưu vào Supabase:', error);
  } finally {
    client.release();
    pool.end();
  }
}

syncSheetToSupabase();
