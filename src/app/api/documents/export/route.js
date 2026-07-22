import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import * as xlsx from 'xlsx';

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
    const folderIdsStr = searchParams.get('folderIds') || '';
    const category = searchParams.get('category') || '';
    const ngayPhatHanh = searchParams.get('ngayPhatHanh') || '';
    const noiPhatHanh = searchParams.get('noiPhatHanh') || '';
    
    client = await pool.connect();
    let queryText = 'SELECT * FROM drive_file_metadata WHERE 1=1';
    const queryParamsArgs = [];

    // Lọc theo tìm kiếm
    if (q.trim() !== '') {
      queryParamsArgs.push(`%${q}%`);
      queryText += ` AND (file_name ILIKE $${queryParamsArgs.length} OR trich_yeu ILIKE $${queryParamsArgs.length} OR so_vb ILIKE $${queryParamsArgs.length})`;
    }

    if (category.trim() !== '') {
      queryParamsArgs.push(category);
      queryText += ` AND loai_vb = $${queryParamsArgs.length}`;
    }

    if (ngayPhatHanh.trim() !== '') {
      queryParamsArgs.push(`%${ngayPhatHanh}%`);
      queryText += ` AND ngay_phat_hanh ILIKE $${queryParamsArgs.length}`;
    }

    if (noiPhatHanh.trim() !== '') {
      queryParamsArgs.push(`%${noiPhatHanh}%`);
      queryText += ` AND noi_phat_hanh ILIKE $${queryParamsArgs.length}`;
    }

    // Lấy đệ quy (thư mục con) bằng cách truyền mảng folderIds từ frontend
    // Nếu có folderIds và không search, chỉ lấy trong các thư mục đó
    if (folderIdsStr && q.trim() === '' && ngayPhatHanh.trim() === '' && noiPhatHanh.trim() === '') {
        const folderIdsArr = folderIdsStr.split(',');
        queryParamsArgs.push(folderIdsArr);
        queryText += ` AND folder_id = ANY($${queryParamsArgs.length})`;
    }

    // Sắp xếp theo thư mục để gom nhóm (folder_name), sau đó theo ngày phát hành
    queryText += ' ORDER BY folder_name ASC, folder_id ASC, ngay_phat_hanh DESC, file_name ASC';

    const { rows } = await client.query(queryText, queryParamsArgs);

    // Xử lý tạo dữ liệu cho Excel (Group by folder)
    const excelData = [];
    let currentFolderId = null;

    rows.forEach((row, index) => {
      // Nếu chuyển sang một thư mục mới, chèn một dòng Tiêu đề thư mục
      if (row.folder_id !== currentFolderId) {
        currentFolderId = row.folder_id;
        
        // Thêm dòng trống để cách điệu
        if (excelData.length > 0) {
          excelData.push({});
        }

        // Dòng header của Group Thư mục
        excelData.push({
          'Tên File': `📂 THƯ MỤC: ${row.folder_name || 'Không xác định'}`,
          'Số VB': '',
          'Ngày Ban Hành': '',
          'Nơi Phát Hành': '',
          'Trích Yếu': '',
          'Link Drive': '',
          'File ID': '',
          'Folder Name': '',
          'Folder ID': row.folder_id || ''
        });
      }

      // Thêm dòng dữ liệu file
      excelData.push({
        'Tên File': row.file_name || '',
        'Số VB': row.so_vb || '',
        'Ngày Ban Hành': row.ngay_phat_hanh || '',
        'Nơi Phát Hành': row.noi_phat_hanh || '',
        'Trích Yếu': row.trich_yeu || '',
        'Link Drive': row.web_view_link || '',
        'File ID': row.file_id || '',
        'Folder Name': row.folder_name || '',
        'Folder ID': row.folder_id || ''
      });
    });

    // Tạo workbook và worksheet
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    
    // Tùy chỉnh độ rộng cột
    const wscols = [
      { wch: 50 }, // Tên File
      { wch: 20 }, // Số VB
      { wch: 15 }, // Ngày Ban Hành
      { wch: 25 }, // Nơi Phát Hành
      { wch: 60 }, // Trích Yếu
      { wch: 50 }, // Link Drive
      { wch: 40 }, // File ID
      { wch: 20 }, // Folder Name
      { wch: 40 }, // Folder ID
    ];
    worksheet['!cols'] = wscols;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Danh_Sach_Van_Ban');

    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Danh_Sach_Van_Ban.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
