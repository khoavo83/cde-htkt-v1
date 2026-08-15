import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;

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
    const { action, taskId, documentPath, fileId } = await request.json();
    
    if (!taskId || (!documentPath && !fileId)) {
      return NextResponse.json({ error: "Thiếu thông tin taskId hoặc fileId/documentPath" }, { status: 400 });
    }

    if (action === 'unlink') {
      if (pool) {
        let client = null;
        try {
          client = await pool.connect();
          await client.query(
            `DELETE FROM task_documents WHERE task_id = $1 AND (
              (file_id IS NOT NULL AND file_id = $2) OR 
              document_path = $3 OR 
              document_path LIKE $4
            )`,
            [taskId, fileId || null, documentPath || '', `%${documentPath}%`]
          );
        } finally {
          if (client) client.release();
        }
      }
      return NextResponse.json({ success: true, message: 'Đã gỡ liên kết' });
    }

    let syncedToSupabase = false;
    let dbErrorMessage = null;

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        
        // Kiểm tra tránh trùng lặp liên kết
        const checkRes = await client.query(
          `SELECT 1 FROM task_documents WHERE task_id = $1 AND (
            (file_id IS NOT NULL AND file_id = $2) OR 
            document_path = $3
          )`,
          [taskId, fileId || null, documentPath || '']
        );

        if (checkRes.rows.length === 0) {
          const query = `
            INSERT INTO task_documents (task_id, file_id, document_path)
            VALUES ($1, $2, $3)
          `;
          await client.query(query, [taskId, fileId || null, documentPath || '']);
        }
        syncedToSupabase = true;
      } catch (dbError) {
        dbErrorMessage = dbError.message;
        console.error("Lỗi khi ghi liên kết tài liệu vào Supabase:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Ghi nhận vào db.json
    try {
      const data = readDb();
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        if (!data.tasks[taskIndex].documents) {
          data.tasks[taskIndex].documents = [];
        }
        const fileName = documentPath ? path.basename(documentPath) : (fileId || 'document');
        if (!data.tasks[taskIndex].documents.includes(fileName)) {
          data.tasks[taskIndex].documents.push(fileName);
          writeDb(data);
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const fileId = searchParams.get('fileId');
    const documentName = searchParams.get('documentName');

    if (!taskId) {
      return NextResponse.json({ error: 'Thiếu taskId' }, { status: 400 });
    }

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        if (fileId) {
          await client.query('DELETE FROM task_documents WHERE task_id = $1 AND file_id = $2', [taskId, fileId]);
        } else if (documentName) {
          await client.query(`
            DELETE FROM task_documents 
            WHERE task_id = $1 
              AND (document_path = $2 OR substring(document_path from '[^/]+$') = $2)
          `, [taskId, documentName]);
        } else {
          await client.query('DELETE FROM task_documents WHERE task_id = $1', [taskId]);
        }
      } catch (dbError) {
        console.error("Lỗi xóa liên kết trên Supabase:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Gỡ trong db.json
    try {
      const data = readDb();
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1 && data.tasks[taskIndex].documents) {
        if (documentName) {
          data.tasks[taskIndex].documents = data.tasks[taskIndex].documents.filter(d => d !== documentName);
        } else if (!fileId && !documentName) {
          data.tasks[taskIndex].documents = [];
        }
        writeDb(data);
      }
    } catch (e) {
      console.error('Error unlinking in db.json:', e);
    }

    return NextResponse.json({ success: true, message: 'Đã gỡ liên kết tài liệu thành công' });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
