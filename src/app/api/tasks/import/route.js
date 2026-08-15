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
  if (!fs.existsSync(dbPath)) return { plots: [], tasks: [] };
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { projectId, tasks, overwrite } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Thiếu projectId' }, { status: 400 });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: 'Danh sách nhiệm vụ trống' }, { status: 400 });
    }

    let insertedCount = 0;

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        if (overwrite) {
          // Xóa các task cũ của dự án này
          const oldTasks = await client.query('SELECT id FROM tasks WHERE project_id = $1', [projectId]);
          const oldIds = oldTasks.rows.map(r => r.id);
          if (oldIds.length > 0) {
            await client.query('DELETE FROM task_documents WHERE task_id = ANY($1)', [oldIds]);
            await client.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
          }
        }

        let order = 0;
        for (const t of tasks) {
          order++;
          const taskId = t.id || `task-${projectId.slice(-6)}-${order.toString().padStart(2, '0')}`;
          const progress = parseInt(t.progress_percent ?? t.progress ?? 0, 10);
          const status = progress >= 100 ? 'completed' : (progress > 0 ? 'processing' : 'pending');

          await client.query(`
            INSERT INTO tasks (
              id, project_id, stt, title, group_name, stage, assigned_to,
              progress_percent, start_date, end_date, duration_days,
              legal_basis, notes, parent_id, order_index, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
              project_id = EXCLUDED.project_id,
              stt = EXCLUDED.stt,
              title = EXCLUDED.title,
              group_name = EXCLUDED.group_name,
              stage = EXCLUDED.stage,
              assigned_to = EXCLUDED.assigned_to,
              progress_percent = EXCLUDED.progress_percent,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date,
              duration_days = EXCLUDED.duration_days,
              legal_basis = EXCLUDED.legal_basis,
              notes = EXCLUDED.notes,
              parent_id = EXCLUDED.parent_id,
              order_index = EXCLUDED.order_index,
              status = EXCLUDED.status,
              updated_at = NOW()
          `, [
            taskId,
            projectId,
            t.stt || '',
            t.title || '',
            t.group_name || t.groupName || '',
            t.stage || '',
            t.assigned_to || t.assignedTo || '',
            progress,
            t.start_date || t.startDate || null,
            t.end_date || t.endDate || null,
            t.duration_days || t.durationDays || '',
            t.legal_basis || t.legalBasis || '',
            t.notes || '',
            t.parent_id || t.parentId || null,
            order,
            status
          ]);
          insertedCount++;
        }
      } catch (dbError) {
        console.error("Lỗi khi import tasks lên Supabase:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Cập nhật db.json
    try {
      const data = readDb();
      if (!data.tasks) data.tasks = [];
      if (overwrite) {
        data.tasks = data.tasks.filter(t => t.project_id !== projectId);
      }
      tasks.forEach((t, idx) => {
        const taskId = t.id || `task-${projectId.slice(-6)}-${(idx + 1).toString().padStart(2, '0')}`;
        data.tasks.push({
          id: taskId,
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
      count: insertedCount || tasks.length,
      message: `Đã nhập thành công ${insertedCount || tasks.length} nhiệm vụ.`
    });

  } catch (error) {
    console.error('Error in POST /api/tasks/import:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
