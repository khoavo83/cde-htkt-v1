import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

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

    let queryText = `
      SELECT d1.*, 
             f.folder_name as fetched_folder_name,
             d2.loai_vb as target_loai_vb,
             d2.so_vb as target_so_vb,
             d2.ngay_phat_hanh as target_ngay_phat_hanh,
             d2.noi_phat_hanh as target_noi_phat_hanh,
             d2.trich_yeu as target_trich_yeu,
             d2.noi_gui as target_noi_gui
      FROM drive_file_metadata d1 
      LEFT JOIN drive_folders_flat f ON d1.folder_id = f.folder_id
      LEFT JOIN drive_file_metadata d2 ON d1.target_drive_id = d2.file_id
      WHERE 1=1
    `;
    const queryParams = [];

    if (q.trim() !== '') {
      queryParams.push(`%${q}%`);
      queryText += ` AND (d1.file_name ILIKE $${queryParams.length} OR d1.trich_yeu ILIKE $${queryParams.length} OR d1.so_vb ILIKE $${queryParams.length})`;
    }

    if (category !== 'Tất cả') {
      queryParams.push(category);
      queryText += ` AND (d1.loai_vb = $${queryParams.length} OR d2.loai_vb = $${queryParams.length})`;
    }

    if (ngayPhatHanh.trim() !== '') {
      queryParams.push(`%${ngayPhatHanh}%`);
      queryText += ` AND (d1.ngay_phat_hanh ILIKE $${queryParams.length} OR d2.ngay_phat_hanh ILIKE $${queryParams.length})`;
    }

    if (noiPhatHanh.trim() !== '') {
      queryParams.push(`%${noiPhatHanh}%`);
      queryText += ` AND (d1.noi_phat_hanh ILIKE $${queryParams.length} OR d2.noi_phat_hanh ILIKE $${queryParams.length})`;
    }

    // Giới hạn kết quả để tối ưu tốc độ
    queryText += ' LIMIT 100';

    const { rows } = await client.query(queryText, queryParams);

    const data = rows.map(r => ({
      id: r.file_id,
      name: r.file_name,
      file_name: r.file_name,
      loai_vb: r.target_loai_vb || r.loai_vb || '',
      so_vb: r.target_so_vb || r.so_vb || '',
      ngay_phat_hanh: r.target_ngay_phat_hanh || r.ngay_phat_hanh || '',
      noi_phat_hanh: r.target_noi_phat_hanh || r.noi_phat_hanh || '',
      trich_yeu: r.target_trich_yeu || r.trich_yeu || '',
      webViewLink: r.web_view_link,
      folder_id: r.folder_id || null,
      folder_name: r.fetched_folder_name || r.folder_name || '',
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
