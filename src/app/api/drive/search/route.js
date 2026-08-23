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
    const projectId = searchParams.get('projectId') || '';
    const category = searchParams.get('category') || 'Tất cả';
    const ngayPhatHanh = searchParams.get('ngayPhatHanh') || '';
    const noiPhatHanh = searchParams.get('noiPhatHanh') || '';

    client = await pool.connect();

    let queryText = `
      SELECT d1.*, 
             f.folder_name as fetched_folder_name,
             f.project_id as folder_project_id,
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

    // Lọc theo Project ID nếu có
    if (projectId && projectId.trim() !== '') {
      queryParams.push(projectId.trim());
      queryText += ` AND f.project_id = $${queryParams.length}`;
    }

    if (q.trim() !== '') {
      queryParams.push(`%${q.trim()}%`);
      const pIndex = queryParams.length;
      queryText += ` AND (
        d1.file_name ILIKE $${pIndex} 
        OR d1.trich_yeu ILIKE $${pIndex} 
        OR d1.so_vb ILIKE $${pIndex}
        OR d2.so_vb ILIKE $${pIndex}
        OR d2.trich_yeu ILIKE $${pIndex}
        OR d1.noi_phat_hanh ILIKE $${pIndex}
        OR f.folder_name ILIKE $${pIndex}
      )`;
    }

    if (category !== 'Tất cả' && category.trim() !== '') {
      queryParams.push(category);
      queryText += ` AND (d1.loai_vb = $${queryParams.length} OR d2.loai_vb = $${queryParams.length})`;
    }

    if (ngayPhatHanh.trim() !== '') {
      queryParams.push(`%${ngayPhatHanh.trim()}%`);
      queryText += ` AND (d1.ngay_phat_hanh ILIKE $${queryParams.length} OR d2.ngay_phat_hanh ILIKE $${queryParams.length})`;
    }

    if (noiPhatHanh.trim() !== '') {
      queryParams.push(`%${noiPhatHanh.trim()}%`);
      queryText += ` AND (d1.noi_phat_hanh ILIKE $${queryParams.length} OR d2.noi_phat_hanh ILIKE $${queryParams.length})`;
    }

    // Sắp xếp ưu tiên ngày phát hành mới nhất
    queryText += ' ORDER BY d1.ngay_phat_hanh DESC NULLS LAST, d1.file_name ASC';
    queryText += ' LIMIT 300';

    const { rows } = await client.query(queryText, queryParams);

    const data = rows.map(r => {
      const soVb = r.target_so_vb || r.so_vb || '';
      const trichYeu = r.target_trich_yeu || r.trich_yeu || '';
      const ngay = r.target_ngay_phat_hanh || r.ngay_phat_hanh || '';
      const folderName = r.fetched_folder_name || r.folder_name || '';

      // Tự động phân tích từ tên file nếu metadata trống
      let parsedSoVb = soVb;
      let parsedNgay = ngay;
      let parsedTrichYeu = trichYeu;

      if (!parsedSoVb || !parsedNgay || !parsedTrichYeu) {
        const fileName = r.file_name || '';
        const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
        const parts = nameWithoutExt.split('_');
        if (parts.length >= 3 && /^(\d{4})-(\d{2})-(\d{2})$/.test(parts[0])) {
          const dateMatch = parts[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!parsedNgay) parsedNgay = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
          if (!parsedSoVb) parsedSoVb = parts.slice(1, parts.length - 1).join('/');
          if (!parsedTrichYeu) parsedTrichYeu = parts[parts.length - 1];
        }
      }

      // Chuẩn hóa ngày ISO (YYYY-MM-DD) và ngày VN (DD/MM/YYYY)
      let dateIso = '';
      let dateVn = '';
      if (parsedNgay) {
        const p = String(parsedNgay).split('T')[0].trim();
        const parts = p.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            dateIso = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            dateVn = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
          } else if (parts[2].length === 4) {
            dateIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            dateVn = `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
          }
        }
      }

      return {
        id: r.file_id,
        file_id: r.file_id,
        name: r.file_name,
        file_name: r.file_name,
        loai_vb: r.target_loai_vb || r.loai_vb || 'Văn bản',
        so_vb: parsedSoVb || 'Chưa có số hiệu',
        document_number: parsedSoVb || 'Chưa có số hiệu',
        ngay_phat_hanh: dateVn || parsedNgay,
        date: dateIso || parsedNgay,
        date_iso: dateIso,
        date_vn: dateVn || parsedNgay,
        noi_phat_hanh: r.target_noi_phat_hanh || r.noi_phat_hanh || '',
        issuing_agency: r.target_noi_phat_hanh || r.noi_phat_hanh || '',
        trich_yeu: parsedTrichYeu || r.file_name,
        title: parsedTrichYeu || r.file_name,
        webViewLink: r.web_view_link,
        path: folderName ? `${folderName}/${r.file_name}` : r.file_name,
        folder_id: r.folder_id || null,
        folder_name: folderName,
        mimeType: 'application/pdf',
        _loading: false
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error searching drive files in Supabase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
