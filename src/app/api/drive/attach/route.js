import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { renameFile } from '@/lib/drive';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

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

    if (action === 'attach') {
      if (!parent_id) {
        return NextResponse.json({ error: 'Thiếu parent_id để đính kèm' }, { status: 400 });
      }

      let newName = null;
      let cName = child_name;
      let pName = parent_name;

      if (!cName || !pName) {
        const resChild = await client.query('SELECT file_name FROM drive_file_metadata WHERE file_id = $1', [child_id]);
        const resParent = await client.query('SELECT file_name FROM drive_file_metadata WHERE file_id = $1', [parent_id]);
        if (resChild.rows.length > 0) cName = resChild.rows[0].file_name;
        if (resParent.rows.length > 0) pName = resParent.rows[0].file_name;
      }
      
      if (cName && pName) {
        const ext = cName.includes('.') ? cName.split('.').pop() : 'doc';
        const pdfBase = pName.replace(/\.pdf$/i, '');
        newName = `${pdfBase}.${ext}`;
        
        // Đổi tên trên Google Drive
        try {
          await renameFile(child_id, newName);
        } catch (renameErr) {
          console.error("Lỗi khi đổi tên file trên Drive:", renameErr);
        }
      }

      // Cập nhật Database
      if (newName) {
        await client.query(`
          UPDATE drive_file_metadata 
          SET parent_id = $1, file_name = $2
          WHERE file_id = $3
        `, [parent_id, newName, child_id]);
      } else {
        await client.query(`
          UPDATE drive_file_metadata 
          SET parent_id = $1
          WHERE file_id = $2
        `, [parent_id, child_id]);
      }

      return NextResponse.json({ success: true, message: 'Đã đính kèm và đổi tên thành công', newName });

    } else if (action === 'detach') {
      await client.query(`
        UPDATE drive_file_metadata 
        SET parent_id = NULL
        WHERE file_id = $1
      `, [child_id]);

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
