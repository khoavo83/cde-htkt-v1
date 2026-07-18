import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const getDbPath = () => path.join(process.cwd(), 'src', 'data', 'db.json');

function readDb() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { plots: [], tasks: [], documents: [] };
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(request) {
  try {
    const { taskId, documentPath } = await request.json();
    
    if (!taskId || !documentPath) {
      return NextResponse.json({ error: "Thiếu thông tin taskId hoặc documentPath" }, { status: 400 });
    }

    let syncedToSupabase = false;
    let dbErrorMessage = null;

    // 1. Ghi liên kết vào Supabase
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      try {
        const client = await pool.connect();
        
        // Thêm bản ghi liên kết vào bảng task_documents
        const query = `
          INSERT INTO task_documents (task_id, document_path)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `;
        
        await client.query(query, [taskId, documentPath]);
        client.release();
        await pool.end();
        syncedToSupabase = true;
      } catch (dbError) {
        dbErrorMessage = dbError.message;
        console.error("Lỗi khi ghi liên kết tài liệu vào Supabase:", dbError.message);
        await pool.end();
      }
    }

    // 2. Ghi nhận vào db.json cục bộ để đồng bộ offline
    try {
      const data = readDb();
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        if (!data.tasks[taskIndex].documents) {
          data.tasks[taskIndex].documents = [];
        }
        
        const fileName = path.basename(documentPath);
        if (!data.tasks[taskIndex].documents.includes(fileName)) {
          data.tasks[taskIndex].documents.push(fileName);
          writeDb(data);
          console.log(`Đã ghi nhận liên kết file ${fileName} vào task ${taskId} trong db.json.`);
        }
      }
    } catch (fsError) {
      console.error("Lỗi khi ghi nhận liên kết vào db.json:", fsError);
    }

    return NextResponse.json({ 
      success: true, 
      syncedToSupabase, 
      error: dbErrorMessage 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
