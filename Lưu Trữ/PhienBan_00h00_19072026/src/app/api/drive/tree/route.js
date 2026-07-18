import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    let targetProjectId = projectId;
    
    // Fallback if no project ID is provided
    if (!targetProjectId) {
      const configPath = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        targetProjectId = config.google_drive?.main_folder_id;
      }
    }

    // Read from Supabase if configured
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT data FROM drive_folders WHERE project_id = $1', [targetProjectId]);
        if (res.rows && res.rows.length > 0) {
          return NextResponse.json({ data: res.rows[0].data });
        }
      } catch (dbError) {
        console.error('Error reading from Supabase:', dbError);
      } finally {
        client.release();
        await pool.end();
      }
    }

    const cachePath = path.join(process.cwd(), 'data', `drive_cache_${targetProjectId}.json`);

    if (!fs.existsSync(cachePath)) {
      return NextResponse.json({ data: [], message: 'Cache chưa được tạo. Vui lòng đồng bộ dữ liệu.' });
    }
    const data = fs.readFileSync(cachePath, 'utf8');
    return NextResponse.json({ data: JSON.parse(data) });
  } catch (error) {
    console.error('Error reading cache:', error);
    return NextResponse.json({ error: 'Không thể đọc dữ liệu cache' }, { status: 500 });
  }
}
