import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    const data = readDb();
    return NextResponse.json(data.plots);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const updatedPlot = await request.json();
    const data = readDb();
    
    const index = data.plots.findIndex(p => p.id === updatedPlot.id);
    if (index !== -1) {
      // Cập nhật thông tin thửa đất
      data.plots[index] = { ...data.plots[index], ...updatedPlot };
      writeDb(data);
      
      // Giả lập cơ chế Realtime bằng cách ghi nhận log hoặc gửi SSE (ở đây chúng ta sẽ lưu lại trạng thái)
      return NextResponse.json({ success: true, plot: data.plots[index] });
    }
    
    return NextResponse.json({ error: "Không tìm thấy thửa đất" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
