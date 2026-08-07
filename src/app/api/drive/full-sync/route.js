import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';
import { Pool } from 'pg';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;

// Hàm parse tên file PDF -> bóc tách ngày, số VB, trích yếu, nơi phát hành
function parseFileName(fileName, folderName = "") {
  let parsedNgay = null;
  let parsedSoVb = null;
  let parsedTrichYeu = fileName;
  let parsedNoiPhatHanh = "";
  let parsedNoiGui = "";

  const lowerName = fileName.toLowerCase();
  let cleanName = fileName.replace(/\.[^/.]+$/, ""); // bỏ đuôi file

  if (lowerName.endsWith('.pdf')) {
    const parts = cleanName.split('_');
    if (parts.length >= 3 && /^(\d{4})-(\d{2})-(\d{2})$/.test(parts[0])) {
      const dateMatch = parts[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
      parsedNgay = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
      parsedTrichYeu = parts[parts.length - 1];
      parsedSoVb = parts.slice(1, parts.length - 1).join('/');
    } else {
      parsedTrichYeu = cleanName;
    }
  }

  // Phân tích nơi phát hành dựa trên tên file và tên folder
  const folderIssuerMap = {
    'Sở NNMT': 'Sở Nông nghiệp & PTNT',
    'Văn phòng ĐKĐĐ TP': 'Văn phòng Đăng ký Đất đai',
    'Lữ đoàn 239 - Binh chủng Công binh': 'Lữ đoàn 239',
    'Tổng Công ty Xây dựng Lũng Lô': 'Tổng Công ty Lũng Lô',
    'Tổng Công ty Thành An - Binh đoàn 11': 'Tổng Công ty Thành An',
    'Trung tâm xử lý bom mìn': 'Trung tâm Xử lý Bom mìn',
    'Lữ đoàn 299 -Quân đoàn 12': 'Lữ đoàn 299',
    'Công ty TNHH Phát triển Phú Mỹ Hưng': 'Công ty TNHH Phát triển Phú Mỹ Hưng',
    'Xí nghiệp TDNS': 'Xí nghiệp Truyền dẫn Nước sạch',
  };

  if (folderIssuerMap[folderName]) {
    parsedNoiPhatHanh = folderIssuerMap[folderName];
  } else {
    const upperName = cleanName.toUpperCase();
    if (upperName.includes("VPĐK") || upperName.includes("VĂN PHÒNG ĐĂNG KÝ")) {
      parsedNoiPhatHanh = "Văn phòng Đăng ký Đất đai";
    } else if (upperName.includes("BQLĐSĐT")) {
      parsedNoiPhatHanh = "Ban Quản lý Đường sắt Đô thị";
    } else if (upperName.includes("SNN") || upperName.includes("SỞ NN")) {
      parsedNoiPhatHanh = "Sở Nông nghiệp & PTNT";
    } else if (upperName.includes("PMH") || upperName.includes("PHÚ MỸ HƯNG")) {
      parsedNoiPhatHanh = "Công ty TNHH Phát triển Phú Mỹ Hưng";
    } else if (upperName.includes("LŨNG LÔ") || upperName.includes("LUNGLO")) {
      parsedNoiPhatHanh = "Tổng Công ty Lũng Lô";
    } else if (upperName.includes("THÀNH AN") || upperName.includes("THANHAN")) {
      parsedNoiPhatHanh = "Tổng Công ty Thành An";
    } else if (upperName.includes("LỮ ĐOÀN 239") || upperName.includes("LĐ239")) {
      parsedNoiPhatHanh = "Lữ đoàn 239";
    } else if (upperName.includes("LỮ ĐOÀN 299") || upperName.includes("LĐ299")) {
      parsedNoiPhatHanh = "Lữ đoàn 299";
    } else if (upperName.includes("UBND")) {
      if (upperName.includes("Q7") || upperName.includes("QUẬN 7")) {
        parsedNoiPhatHanh = "UBND Quận 7";
      } else {
        parsedNoiPhatHanh = "UBND TP.HCM";
      }
    }
  }

  // Nhận diện nơi gửi qua từ khóa "_gui_"
  const guiMatch = cleanName.match(/(.+)_gui_(.+)/i) || cleanName.match(/(.+)_gui\s+(.+)/i);
  if (guiMatch) {
    const receiverPart = guiMatch[2].replace(/^[-_]+|[-_]+$/g, "").trim();
    parsedNoiGui = receiverPart.split(/[-_]/)[0].trim();
    parsedTrichYeu = receiverPart;
  }

  return { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui };
}

// Lấy tất cả file PDF/Word trong một thư mục từ Google Drive
async function fetchFilesInFolder(drive, folderId, folderName) {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  let filesList = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime)',
      pageToken: pageToken,
    });

    if (res.data.files) {
      for (const file of res.data.files) {
        if (allowedMimes.includes(file.mimeType)) {
          filesList.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            webViewLink: file.webViewLink,
            modifiedTime: file.modifiedTime,
            folderId,
            folderName,
          });
        }
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return filesList;
}

