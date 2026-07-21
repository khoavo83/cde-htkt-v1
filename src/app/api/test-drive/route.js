import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

// API test để kiểm tra khả năng tải PDF từ Drive
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  
  if (!fileId) {
    return NextResponse.json({ error: 'Thiếu fileId' }, { status: 400 });
  }

  try {
    const drive = await getDriveClient();
    
    // Thử lấy metadata trước
    const meta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
    });
    
    // Thử tải nội dung file
    const content = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    const pdfSize = Buffer.from(content.data).length;
    
    return NextResponse.json({
      success: true,
      metadata: meta.data,
      pdfSizeBytes: pdfSize,
      pdfSizeKB: Math.round(pdfSize / 1024),
      message: `Tải PDF thành công! Kích thước: ${Math.round(pdfSize / 1024)} KB`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      status: error.status,
    }, { status: 500 });
  }
}
