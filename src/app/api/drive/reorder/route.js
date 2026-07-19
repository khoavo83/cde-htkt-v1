import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

export async function POST(request) {
  let client = null;
  try {
    if (!pool) {
      return NextResponse.json({ error: 'Database chưa được cấu hình' }, { status: 500 });
    }

    const { updates } = await request.json();
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    client = await pool.connect();
    
    // Bắt đầu transaction
    await client.query('BEGIN');
    
    // Tạo câu truy vấn update bulk bằng bảng ảo (unnest)
    // updates là một mảng object: [{ fileId: '123', orderIndex: 0 }, ...]
    const fileIds = updates.map(u => u.fileId);
    const orderIndices = updates.map(u => u.orderIndex);

    // Dùng UNNEST để map 2 array với nhau và UPDATE hàng loạt cho hiệu suất cao
    const query = `
      UPDATE drive_file_metadata AS d
      SET custom_order_index = t.order_index::int
      FROM (SELECT unnest($1::text[]) AS file_id, unnest($2::int[]) AS order_index) AS t
      WHERE d.file_id = t.file_id
    `;
    
    await client.query(query, [fileIds, orderIndices]);

    await client.query('COMMIT');

    return NextResponse.json({ success: true, message: 'Đã cập nhật thứ tự' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Lỗi khi reorder:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
