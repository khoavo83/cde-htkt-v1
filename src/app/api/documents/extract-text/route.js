import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { fileId, filePath } = await request.json();

    // Ưu tiên đọc từ filePath (đường dẫn file local) trước
    let pdfBuffer = null;

    if (filePath) {
      // Đọc trực tiếp từ đường dẫn local trên máy
      try {
        if (!fs.existsSync(filePath)) {
          return NextResponse.json({ 
            error: 'Không tìm thấy file tại đường dẫn: ' + filePath 
          }, { status: 404 });
        }
        pdfBuffer = fs.readFileSync(filePath);
      } catch (fsErr) {
        return NextResponse.json({ 
          error: 'Không thể đọc file: ' + fsErr.message 
        }, { status: 500 });
      }
    } else if (fileId) {
      // Fallback: đọc từ Google Drive nếu có fileId
      try {
        const { getDriveClient } = await import('@/lib/drive');
        const drive = await getDriveClient();
        const response = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        pdfBuffer = Buffer.from(response.data);
      } catch (driveErr) {
        return NextResponse.json({ 
          error: 'Không thể tải file từ Drive: ' + driveErr.message 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Thiếu filePath hoặc fileId' }, { status: 400 });
    }

    // Kiểm tra đây có phải file PDF không
    const header = pdfBuffer.slice(0, 5).toString('utf8');
    if (!header.startsWith('%PDF')) {
      return NextResponse.json({ 
        error: 'File này không phải PDF (header: ' + header + '). Chỉ hỗ trợ trích xuất text từ PDF.' 
      }, { status: 400 });
    }

    // Trích xuất text bằng unpdf (chạy trên server, không cần DOM)
    const { extractText } = await import('unpdf');
    const uint8 = new Uint8Array(pdfBuffer);
    const { text, totalPages } = await extractText(uint8, { mergePages: false });

    // Chỉ lấy trang đầu tiên
    const firstPageText = text && text.length > 0 ? text[0] : '';

    return NextResponse.json({
      success: true,
      text: firstPageText,
      pageCount: totalPages,
    });

  } catch (error) {
    console.error('Lỗi khi trích xuất text PDF:', error);
    return NextResponse.json({ 
      error: 'Lỗi trích xuất text PDF: ' + error.message 
    }, { status: 500 });
  }
}
