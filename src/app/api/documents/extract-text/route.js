import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function POST(request) {
  try {
    const { fileId, filePath } = await request.json();

    if (!fileId && !filePath) {
      return NextResponse.json({ error: 'Thiếu fileId hoặc filePath' }, { status: 400 });
    }

    let pdfBuffer = null;

    // Ưu tiên tải từ Google Drive bằng fileId (đáng tin cậy nhất)
    if (fileId && !fileId.startsWith('file-sync')) {
      try {
        const drive = await getDriveClient();
        const response = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        pdfBuffer = Buffer.from(response.data);
      } catch (driveErr) {
        console.error('Lỗi tải file từ Drive:', driveErr.message);
        // Không return, thử fallback sang local path
      }
    }

    // Fallback: đọc từ đường dẫn local (nếu không tải được từ Drive)
    if (!pdfBuffer && filePath) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(filePath)) {
          pdfBuffer = fs.readFileSync(filePath);
        }
      } catch (fsErr) {
        console.error('Lỗi đọc file local:', fsErr.message);
      }
    }

    if (!pdfBuffer) {
      return NextResponse.json({ 
        error: 'Không thể tải file PDF. Kiểm tra lại fileId hoặc đường dẫn file.' 
      }, { status: 500 });
    }

    // Kiểm tra đây có phải file PDF không
    const header = pdfBuffer.slice(0, 5).toString('utf8');
    if (!header.startsWith('%PDF')) {
      return NextResponse.json({ 
        error: 'File này không phải định dạng PDF. Chỉ hỗ trợ trích xuất text từ file PDF gốc (không phải file scan ảnh).' 
      }, { status: 400 });
    }

    // Trích xuất text bằng unpdf (chạy trên server, không cần DOM)
    const { extractText } = await import('unpdf');
    const uint8 = new Uint8Array(pdfBuffer);
    const { text, totalPages } = await extractText(uint8, { mergePages: false });

    // Chỉ lấy trang đầu tiên
    const firstPageText = text && text.length > 0 ? text[0] : '';

    if (!firstPageText || firstPageText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Không trích xuất được chữ. File này có thể là bản scan (ảnh chụp), cần dùng OCR để đọc.' 
      }, { status: 400 });
    }

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
