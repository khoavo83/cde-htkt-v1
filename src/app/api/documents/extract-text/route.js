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

    // Trích xuất toàn bộ các trang PDF có cấu trúc
    const { extractAllPdfPagesStructured } = await import('@/utils/pdfExtractor');
    const result = await extractAllPdfPagesStructured(pdfBuffer);

    if (result.totalCharacters === 0) {
      return NextResponse.json({
        error: `Không trích xuất được chữ (${result.totalPages} trang). File này có thể là bản scan (ảnh chụp), cần dùng AI OCR.`
      }, { status: 400 });
    }

    const fullText = result.pages
      .filter(p => !p.isEmpty)
      .map(p => `--- Trang ${p.pageNumber}/${result.totalPages} ---\n${p.text}`)
      .join('\n\n');

    return NextResponse.json({
      success: true,
      text: fullText,
      pageCount: result.totalPages,
      textPagesCount: result.textPagesCount,
      totalCharacters: result.totalCharacters
    });

  } catch (error) {
    console.error('Lỗi khi trích xuất text PDF:', error);
    return NextResponse.json({
      error: 'Lỗi trích xuất text PDF: ' + error.message
    }, { status: 500 });
  }
}
