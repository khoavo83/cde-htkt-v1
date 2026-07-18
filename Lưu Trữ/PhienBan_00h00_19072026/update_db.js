const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Hàm đọc file .env.local thủ công
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

async function run() {
  loadEnvLocal();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Lỗi: DATABASE_URL không được cấu hình trong .env.local");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log("Đã kết nối thành công tới Supabase!");

    // Tạo bảng liên kết giữa Công việc (Tasks) và Tài liệu (Documents)
    const sql = `
      CREATE TABLE IF NOT EXISTS task_documents (
          task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
          document_path TEXT REFERENCES documents(file_path) ON DELETE CASCADE,
          PRIMARY KEY (task_id, document_path)
      );

      -- Tạo liên kết mẫu cho công việc Rà phá bom mìn (task-01)
      -- Sử dụng các file thực tế từ ổ H: (được lưu bằng đường dẫn gạch chéo xuôi)
      INSERT INTO task_documents (task_id, document_path) VALUES 
      ('task-01', 'H:/My Drive/Bồi thường BT-CG/25. Thông tin khác/Lữ đoàn 239 - Binh chủng Công binh/2026-04-26_1128_BQLĐSĐT-HTKT_gui Lu doan 239 cung cap thong tin khai toan thi cong RPBM.pdf'),
      ('task-01', 'H:/My Drive/Bồi thường BT-CG/25. Thông tin khác/Tổng Công ty Xây dựng Lũng Lô/2026-04-25_1123_BQLĐSĐT-HTKT_gui TCTy Lung Lo (DTMN) cung cap thong tin khai toan thi cong RPBM.pdf')
      ON CONFLICT DO NOTHING;
      
      -- Cập nhật file supabase_schema.sql để đồng bộ thiết kế
      -- (sẽ cập nhật sau bằng code)
    `;

    console.log("Đang tạo bảng task_documents và chèn liên kết mẫu...");
    await client.query(sql);
    console.log("Cập nhật cơ sở dữ liệu Supabase thành công!");

    client.release();
  } catch (err) {
    console.error("Lỗi cập nhật database:", err.message);
  } finally {
    await pool.end();
  }
}

run();
