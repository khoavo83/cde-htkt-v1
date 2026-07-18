import { NextResponse } from 'next/server';
import fs from 'fs';
import { exec } from 'child_process';

export async function POST(request) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json({ error: "Thiếu đường dẫn tệp tin (filePath)" }, { status: 400 });
    }

    // Kiểm tra xem file có thực sự tồn tại trên ổ đĩa không
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Tệp tin không tồn tại tại đường dẫn: ${filePath}` }, { status: 404 });
    }

    console.log(`Đang yêu cầu hệ thống mở tệp tin: ${filePath}`);

    // Sử dụng PowerShell Start-Process để mở file bằng ứng dụng mặc định trên Windows
    // Chuẩn hóa đường dẫn để tránh lỗi ký tự đặc biệt trong câu lệnh shell
    const escapedPath = filePath.replace(/'/g, "''");
    const command = `powershell -Command "Start-Process '${escapedPath}'"`;

    exec(command, (error) => {
      if (error) {
        console.error("Lỗi khi mở file:", error);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Đang mở tệp tin bằng ứng dụng mặc định trên máy tính..." 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
