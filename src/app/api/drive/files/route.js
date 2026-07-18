import { NextResponse } from 'next/server';
import { fetchFolderFiles } from '@/lib/drive';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Thiếu folderId' }, { status: 400 });
    }

    const files = await fetchFolderFiles(folderId);
    
    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
