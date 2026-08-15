import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { DEFAULT_TASKS_BTCG } from '../../../../seed_tasks_btcg.mjs';

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
    return { plots: [], tasks: [] };
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Parse DD/MM/YYYY or YYYY-MM-DD to timestamp in ms (dùng 12:00 trưa để tránh lệch múi giờ)
function parseDateToTime(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr.getTime();
  const s = String(dateStr).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d, 12, 0, 0).getTime();
    }
  }
  if (s.includes('-')) {
    const parts = s.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d, 12, 0, 0).getTime();
    }
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
}

// Tính toán tình trạng tự động dựa trên ngày văn bản trễ nhất vs ngày kết thúc
function evaluateTaskStatus(task, linkedDocs) {
  const progress = Number(task.progress_percent || task.progress || 0);
  const endDateStr = task.end_date || task.endDate;
  const startDateStr = task.start_date || task.startDate;
  
  const endDateTime = parseDateToTime(endDateStr);
  const startDateTime = parseDateToTime(startDateStr);
  const now = new Date().setHours(12, 0, 0, 0);

  // Tìm ngày văn bản trễ nhất trong các văn bản liên kết
  let latestDocDateStr = null;
  let latestDocDateTime = null;

  if (Array.isArray(linkedDocs) && linkedDocs.length > 0) {
    for (const doc of linkedDocs) {
      const docDateStr = doc.ngay_phat_hanh || doc.documentDate || doc.date;
      const docTime = parseDateToTime(docDateStr);
      if (docTime) {
        if (!latestDocDateTime || docTime > latestDocDateTime) {
          latestDocDateTime = docTime;
          latestDocDateStr = docDateStr;
        }
      }
    }
  }

  let calculatedStatus = 'in_progress_on_time';
  let statusText = 'Đang thực hiện';
  let statusColor = 'blue'; // 'green', 'red', 'yellow', 'blue', 'slate'
  let delayDays = 0;

  if (latestDocDateTime && endDateTime) {
    // Đã có văn bản thực tế liên kết
    if (latestDocDateTime <= endDateTime) {
      calculatedStatus = 'completed_on_time';
      statusText = `Đúng hạn (VB: ${latestDocDateStr})`;
      statusColor = 'green';
    } else {
      calculatedStatus = 'completed_late';
      delayDays = Math.ceil((latestDocDateTime - endDateTime) / (1000 * 60 * 60 * 24));
      statusText = `Trễ hạn ${delayDays} ngày (VB: ${latestDocDateStr})`;
      statusColor = 'red';
    }
  } else if (progress >= 100) {
    // Đã hoàn thành (chưa gắn VB)
    calculatedStatus = 'completed_on_time';
    statusText = 'Hoàn thành 100%';
    statusColor = 'green';
  } else if (progress > 0) {
    // Đang thực hiện
    if (endDateTime && now > endDateTime) {
      calculatedStatus = 'in_progress_late';
      delayDays = Math.ceil((now - endDateTime) / (1000 * 60 * 60 * 24));
      statusText = `Quá hạn ${delayDays} ngày`;
      statusColor = 'red';
    } else {
      calculatedStatus = 'in_progress_on_time';
      statusText = `Đang làm (${progress}%)`;
      statusColor = 'blue';
    }
  } else {
    // Chưa có tiến độ (0%)
    if (startDateTime && now < startDateTime) {
      calculatedStatus = 'not_started';
      statusText = 'Chưa bắt đầu';
      statusColor = 'slate';
    } else if (endDateTime && now > endDateTime) {
      calculatedStatus = 'overdue';
      delayDays = Math.ceil((now - endDateTime) / (1000 * 60 * 60 * 24));
      statusText = `Quá hạn bắt đầu (${delayDays} ngày)`;
      statusColor = 'red';
    } else {
      calculatedStatus = 'pending';
      statusText = 'Cần triển khai';
      statusColor = 'yellow';
    }
  }

  return {
    latestDocDate: latestDocDateStr,
    calculatedStatus,
    statusText,
    statusColor,
    delayDays
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        let tasksQuery = `
          SELECT 
            id, project_id, stt, title, group_name, stage, assigned_to,
            progress_percent, 
            TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date, 
            TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date, 
            duration_days,
            legal_basis, notes, parent_id, order_index, status, created_at, updated_at
          FROM tasks
        `;
        const params = [];
        if (projectId && projectId !== 'all') {
          tasksQuery += ` WHERE project_id = $1 OR project_id IS NULL `;
          params.push(projectId);
        }
        tasksQuery += ` ORDER BY order_index ASC, id ASC `;

        const tasksRes = await client.query(tasksQuery, params);

        // Lấy tất cả liên kết văn bản kèm metadata chi tiết từ drive_file_metadata
        const linksQuery = `
          SELECT 
            td.task_id, 
            td.document_path,
            td.file_id,
            COALESCE(dfm.file_name, td.document_path) AS file_name, 
            dfm.loai_vb, 
            dfm.so_vb, 
            dfm.ngay_phat_hanh, 
            dfm.noi_phat_hanh, 
            dfm.trich_yeu, 
            dfm.web_view_link
          FROM task_documents td
          LEFT JOIN drive_file_metadata dfm 
            ON (td.file_id IS NOT NULL AND td.file_id = dfm.file_id) 
            OR substring(td.document_path from '[^/]+$') = dfm.file_name
        `;
        const linksRes = await client.query(linksQuery);

        // Nhóm tài liệu theo task_id
        const taskLinksMap = new Map();
        for (const row of linksRes.rows) {
          if (!taskLinksMap.has(row.task_id)) {
            taskLinksMap.set(row.task_id, []);
          }
          taskLinksMap.get(row.task_id).push({
            file_id: row.file_id,
            name: row.file_name || (row.document_path ? path.basename(row.document_path) : 'Văn bản'),
            document_path: row.document_path,
            loai_vb: row.loai_vb || 'Khác',
            so_vb: row.so_vb || '',
            ngay_phat_hanh: row.ngay_phat_hanh || '',
            noi_phat_hanh: row.noi_phat_hanh || '',
            trich_yeu: row.trich_yeu || '',
            web_view_link: row.web_view_link || ''
          });
        }

        // Định dạng kết quả và tính toán tình trạng
        const formattedTasks = tasksRes.rows.map(task => {
          const linkedDocs = taskLinksMap.get(task.id) || [];
          const evaluation = evaluateTaskStatus(task, linkedDocs);

          return {
            id: task.id,
            project_id: task.project_id,
            stt: task.stt || '',
            title: task.title,
            group_name: task.group_name || '',
            stage: task.stage || '',
            assigned_to: task.assigned_to || '',
            assignedTo: task.assigned_to || '',
            progress: Number(task.progress_percent || 0),
            progress_percent: Number(task.progress_percent || 0),
            start_date: task.start_date || null,
            startDate: task.start_date || null,
            end_date: task.end_date || null,
            endDate: task.end_date || null,
            duration_days: task.duration_days || '',
            legal_basis: task.legal_basis || '',
            notes: task.notes || '',
            parent_id: task.parent_id || null,
            order_index: task.order_index || 0,
            status: task.status || 'pending',
            documents: linkedDocs.map(d => d.name),
            linkedDocs: linkedDocs,
            ...evaluation
          };
        });

        return NextResponse.json({
          success: true,
          source: 'supabase',
          tasks: formattedTasks
        });
      } catch (dbError) {
        console.error("Lỗi truy vấn danh sách công việc trên Supabase, chuyển sang fallback:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Fallback: db.json
    const data = readDb();
    let tasks = data.tasks || [];
    if (projectId && projectId !== 'all') {
      tasks = tasks.filter(t => !t.project_id || t.project_id === projectId);
    }
    const formatted = tasks.map(t => {
      const evaluation = evaluateTaskStatus(t, (t.documents || []).map(name => ({ name })));
      return {
        ...t,
        ...evaluation
      };
    });

    return NextResponse.json({
      success: true,
      source: 'local_db',
      tasks: formatted
    });

  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { action, task } = payload;
    const taskData = task || payload;

    if (!taskData.title) {
      return NextResponse.json({ error: 'Tiêu đề nhiệm vụ không được để trống' }, { status: 400 });
    }

    const taskId = taskData.id || `task-${Date.now()}`;
    const projectId = taskData.project_id || taskData.projectId || null;
    const stt = taskData.stt || '';
    const title = taskData.title;
    const groupName = taskData.group_name || taskData.groupName || '';
    const stage = taskData.stage || '';
    const assignedTo = taskData.assigned_to || taskData.assignedTo || '';
    const progress = parseInt(taskData.progress_percent ?? taskData.progress ?? 0, 10);
    const startDate = taskData.start_date || taskData.startDate || null;
    const endDate = taskData.end_date || taskData.endDate || null;
    const durationDays = taskData.duration_days || taskData.durationDays || '';
    const legalBasis = taskData.legal_basis || taskData.legalBasis || '';
    const notes = taskData.notes || '';
    const parentId = taskData.parent_id || taskData.parentId || null;
    const orderIndex = parseInt(taskData.order_index ?? taskData.orderIndex ?? 0, 10);
    const status = progress >= 100 ? 'completed' : (progress > 0 ? 'processing' : 'pending');

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        const checkRes = await client.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
        if (checkRes.rows.length > 0) {
          await client.query(`
            UPDATE tasks SET
              project_id = $1,
              stt = $2,
              title = $3,
              group_name = $4,
              stage = $5,
              assigned_to = $6,
              progress_percent = $7,
              start_date = $8,
              end_date = $9,
              duration_days = $10,
              legal_basis = $11,
              notes = $12,
              parent_id = $13,
              order_index = $14,
              status = $15,
              updated_at = NOW()
            WHERE id = $16
          `, [
            projectId, stt, title, groupName, stage, assignedTo,
            progress, startDate, endDate, durationDays, legalBasis,
            notes, parentId, orderIndex, status, taskId
          ]);
        } else {
          await client.query(`
            INSERT INTO tasks (
              id, project_id, stt, title, group_name, stage, assigned_to,
              progress_percent, start_date, end_date, duration_days,
              legal_basis, notes, parent_id, order_index, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [
            taskId, projectId, stt, title, groupName, stage, assignedTo,
            progress, startDate, endDate, durationDays, legalBasis,
            notes, parentId, orderIndex, status
          ]);
        }
      } catch (dbError) {
        console.error("Lỗi cập nhật task lên Supabase:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Ghi vào db.json
    try {
      const data = readDb();
      if (!data.tasks) data.tasks = [];
      const idx = data.tasks.findIndex(t => t.id === taskId);
      const savedTask = {
        id: taskId,
        project_id: projectId,
        stt,
        title,
        group_name: groupName,
        stage,
        assigned_to: assignedTo,
        progress_percent: progress,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        legal_basis: legalBasis,
        notes,
        parent_id: parentId,
        order_index: orderIndex,
        status
      };
      if (idx !== -1) {
        data.tasks[idx] = { ...data.tasks[idx], ...savedTask };
      } else {
        data.tasks.push(savedTask);
      }
      writeDb(data);
    } catch (e) {
      console.error('Error writing to db.json:', e);
    }

    return NextResponse.json({
      success: true,
      task: { id: taskId, ...taskData, progress, status }
    });

  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu task id' }, { status: 400 });
    }

    if (pool) {
      let client = null;
      try {
        client = await pool.connect();
        await client.query('DELETE FROM task_documents WHERE task_id = $1', [id]);
        await client.query('DELETE FROM tasks WHERE id = $1 OR parent_id = $1', [id]);
      } catch (dbError) {
        console.error("Lỗi xóa task trên Supabase:", dbError.message);
      } finally {
        if (client) client.release();
      }
    }

    // Xóa trong db.json
    try {
      const data = readDb();
      if (data.tasks) {
        data.tasks = data.tasks.filter(t => t.id !== id && t.parent_id !== id);
        writeDb(data);
      }
    } catch (e) {
      console.error('Error deleting from db.json:', e);
    }

    return NextResponse.json({ success: true, message: 'Đã xóa nhiệm vụ thành công' });

  } catch (error) {
    console.error('Error in DELETE /api/tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
