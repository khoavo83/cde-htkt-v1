import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { DEFAULT_TASKS_BTCG } from '../../../../../seed_tasks_btcg.mjs';

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
  if (!fs.existsSync(dbPath)) return { plots: [], tasks: [] };
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Thiếu projectId' }, { status: 400 });
    }

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        // Xóa các task cũ của dự án này
        const oldTasks = await client.query('SELECT id FROM tasks WHERE project_id = $1', [projectId]);
        const oldIds = oldTasks.rows.map(r => r.id);
        if (oldIds.length > 0) {
          await client.query('DELETE FROM task_documents WHERE task_id = ANY($1)', [oldIds]);
          await client.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
        }

        let order = 0;
        for (const t of DEFAULT_TASKS_BTCG) {
          order++;
          const taskId = `task-${projectId.slice(-6)}-${order.toString().padStart(2, '0')}`;
          await client.query(`
            INSERT INTO tasks (
              id, project_id, stt, title, group_name, stage, assigned_to,
              progress_percent, start_date, end_date, duration_days,
              legal_basis, notes, parent_id, order_index, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [
            taskId,
            projectId,
            t.stt,
            t.title,
            t.group_name || '',
            t.stage || '',
            t.assigned_to || '',
            t.progress_percent || 0,
            t.start_date || null,
            t.end_date || null,
            t.duration_days || '',
            t.legal_basis || '',
            t.notes || '',
            t.parent_id || null,
            order,
            t.progress_percent === 100 ? 'completed' : 'processing'
          ]);
        }
      } catch (dbError) {
        console.error("Lỗi khi seed tasks lên Supabase:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Cập nhật db.json
    try {
      const data = readDb();
      if (!data.tasks) data.tasks = [];
      data.tasks = data.tasks.filter(t => t.project_id !== projectId);
      DEFAULT_TASKS_BTCG.forEach((t, idx) => {
        data.tasks.push({
          id: `task-${projectId.slice(-6)}-${(idx + 1).toString().padStart(2, '0')}`,
          project_id: projectId,
          ...t,
          order_index: idx + 1
        });
      });
      writeDb(data);
    } catch (e) {
      console.error('Error updating db.json:', e);
    }

    return NextResponse.json({
      success: true,
      count: DEFAULT_TASKS_BTCG.length,
      message: `Đã nạp thành công ${DEFAULT_TASKS_BTCG.length} nhiệm vụ mẫu theo Kế hoạch Bồi thường BT-CG.`
    });

  } catch (error) {
    console.error('Error in POST /api/tasks/seed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
