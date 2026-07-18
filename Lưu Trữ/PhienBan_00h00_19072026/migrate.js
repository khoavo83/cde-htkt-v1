const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Hàm tự động đọc file .env.local thủ công không cần thư viện ngoài
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
  
  console.log("Đang kết nối tới Supabase PostgreSQL...");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Yêu cầu SSL cho kết nối Supabase Cloud
  });
  
  try {
    const client = await pool.connect();
    console.log("Kết nối thành công!");
    
    const schemaPath = path.join(__dirname, 'supabase_schema.sql');
    console.log(`Đang đọc tệp SQL khởi tạo: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log("Đang thực thi các câu lệnh khởi tạo bảng và thiết lập hệ tọa độ VN2000...");
    await client.query(schemaSql);
    console.log("------------------------------------------------------------------");
    console.log("KHỞI TẠO CẤU TRÚC CƠ SỞ DỮ LIỆU TRÊN SUPABASE THÀNH CÔNG!");
    console.log("------------------------------------------------------------------");
    
    client.release();
  } catch (err) {
    console.error("Lỗi nghiêm trọng khi thực thi SQL schema:", err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
