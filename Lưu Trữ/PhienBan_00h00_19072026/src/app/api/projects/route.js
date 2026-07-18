import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'config.json');

export async function GET() {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    return NextResponse.json({ projects: config.projects || [] });
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json({ error: 'Không thể đọc danh sách dự án' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name } = body;
    
    if (!id || !name) {
      return NextResponse.json({ error: 'Thiếu ID (Folder ID) hoặc Tên dự án' }, { status: 400 });
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    let config = JSON.parse(configContent);
    
    if (!config.projects) {
      config.projects = [];
    }

    // Kiểm tra xem đã tồn tại chưa
    const exists = config.projects.find(p => p.id === id);
    if (exists) {
      return NextResponse.json({ error: 'Dự án (Folder ID) này đã tồn tại' }, { status: 400 });
    }

    config.projects.push({ id, name });

    // Lưu lại config.json
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    return NextResponse.json({ success: true, project: { id, name } });
  } catch (error) {
    console.error('Error saving project:', error);
    return NextResponse.json({ error: 'Không thể lưu dự án mới' }, { status: 500 });
  }
}
