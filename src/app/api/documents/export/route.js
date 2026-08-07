import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

import ExcelJS from 'exceljs';

export async function POST(request) {
  if (!pool) {
    return NextResponse.json({ error: 'Chưa kết nối database' }, { status: 500 });
  }

  let client = null;
  try {
    const body = await request.json();
    const q = body.q || '';
    const folderIdsArr = body.folderIds || [];
    const category = body.category || '';
    const ngayPhatHanh = body.ngayPhatHanh || '';
    const noiPhatHanh = body.noiPhatHanh || '';
    
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

    // Lấy đệ quy (thư mục con)
    let isFolderSearch = false;
    if (folderIdsArr.length > 0 && q.trim() === '' && ngayPhatHanh.trim() === '' && noiPhatHanh.trim() === '') {
        queryParamsArgs.push(folderIdsArr);
        queryText += ` AND folder_id = ANY($${queryParamsArgs.length})`;
        isFolderSearch = true;
    }

    // Sắp xếp: Nếu xuất theo thư mục, dùng array_position để giữ đúng thứ tự cha/con từ frontend truyền xuống
    if (isFolderSearch) {
        queryText += ` ORDER BY array_position($${queryParamsArgs.length}, folder_id), ngay_phat_hanh DESC, file_name ASC`;
    } else {
        queryText += ' ORDER BY folder_name ASC, folder_id ASC, ngay_phat_hanh DESC, file_name ASC';
    }

    const { rows } = await client.query(queryText, queryParamsArgs);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh_Sach_Van_Ban');

    // Thiết lập Header (đã bỏ cột Link, thêm Loại văn bản)
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 10 },
      { header: 'Loại văn bản', key: 'loai_vb', width: 20 },
      { header: 'Số văn bản', key: 'so_vb', width: 25 },
      { header: 'Ngày phát hành', key: 'ngay_phat_hanh', width: 15 },
      { header: 'Nơi phát hành', key: 'noi_phat_hanh', width: 25 },
      { header: 'Trích yếu nội dung', key: 'trich_yeu', width: 60 },
      { header: 'fileName', key: 'file_name', width: 60 },
      { header: 'fileID', key: 'file_id', width: 40 },
      { header: 'folderName', key: 'folder_name', width: 20 },
      { header: 'FolderID', key: 'folder_id', width: 40 },
    ];

    // Style Header của bảng: In đậm, Times New Roman size 14
    worksheet.getRow(1).font = { name: 'Times New Roman', size: 14, bold: true };

    let currentFolderId = null;
    let stt = 1;

    rows.forEach((row) => {
      // Nếu chuyển sang một thư mục mới, chèn một dòng Tiêu đề thư mục
      if (row.folder_id !== currentFolderId) {
        currentFolderId = row.folder_id;
        
        // Thêm dòng trống để cách điệu
        if (worksheet.rowCount > 1) {
          worksheet.addRow({});
        }

        // Dòng header của Group Thư mục
        const folderRow = worksheet.addRow({
          stt: row.folder_name || 'Không xác định',
        });
        
        // Trộn ô (Merge cells) từ cột 1 đến 10 (vì có tổng cộng 10 cột)
        worksheet.mergeCells(folderRow.number, 1, folderRow.number, 10);
        
        // In đậm, nền vàng, chữ Times New Roman 14
        folderRow.font = { name: 'Times New Roman', size: 14, bold: true };
        folderRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFCC' } // Màu vàng theo yêu cầu
        };
      }

      // Thêm dòng dữ liệu file
      const dataRow = worksheet.addRow({
        stt: stt++,
        loai_vb: row.loai_vb || '',
        so_vb: row.so_vb || '',
        ngay_phat_hanh: row.ngay_phat_hanh || '',
        noi_phat_hanh: row.noi_phat_hanh || '',
        trich_yeu: row.trich_yeu || '',
        file_name: row.web_view_link ? { text: row.file_name || '', hyperlink: row.web_view_link } : (row.file_name || ''),
        file_id: row.file_id || '',
        folder_name: row.folder_name || '',
        folder_id: row.folder_id || ''
      });

      // Style cho dòng dữ liệu
      dataRow.font = { name: 'Times New Roman', size: 14 };

      // Định dạng fileName có gạch chân, màu xanh nếu có link
      if (row.web_view_link) {
        dataRow.getCell('file_name').font = { name: 'Times New Roman', size: 14, color: { argb: 'FF0563C1' }, underline: true };
      }
    });

    // Tạo buffer và trả về response
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
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
