import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

export async function GET(request) {
  if (!pool) {
    return NextResponse.json({ error: 'Chưa kết nối database' }, { status: 500 });
  }

  let client = null;
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'Tất cả';
    const ngayPhatHanh = searchParams.get('ngayPhatHanh') || '';
    const noiPhatHanh = searchParams.get('noiPhatHanh') || '';

    client = await pool.connect();

    let queryText = 'SELECT * FROM drive_file_metadata WHERE 1=1';
    const queryParams = [];

    if (q.trim() !== '') {
      queryParams.push(`%${q}%`);
      queryText += ` AND (file_name ILIKE $${queryParams.length} OR trich_yeu ILIKE $${queryParams.length} OR so_vb ILIKE $${queryParams.length})`;
    }

    if (category !== 'Tất cả') {
      queryParams.push(category);
      queryText += ` AND loai_vb = $${queryParams.length}`;
    }

    if (ngayPhatHanh.trim() !== '') {
      queryParams.push(`%${ngayPhatHanh}%`);
      queryText += ` AND ngay_phat_hanh ILIKE $${queryParams.length}`;
    }

    if (noiPhatHanh.trim() !== '') {
      queryParams.push(`%${noiPhatHanh}%`);
      queryText += ` AND noi_phat_hanh ILIKE $${queryParams.length}`;
    }

    // Giới hạn kết quả để tối ưu tốc độ
    queryText += ' LIMIT 100';

    const { rows } = await client.query(queryText, queryParams);

    // Map the metadata to match the frontend expectations (FolderTree format)
    const data = rows.map(r => ({
      id: r.file_id,
      name: r.file_name,
      file_name: r.file_name,
      loai_vb: r.loai_vb || '',
      so_vb: r.so_vb || '',
      ngay_phat_hanh: r.ngay_phat_hanh || '',
      noi_phat_hanh: r.noi_phat_hanh || '',
      trich_yeu: r.trich_yeu || '',
      webViewLink: r.web_view_link,
      folder_id: r.folder_id || null,
      folder_name: r.folder_name || '',
      mimeType: 'application/pdf', // assumed
      _loading: false
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error searching drive files in Supabase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
