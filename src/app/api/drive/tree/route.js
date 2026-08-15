import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function buildTree(flatFolders, rootId) {
  const nodeMap = new Map();
  const roots = [];

  // Tạo map các node
  flatFolders.forEach(folder => {
    nodeMap.set(folder.folder_id || folder.id, {
      id: folder.folder_id || folder.id,
      name: folder.folder_name || folder.name,
      isFolder: true,
      children: [],
      modifiedTime: folder.drive_modified_time || folder.modified_time
    });
  });

  // Gắn con vào cha
  flatFolders.forEach(folder => {
    const node = nodeMap.get(folder.folder_id || folder.id);
    if (folder.parent_id && nodeMap.has(folder.parent_id)) {
      nodeMap.get(folder.parent_id).children.push(node);
    } else {
      // Nếu không có parent hoặc parent không nằm trong map thì coi như root
      roots.push(node);
    }
  });

  // Hàm sắp xếp
  const sortTree = (nodes) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortTree(node.children);
      }
    }
  };

  sortTree(roots);
  return roots;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const targetProjectId = projectId;
    
    // Return empty state if no project ID is provided
    if (!targetProjectId) {
      return NextResponse.json({ data: [], message: 'Vui lòng chọn một dự án.', totalPdfCount: 0 });
    }

    // Read from Supabase if configured
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT * FROM drive_folders_flat WHERE project_id = $1', [targetProjectId]);
        
        let totalPdfCount = 0;
        try {
          const countRes = await client.query(
            `SELECT COUNT(DISTINCT m.file_id) as count
             FROM drive_file_metadata m
             JOIN drive_folders_flat f ON m.folder_id = f.folder_id
             WHERE f.project_id = $1`,
            [targetProjectId]
          );
          totalPdfCount = parseInt(countRes.rows[0].count, 10);
        } catch (e) {
          console.error("Lỗi khi đếm số file PDF:", e);
        }

        if (res.rows && res.rows.length > 0) {
          const tree = buildTree(res.rows, targetProjectId);
          return NextResponse.json({ data: tree, totalPdfCount });
        }
      } catch (dbError) {
        console.error('Error reading from Supabase:', dbError);
      } finally {
        client.release();
        await pool.end();
      }
    }

    const cachePath = path.join(process.cwd(), 'data', `drive_cache_${targetProjectId}.json`);
    
    // Đếm tổng số file PDF từ DB (dùng chung cho cả nhánh cache)
    let totalPdfCount = 0;
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      try {
        const client = await pool.connect();
        const countRes = await client.query(
          `SELECT COUNT(DISTINCT m.file_id) as count
           FROM drive_file_metadata m
           JOIN drive_folders_flat f ON m.folder_id = f.folder_id
           WHERE f.project_id = $1`,
          [targetProjectId]
        );
        totalPdfCount = parseInt(countRes.rows[0].count, 10);
        client.release();
      } catch (e) {
        console.error("Lỗi khi đếm số file PDF:", e);
      } finally {
        await pool.end();
      }
    }

    if (!fs.existsSync(cachePath)) {
      return NextResponse.json({ data: [], message: 'Cache chưa được tạo. Vui lòng đồng bộ dữ liệu.', totalPdfCount });
    }
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    // If the cache is a flat array, build the tree
    if (Array.isArray(data) && data.length > 0 && !data[0].children) {
        const tree = buildTree(data, targetProjectId);
        return NextResponse.json({ data: tree, totalPdfCount });
    }
    return NextResponse.json({ data: data, totalPdfCount }); // Fallback to old format
  } catch (error) {
    console.error('Error reading cache:', error);
    return NextResponse.json({ error: 'Không thể đọc dữ liệu cache' }, { status: 500 });
  }
}
