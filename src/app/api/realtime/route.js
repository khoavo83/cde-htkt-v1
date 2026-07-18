import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Tránh việc Next.js tối ưu hóa tĩnh API này
export const dynamic = 'force-dynamic';

export async function GET() {
  const dbPath = path.join(process.cwd(), 'src', 'data', 'db.json');
  
  let active = true;
  let pingInterval;
  let watcher;

  const responseStream = new ReadableStream({
    start(controller) {
      const sendData = (event, data) => {
        if (!active) return;
        try {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
          console.error("Lỗi gửi dữ liệu SSE:", e.message);
          active = false;
        }
      };

      // Gửi sự kiện ping định kỳ để giữ kết nối sống
      pingInterval = setInterval(() => {
        sendData('ping', { time: Date.now() });
      }, 15000);

      // Lắng nghe sự thay đổi của file db.json
      try {
        if (fs.existsSync(dbPath)) {
          watcher = fs.watch(dbPath, (eventType) => {
            if (eventType === 'change' && active) {
              try {
                // Đọc lại db.json và gửi cho client
                const freshData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                sendData('update', freshData);
              } catch (readError) {
                // Tránh crash nếu file đang ghi dở
              }
            }
          });
        }
      } catch (watchError) {
        console.error("Lỗi khởi tạo watcher:", watchError);
      }
    },
    cancel() {
      active = false;
      if (pingInterval) clearInterval(pingInterval);
      if (watcher) watcher.close();
      console.log("Realtime SSE: Kết nối đã được đóng bởi client.");
    }
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
