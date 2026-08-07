import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { renameFile } from '@/lib/drive';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

/**
 * Tạo tên file Phiếu trình theo chuẩn:
 * yyyy-mm-dd_PTr-HTKT_<số> (chỉ lấy phần số trước dấu /)
 * VD: ngay = "27/03/2026", so_vb = "750/BQLĐSĐT-HTKT" => "2026-03-27_PTr-HTKT_750"
 */
function buildPhieuTrinhName(ngayPhatHanh, soVb) {
  let datePart = '';
  if (ngayPhatHanh) {
    const parts = ngayPhatHanh.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      datePart = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }
  const soSo = soVb ? soVb.split('/')[0].trim() : '';
  return `${datePart}_PTr-HTKT_${soSo}`;
}

export async function POST(request) {
  if (!pool) {
    return NextResponse.json({ error: 'Chưa kết nối database' }, { status: 500 });
  }

  let client = null;
  try {
    const body = await request.json();
    const { action, child_id, parent_id, child_name, parent_name } = body;

    if (!child_id || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    client = await pool.connect();

    // ── Đính kèm file Word dự thảo vào PDF ──────────────────────────────────
    if (action === 'attach') {
      if (!parent_id) {
        return NextResponse.json({ error: 'Thiếu parent_id để đính kèm' }, { status: 400 });
      }

      let newName = null;
      let cName = child_name;
      let pName = parent_name;

      if (!cName || !pName) {
        const resChild  = await client.query('SELECT file_name FROM drive_file_metadata WHERE file_id = $1', [child_id]);
        const resParent = await client.query('SELECT file_name FROM drive_file_metadata WHERE file_id = $1', [parent_id]);
        if (resChild.rows.length  > 0) cName = resChild.rows[0].file_name;
        if (resParent.rows.length > 0) pName = resParent.rows[0].file_name;
      }
      
      if (cName && pName) {
        const ext     = cName.includes('.') ? cName.split('.').pop() : 'doc';
        const pdfBase = pName.replace(/\.pdf$/i, '');
        newName = `${pdfBase}.${ext}`;
        try { await renameFile(child_id, newName); } catch (e) {
          console.error('Lỗi đổi tên file dự thảo trên Drive:', e);
        }
      }

      if (newName) {
        await client.query(
          'UPDATE drive_file_metadata SET parent_id = $1, file_name = $2 WHERE file_id = $3',
          [parent_id, newName, child_id]
        );
      } else {
        await client.query(
          'UPDATE drive_file_metadata SET parent_id = $1 WHERE file_id = $2',
          [parent_id, child_id]
        );
      }

      return NextResponse.json({ success: true, message: 'Đã đính kèm và đổi tên thành công', newName });

    // ── Gắn Phiếu trình vào Công văn đi ────────────────────────────────────
    } else if (action === 'attach-phieu-trinh') {
      if (!parent_id) {
        return NextResponse.json({ error: 'Thiếu parent_id (Công văn đi)' }, { status: 400 });
      }

      // Lấy thông tin Công văn đi từ DB để xây dựng tên Phiếu trình
      const resParent = await client.query(
        'SELECT so_vb, ngay_phat_hanh, file_name, web_view_link FROM drive_file_metadata WHERE file_id = $1',
        [parent_id]
      );
      if (resParent.rows.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy Công văn đi' }, { status: 404 });
      }

      const parent = resParent.rows[0];
      const newName = buildPhieuTrinhName(parent.ngay_phat_hanh, parent.so_vb) + '.pdf';

      // Đổi tên file Phiếu trình trên Google Drive
      let newWebViewLink = null;
      try {
        const renamed = await renameFile(child_id, newName);
        if (renamed?.webViewLink) newWebViewLink = renamed.webViewLink;
      } catch (e) {
        console.error('Lỗi đổi tên Phiếu trình trên Drive:', e.message);
      }

      // Lấy web_view_link hiện tại nếu Drive không trả về link mới
      if (!newWebViewLink) {
        const resChild = await client.query('SELECT web_view_link FROM drive_file_metadata WHERE file_id = $1', [child_id]);
        if (resChild.rows.length > 0) newWebViewLink = resChild.rows[0].web_view_link;
      }

      // Cập nhật Supabase: gắn parent_id, loai_vb, tên mới, trích yếu
      await client.query(`
        UPDATE drive_file_metadata 
        SET parent_id       = $1,
            loai_vb         = 'Phiếu trình',
            file_name       = $2,
            trich_yeu       = $3,
            manually_edited = true
        WHERE file_id = $4
      `, [
        parent_id,
        newName,
        `Phiếu trình công văn số ${parent.so_vb}`,
        child_id
      ]);

      return NextResponse.json({
        success: true,
        message: 'Đã gắn Phiếu trình thành công',
        newName,
        phieu_trinh: { id: child_id, name: newName, webViewLink: newWebViewLink }
      });

    // ── Gỡ Phiếu trình ─────────────────────────────────────────────────────
    } else if (action === 'detach-phieu-trinh') {
      await client.query(`
        UPDATE drive_file_metadata 
        SET parent_id = NULL,
            loai_vb   = NULL
        WHERE file_id = $1 AND loai_vb = 'Phiếu trình'
      `, [child_id]);

      return NextResponse.json({ success: true, message: 'Đã gỡ Phiếu trình' });

    // ── Gỡ file dự thảo ────────────────────────────────────────────────────
    } else if (action === 'detach') {
      await client.query(
        'UPDATE drive_file_metadata SET parent_id = NULL WHERE file_id = $1',
        [child_id]
      );
      return NextResponse.json({ success: true, message: 'Đã gỡ đính kèm' });

    } else {
      return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error attaching file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
