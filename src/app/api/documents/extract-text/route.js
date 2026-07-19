import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';
import { extractText, getDocumentProxy } from 'unpdf';

export async function POST(request) {
  try {
    const { fileId, filePath } = await request.json();

    if (!fileId && !filePath) {
      return NextResponse.json({ error: 'Thiếu fileId hoặc filePath' }, { status: 400 });
    }

    let pdfBuffer = null;

    // Ưu tiên tải từ Google Drive bằng fileId
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
      }
    }

    // Fallback: đọc từ đường dẫn local
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

    // Kiểm tra header PDF
    const header = pdfBuffer.slice(0, 5).toString('utf8');
    if (!header.startsWith('%PDF')) {
      return NextResponse.json({
        error: 'File này không phải định dạng PDF.'
      }, { status: 400 });
    }

    // Trích xuất text bằng unpdf - lấy từng trang riêng
    const uint8 = new Uint8Array(pdfBuffer);
    
    // Dùng getDocumentProxy để kiểm soát chi tiết hơn
    const pdf = await getDocumentProxy(uint8);
    const totalPages = pdf.numPages;
    
    // Chỉ lấy trang đầu tiên
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    
    // Ghép text thông minh theo tọa độ Y (giữ layout dòng)
    let lines = [];
    let currentLine = '';
    let lastY = null;
    
    for (const item of textContent.items) {
      if (item.str === undefined) continue;
      
      const y = item.transform ? item.transform[5] : null;
      
      // Nếu tọa độ Y thay đổi → dòng mới
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = item.str;
      } else {
        currentLine += item.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    const firstPageText = lines.join('\n');

    if (!firstPageText || firstPageText.trim().length === 0) {
      return NextResponse.json({
        error: 'Không trích xuất được chữ. File này có thể là bản scan (ảnh chụp), cần dùng OCR.'
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
