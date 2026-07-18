import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const getDbPath = () => path.join(process.cwd(), 'src', 'data', 'db.json');

function readDb() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { plots: [], tasks: [] };
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    // 1. Thử đọc từ Supabase PostgreSQL nếu được cấu hình
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      try {
        const client = await pool.connect();
        
        // Lấy tất cả công việc
        const tasksQuery = `
          SELECT 
            id, title, category, assigned_to as "assignedTo", 
            start_date as "startDate", end_date as "endDate", 
            progress_percent as progress, status, priority, description 
          FROM tasks 
          ORDER BY id ASC
        `;
        
        // Lấy tất cả các liên kết văn bản của các công việc
        const linksQuery = `
          SELECT td.task_id, d.file_name as name
          FROM task_documents td
          JOIN documents d ON td.document_path = d.file_path
        `;
        
        const [tasksRes, linksRes] = await Promise.all([
          client.query(tasksQuery),
          client.query(linksQuery)
        ]);
        
        client.release();
        await pool.end();

        // Ghép nối danh sách file vào từng công việc tương ứng
        const formattedTasks = tasksRes.rows.map(task => {
          const taskLinks = linksRes.rows.filter(l => l.task_id === task.id);
          
          // Định dạng lại ngày để hiển thị đúng ở Client
          const fmtDate = (d) => d ? new Date(d).toISOString().split('T')[0] : null;
          
          return {
            ...task,
            startDate: fmtDate(task.startDate),
            endDate: fmtDate(task.endDate),
            documents: taskLinks.map(l => l.name)
          };
        });

        console.log(`Lấy thành công ${formattedTasks.length} công việc kèm liên kết tài liệu từ Supabase.`);
        return NextResponse.json(formattedTasks);
      } catch (dbError) {
        console.error("Lỗi truy vấn danh sách công việc trên Supabase, chuyển sang dùng dữ liệu cục bộ:", dbError.message);
        await pool.end();
      }
    }

    // 2. Fallback: Đọc từ db.json cục bộ
    const data = readDb();
    return NextResponse.json(data.tasks || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const updatedTask = await request.json();
    
    // 1. Thử cập nhật lên Supabase PostgreSQL nếu được cấu hình
    let syncedToSupabase = false;
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      try {
        const client = await pool.connect();
        
        // Kiểm tra xem công việc đã tồn tại chưa
        const checkRes = await client.query('SELECT id FROM tasks WHERE id = $1', [updatedTask.id]);
        
        if (checkRes.rows.length > 0) {
          // Cập nhật công việc hiện tại
          const updateQuery = `
            UPDATE tasks 
            SET 
              title = $1, 
              category = $2, 
              assigned_to = $3, 
              start_date = $4, 
              end_date = $5, 
              progress_percent = $6, 
              status = $7, 
              priority = $8, 
              description = $9,
              updated_at = NOW()
            WHERE id = $10
          `;
          await client.query(updateQuery, [
            updatedTask.title,
            updatedTask.category,
            updatedTask.assignedTo,
            updatedTask.startDate,
            updatedTask.endDate,
            updatedTask.progress,
            updatedTask.status,
            updatedTask.priority,
            updatedTask.description,
            updatedTask.id
          ]);
          console.log(`Đã cập nhật công việc ${updatedTask.id} trên Supabase.`);
        } else {
          // Thêm mới công việc
          const insertQuery = `
            INSERT INTO tasks (
              id, title, category, assigned_to, start_date, end_date, 
              progress_percent, status, priority, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;
          await client.query(insertQuery, [
            updatedTask.id,
            updatedTask.title,
            updatedTask.category,
            updatedTask.assignedTo,
            updatedTask.startDate,
            updatedTask.endDate,
            updatedTask.progress,
            updatedTask.status,
            updatedTask.priority,
            updatedTask.description
          ]);
          console.log(`Đã thêm mới công việc ${updatedTask.id} trên Supabase.`);
        }
        
        client.release();
        await pool.end();
        syncedToSupabase = true;
      } catch (dbError) {
        console.error("Lỗi khi ghi dữ liệu công việc lên Supabase:", dbError.message);
        await pool.end();
      }
    }

    // 2. Ghi dữ liệu đồng bộ vào db.json cục bộ
    const data = readDb();
    const index = data.tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      data.tasks[index] = { ...data.tasks[index], ...updatedTask };
    } else {
      data.tasks.push(updatedTask);
    }
    writeDb(data);

    return NextResponse.json({ 
      success: true, 
      syncedToSupabase, 
      task: updatedTask 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
