import { NextResponse } from 'next/server';
import { fetchDriveTree } from '@/lib/drive';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Using config.json in the project root
const configPath = path.join(process.cwd(), 'config.json');
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    let targetFolderId = null;
    let targetProjectId = projectId;
    
    if (projectId && config.projects) {
      const project = config.projects.find(p => p.id === projectId);
      if (project) {
        targetFolderId = project.id; // Using id as folder_id
      }
    }
    
    // Fallback for default
    if (!targetFolderId) {
      targetFolderId = config.google_drive.main_folder_id;
      targetProjectId = targetFolderId;
    }

    if (!targetFolderId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    const cachePath = path.join(process.cwd(), 'data', `drive_cache_${targetProjectId}.json`);
    const dataDir = path.dirname(cachePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('Starting sync for folder:', targetFolderId);
    // Fetch the tree (folders only)
    const tree = await fetchDriveTree(targetFolderId);
    
    // Save to Supabase if configured
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      const client = await pool.connect();
      try {
        // Create table if not exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS drive_folders (
            project_id VARCHAR(255) PRIMARY KEY,
            data JSONB,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        // Upsert
        await client.query(`
          INSERT INTO drive_folders (project_id, data, updated_at) 
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (project_id) DO UPDATE SET 
            data = EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP;
        `, [targetProjectId, JSON.stringify(tree)]);
        console.log('Saved tree to Supabase table drive_folders');
      } catch (dbError) {
        console.error('Error saving to Supabase:', dbError);
      } finally {
        client.release();
        await pool.end();
      }
    }
    
    // Save to cache as fallback
    fs.writeFileSync(cachePath, JSON.stringify(tree, null, 2), 'utf8');
    console.log('Sync complete, saved to', cachePath);

    return NextResponse.json({ success: true, message: 'Đồng bộ dữ liệu thành công' });
  } catch (error) {
    console.error('Error during sync:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
