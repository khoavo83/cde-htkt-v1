import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return new NextResponse('Missing fileId', { status: 400 });
    }

    const drive = await getDriveClient();

    // Lấy file dạng buffer trực tiếp để tránh lỗi luồng stream (Stream corruption)
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="document_${fileId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Lỗi khi proxy PDF:', error.message);
    return new NextResponse('Error fetching PDF: ' + error.message, { status: 500 });
  }
}