export async function POST(request) {
  if (!pool) {
    return NextResponse.json({ error: 'Chưa cấu hình DATABASE_URL' }, { status: 500 });
  }

  let projectId = null;
  try {
    const body = await request.json().catch(() => ({}));
    projectId = body.projectId || null;
  } catch (_) {}

  const client = await pool.connect();

  try {
    // 1. Lấy tất cả thư mục từ drive_folders_flat trong Supabase
    let foldersQuery;
    if (projectId) {
      foldersQuery = await client.query(
        'SELECT folder_id, folder_name FROM drive_folders_flat WHERE project_id = $1',
        [projectId]
      );
    } else {
      foldersQuery = await client.query(
        'SELECT folder_id, folder_name FROM drive_folders_flat'
      );
    }

    const folders = foldersQuery.rows;
    if (folders.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Chưa có dữ liệu thư mục. Vui lòng đồng bộ thư mục trước.'
      }, { status: 400 });
    }

    // 2. Kết nối Google Drive
    const drive = await getDriveClient();

    // 3. Đảm bảo bảng drive_file_metadata tồn tại và có đủ cột
    await client.query(`
      CREATE TABLE IF NOT EXISTS drive_file_metadata (
        file_id        VARCHAR(255) PRIMARY KEY,
        file_name      TEXT,
        loai_vb        TEXT,
        so_vb          TEXT,
        ngay_phat_hanh TEXT,
        noi_phat_hanh  TEXT,
        trich_yeu      TEXT,
        noi_gui        TEXT,
        web_view_link  TEXT,
        manually_edited BOOLEAN DEFAULT FALSE,
        extracted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS modified_time TIMESTAMP;
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS folder_id VARCHAR(255);
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS folder_name TEXT;
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS parent_id VARCHAR(255) DEFAULT NULL;
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS is_outgoing BOOLEAN DEFAULT FALSE;
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS custom_order_index INTEGER DEFAULT 0;
    `).catch(() => {});

    // 4. Quét file song song theo batch (5 thư mục / lần để tránh vượt quota Drive API)
    let totalIndexed = 0;
    const totalFolders = folders.length;
    const BATCH_SIZE = 5;

    for (let i = 0; i < folders.length; i += BATCH_SIZE) {
      const batch = folders.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(folder => fetchFilesInFolder(drive, folder.folder_id, folder.folder_name))
      );

      for (const result of batchResults) {
        if (result.status !== 'fulfilled') {
          console.error('Lỗi khi lấy file từ một thư mục:', result.reason);
          continue;
        }
        const files = result.value;

        for (const file of files) {
          const { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui } = parseFileName(file.name, file.folderName);
          const driveModifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date();

          // Upsert: bảo toàn dữ liệu đã chỉnh tay (manually_edited = true)
          await client.query(`
            INSERT INTO drive_file_metadata
              (file_id, file_name, web_view_link, modified_time, ngay_phat_hanh, so_vb, trich_yeu,
               noi_phat_hanh, noi_gui, folder_id, folder_name, is_outgoing, parent_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, null)
            ON CONFLICT (file_id) DO UPDATE SET
              file_name      = EXCLUDED.file_name,
              web_view_link  = EXCLUDED.web_view_link,
              modified_time  = EXCLUDED.modified_time,
              ngay_phat_hanh = CASE WHEN drive_file_metadata.manually_edited THEN drive_file_metadata.ngay_phat_hanh ELSE EXCLUDED.ngay_phat_hanh END,
              so_vb          = CASE WHEN drive_file_metadata.manually_edited THEN drive_file_metadata.so_vb ELSE EXCLUDED.so_vb END,
              trich_yeu      = CASE WHEN drive_file_metadata.manually_edited THEN drive_file_metadata.trich_yeu ELSE EXCLUDED.trich_yeu END,
              noi_phat_hanh  = CASE WHEN drive_file_metadata.manually_edited THEN drive_file_metadata.noi_phat_hanh ELSE EXCLUDED.noi_phat_hanh END,
              noi_gui        = CASE WHEN drive_file_metadata.manually_edited THEN drive_file_metadata.noi_gui ELSE EXCLUDED.noi_gui END,
              folder_id      = EXCLUDED.folder_id,
              folder_name    = EXCLUDED.folder_name
          `, [
            file.id, file.name, file.webViewLink, driveModifiedTime,
            parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui,
            file.folderId, file.folderName
          ]);

          totalIndexed++;
        }
      }
    }

    // 5. Đếm tổng cuối cùng theo project
    const countRes = await client.query(
      projectId
        ? `SELECT COUNT(DISTINCT m.file_id) as count
           FROM drive_file_metadata m
           JOIN drive_folders_flat f ON m.folder_id = f.folder_id
           WHERE f.project_id = $1`
        : `SELECT COUNT(DISTINCT file_id) as count FROM drive_file_metadata`,
      projectId ? [projectId] : []
    );
    const totalPdfCount = parseInt(countRes.rows[0].count, 10);

    console.log(`[full-sync] Hoàn tất: ${totalIndexed} file từ ${totalFolders} thư mục. DB count: ${totalPdfCount}`);

    return NextResponse.json({
      success: true,
      totalFolders,
      totalIndexed,
      totalPdfCount,
      message: `Đã đồng bộ ${totalIndexed} file từ ${totalFolders} thư mục. Tổng trong DB: ${totalPdfCount}.`
    });

  } catch (error) {
    console.error('[full-sync] Lỗi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
