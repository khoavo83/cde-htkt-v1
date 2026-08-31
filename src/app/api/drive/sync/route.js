import { NextResponse } from 'next/server';
import { fetchDriveFoldersFlat, getDriveClient } from '@/lib/drive';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Hàm parse tên file để bóc tách ngày, số VB, trích yếu, nơi phát hành (dùng chung với full-sync)
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
      const m = parts[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
      parsedNgay = `${m[3]}/${m[2]}/${m[1]}`;
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

// Lấy tất cả file PDF/Word trong một thư mục từ Drive
async function fetchFilesInFolder(drive, folderId, folderName) {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.google-apps.shortcut',
  ];
  let filesList = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, shortcutDetails)',
      pageToken,
    });
    if (res.data.files) {
      for (const file of res.data.files) {
        if (allowedMimes.includes(file.mimeType)) {
          filesList.push({ ...file, folderId, folderName });
        }
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return filesList;
}

export async function POST(request) {
  let pool = null;
  let client = null;
  try {
    const { searchParams } = new URL(request.url);
    const requestedProjectId = searchParams.get('projectId');

    const dbConfigured = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]");
    if (!dbConfigured) {
      return NextResponse.json({ error: 'Chưa cấu hình DATABASE_URL' }, { status: 500 });
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    client = await pool.connect();

    // Lấy danh sách các dự án cần đồng bộ
    let projectsToSync = [];
    if (requestedProjectId && requestedProjectId !== 'all') {
      const projRes = await client.query('SELECT id, name, basic_info FROM projects WHERE id = $1', [requestedProjectId]);
      if (projRes.rows.length > 0) {
        projectsToSync = projRes.rows;
      } else {
        // Fallback dùng trực tiếp ID thư mục nếu không tìm thấy record
        projectsToSync = [{ id: requestedProjectId, name: requestedProjectId }];
      }
    } else {
      const projRes = await client.query('SELECT id, name, basic_info FROM projects ORDER BY created_at ASC');
      projectsToSync = projRes.rows;
    }

    if (projectsToSync.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dự án nào để đồng bộ.' }, { status: 400 });
    }

    const drive = await getDriveClient();

    // Đảm bảo các bảng cần thiết tồn tại
    await client.query(`
      CREATE TABLE IF NOT EXISTS drive_folders_flat (
        folder_id VARCHAR(255) PRIMARY KEY,
        folder_name TEXT,
        parent_id VARCHAR(255),
        project_id VARCHAR(255),
        drive_modified_time TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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
      ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS target_drive_id VARCHAR(255) DEFAULT NULL;
    `).catch(() => {});

    let totalProjectsSynced = 0;
    let totalFoldersSynced = 0;
    let totalFilesSynced = 0;

    for (const project of projectsToSync) {
      const targetFolderId = project.id;
      const targetProjectId = project.id;
      const projLabel = project.basic_info?.shortName || project.name || targetFolderId;

      console.log(`[sync] Bắt đầu đồng bộ Google Drive cho dự án: ${projLabel} (${targetFolderId})`);

      try {
        // 1. Quét cây thư mục phẳng từ Google Drive
        const flatFolders = await fetchDriveFoldersFlat(targetFolderId);
        console.log(`[sync] Dự án ${projLabel}: Đã quét ${flatFolders.length} thư mục`);

        for (const folder of flatFolders) {
          await client.query(`
            INSERT INTO drive_folders_flat (folder_id, folder_name, parent_id, project_id, drive_modified_time, updated_at) 
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (folder_id) DO UPDATE SET 
              folder_name = EXCLUDED.folder_name,
              parent_id = EXCLUDED.parent_id,
              project_id = EXCLUDED.project_id,
              drive_modified_time = EXCLUDED.drive_modified_time,
              updated_at = CURRENT_TIMESTAMP;
          `, [folder.id, folder.name, folder.parent_id, targetProjectId, folder.modified_time ? new Date(folder.modified_time) : null]);
        }

        // Xoá các thư mục không còn tồn tại trên Drive của dự án này
        if (flatFolders.length > 0) {
          const folderIds = flatFolders.map(f => f.id);
          await client.query(`DELETE FROM drive_folders_flat WHERE project_id = $1 AND folder_id != ALL($2)`, [targetProjectId, folderIds]);
        }

        // Lưu cache cục bộ nếu có
        try {
          const cachePath = path.join(process.cwd(), 'data', `drive_cache_${targetProjectId}.json`);
          const dataDir = path.dirname(cachePath);
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(cachePath, JSON.stringify(flatFolders, null, 2), 'utf8');
        } catch (cacheErr) {
          console.warn('[sync] Bỏ qua ghi cache tệp tin:', cacheErr.message);
        }

        // 2. Đồng bộ các file tài liệu trong các thư mục của dự án
        let allFileIds = [];
        const BATCH_SIZE = 5;
        for (let i = 0; i < flatFolders.length; i += BATCH_SIZE) {
          const batch = flatFolders.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map(f => fetchFilesInFolder(drive, f.id, f.name))
          );

          for (const result of batchResults) {
            if (result.status !== 'fulfilled') continue;
            for (const file of result.value) {
              allFileIds.push(file.id);
              const { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui } = parseFileName(file.name, file.folderName);
              const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date();

              let targetDriveId = null;
              if (file.mimeType === 'application/vnd.google-apps.shortcut' && file.shortcutDetails) {
                targetDriveId = file.shortcutDetails.targetId;
              }

              await client.query(`
                INSERT INTO drive_file_metadata
                  (file_id, file_name, web_view_link, modified_time, ngay_phat_hanh, so_vb, trich_yeu, noi_phat_hanh, noi_gui, folder_id, folder_name, is_outgoing, parent_id, target_drive_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, null, $12)
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
                  folder_name    = EXCLUDED.folder_name,
                  target_drive_id = EXCLUDED.target_drive_id
              `, [file.id, file.name, file.webViewLink, modifiedTime, parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui, file.folderId, file.folderName, targetDriveId]);
              totalFilesSynced++;
            }
          }
        }

        // Xoá các file không còn trên Drive của dự án
        const projectFoldersRes = await client.query(`SELECT folder_id FROM drive_folders_flat WHERE project_id = $1`, [targetProjectId]);
        const projectFolderIds = projectFoldersRes.rows.map(r => r.folder_id);
        if (projectFolderIds.length > 0) {
          if (allFileIds.length > 0) {
            await client.query(`DELETE FROM drive_file_metadata WHERE folder_id = ANY($1) AND file_id != ALL($2)`, [projectFolderIds, allFileIds]);
          } else {
            await client.query(`DELETE FROM drive_file_metadata WHERE folder_id = ANY($1)`, [projectFolderIds]);
          }
        }

        totalProjectsSynced++;
        totalFoldersSynced += flatFolders.length;
      } catch (projErr) {
        console.error(`[sync] Lỗi đồng bộ dự án ${projLabel}:`, projErr);
      }
    }

    // Đếm tổng số văn bản sau đồng bộ
    const countRes = await client.query(`SELECT COUNT(DISTINCT file_id) as count FROM drive_file_metadata`);
    const totalPdfCount = parseInt(countRes.rows[0].count, 10);

    return NextResponse.json({
      success: true,
      projectCount: totalProjectsSynced,
      folderCount: totalFoldersSynced,
      fileCount: totalFilesSynced,
      totalPdfCount,
      message: `Đồng bộ Google Drive hoàn tất thành công: ${totalProjectsSynced} dự án, ${totalFoldersSynced} thư mục, ${totalFilesSynced} lượt tệp tin. Tổng văn bản hiện có: ${totalPdfCount}.`
    });

  } catch (error) {
    console.error('[sync] Lỗi nghiêm trọng:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}
