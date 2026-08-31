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
    const requestedProjectId = searchParams.get('projectId') || 'all';

    const dbConfigured = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]");
    if (!dbConfigured) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình DATABASE_URL' }, { status: 500 });
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    client = await pool.connect();

    // 1. Đảm bảo cấu trúc các bảng Supabase cần thiết
    await client.query(`
      CREATE TABLE IF NOT EXISTS drive_folders_flat (
        folder_id VARCHAR(255) PRIMARY KEY,
        folder_name TEXT,
        parent_id VARCHAR(255),
        project_id VARCHAR(255),
        drive_modified_time TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS drive_sync_state (
        project_id VARCHAR(255) PRIMARY KEY,
        page_token TEXT NOT NULL,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // 2. Lấy mapping toàn bộ folder sang project và folder_name
    const foldersRes = await client.query('SELECT folder_id, folder_name, project_id FROM drive_folders_flat');
    const folderMap = {};
    for (const r of foldersRes.rows) {
      folderMap[r.folder_id] = { name: r.folder_name, projectId: r.project_id };
    }

    const drive = await getDriveClient();
    const syncStateKey = 'global_sync';

    // 3. Lấy pageToken hiện tại
    let pageToken = null;
    const tokenRes = await client.query('SELECT page_token FROM drive_sync_state WHERE project_id = $1', [syncStateKey]);
    if (tokenRes.rows.length > 0 && tokenRes.rows[0].page_token) {
      pageToken = tokenRes.rows[0].page_token;
    }

    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.google-apps.shortcut'
    ];

    let resultLog = { added: 0, updated: 0, deleted: 0 };
    let newStartPageToken = null;

    if (!pageToken) {
      // Lần đầu tiên: lấy startPageToken
      const startRes = await drive.changes.getStartPageToken();
      newStartPageToken = startRes.data.startPageToken;

      await client.query(`
        INSERT INTO drive_sync_state (project_id, page_token, last_synced_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (project_id) DO UPDATE SET
          page_token = EXCLUDED.page_token,
          last_synced_at = CURRENT_TIMESTAMP
      `, [syncStateKey, newStartPageToken]);

      console.log(`[sync] Đã khởi tạo StartPageToken: ${newStartPageToken}`);
    } else {
      // Quét các thay đổi từ Google Drive kể từ token trước
      let currentToken = pageToken;
      let hasMore = true;
      let iteration = 0;

      while (hasMore && currentToken && iteration < 5) {
        iteration++;
        try {
          const changeRes = await drive.changes.list({
            pageToken: currentToken,
            fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, webViewLink, modifiedTime, shortcutDetails, parents, trashed))',
            pageSize: 100
          });

          const changes = changeRes.data.changes || [];
          for (const change of changes) {
            if (change.removed || (change.file && change.file.trashed)) {
              await client.query('DELETE FROM drive_file_metadata WHERE file_id = $1', [change.fileId]);
              resultLog.deleted++;
            } else if (change.file) {
              const file = change.file;
              if (!allowedMimes.includes(file.mimeType)) continue;

              let parentFolderId = null;
              if (file.parents && file.parents.length > 0) {
                parentFolderId = file.parents.find(id => folderMap[id]) || file.parents[0];
              }

              const folderInfo = parentFolderId ? folderMap[parentFolderId] : null;
              const folderName = folderInfo ? folderInfo.name : "Tất cả";
              const { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui } = parseFileName(file.name, folderName);
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
              `, [file.id, file.name, file.webViewLink, modifiedTime, parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui, parentFolderId, folderName, targetDriveId]);

              resultLog.updated++;
            }
          }

          if (changeRes.data.newStartPageToken) {
            newStartPageToken = changeRes.data.newStartPageToken;
            hasMore = false;
          } else {
            currentToken = changeRes.data.nextPageToken;
          }
        } catch (changeErr) {
          console.warn('[sync] Token cũ hoặc lỗi changes.list, reset token:', changeErr.message);
          const startRes = await drive.changes.getStartPageToken();
          newStartPageToken = startRes.data.startPageToken;
          hasMore = false;
        }
      }

      if (newStartPageToken) {
        await client.query(`
          INSERT INTO drive_sync_state (project_id, page_token, last_synced_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (project_id) DO UPDATE SET
            page_token = EXCLUDED.page_token,
            last_synced_at = CURRENT_TIMESTAMP
        `, [syncStateKey, newStartPageToken]);
      }
    }

    // 4. Lấy tổng số văn bản hiện có
    const countRes = await client.query('SELECT COUNT(DISTINCT file_id) as count FROM drive_file_metadata');
    const totalPdfCount = parseInt(countRes.rows[0].count, 10);

    let message = `Đồng bộ Google Drive thành công! Hệ thống hiện có ${totalPdfCount} văn bản.`;
    if (resultLog.updated > 0 || resultLog.deleted > 0) {
      message = `Đã cập nhật ${resultLog.updated} văn bản và gỡ ${resultLog.deleted} văn bản từ Google Drive. Tổng số hiện có: ${totalPdfCount} văn bản.`;
    }

    return NextResponse.json({
      success: true,
      updatedCount: resultLog.updated,
      deletedCount: resultLog.deleted,
      totalPdfCount,
      message
    });

  } catch (error) {
    console.error('[sync] Lỗi xử lý đồng bộ Google Drive:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý đồng bộ Google Drive' }, { status: 500 });
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}
