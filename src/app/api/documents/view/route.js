import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return new Response("Thiếu tham số đường dẫn tệp tin (?path=...)", { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return new Response(`Tệp tin không tồn tại tại đường dẫn: ${filePath}`, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Xác định Content-Type phù hợp để trình duyệt có thể render trực tiếp
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';
    else if (ext === '.html') contentType = 'text/html; charset=utf-8';

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Dùng inline để xem trực tiếp, attachment để bắt tải về
        'Content-Disposition': ext === '.pdf' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' ? 'inline' : `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`
      }
    });

  } catch (error) {
    return new Response(`Lỗi hệ thống: ${error.message}`, { status: 500 });
  }
}
