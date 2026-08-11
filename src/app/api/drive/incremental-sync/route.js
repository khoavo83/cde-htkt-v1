import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const configPath = path.join(process.cwd(), 'config.json');

// Hàm parse tên file để bóc tách ngày, số VB, trích yếu, nơi phát hành
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

  const guiMatch = cleanName.match(/(.+)_gui_(.+)/i) || cleanName.match(/(.+)_gui\s+(.+)/i);
  if (guiMatch) {
    const receiverPart = guiMatch[2].replace(/^[-_]+|[-_]+$/g, "").trim();
    parsedNoiGui = receiverPart.split(/[-_]/)[0].trim();
    parsedTrichYeu = receiverPart;
  }

  return { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui };
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    let targetProjectId = projectId;
    let targetFolderId = null;
    
    if (projectId && config.projects) {
      const project = config.projects.find(p => p.id === projectId);
      if (project) {
        targetFolderId = project.id;
      }
    }
    
    if (!targetFolderId) {
      targetFolderId = config.google_drive.main_folder_id;
      targetProjectId = targetFolderId;
    }

    if (!targetFolderId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    let dbConfigured = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]");
    if (!dbConfigured) {
       return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    let resultLog = { added: 0, updated: 0, deleted: 0 };

    try {
      // Đảm bảo bảng có các cột cần thiết (bao gồm target_drive_id)
      await client.query(`
        ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS target_drive_id VARCHAR(255) DEFAULT NULL;
        CREATE TABLE IF NOT EXISTS drive_sync_state (
            project_id VARCHAR(255) PRIMARY KEY,
            page_token TEXT NOT NULL,
            last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(err => console.log('Bảng đã cập nhật', err.message));

      // 1. Lấy danh sách thư mục hợp lệ của project này để lọc file
      const foldersRes = await client.query(`SELECT folder_id, folder_name FROM drive_folders_flat WHERE project_id = $1`, [targetProjectId]);
      const folderMap = {};
      for (const row of foldersRes.rows) {
        folderMap[row.folder_id] = row.folder_name;
      }

      // 2. Lấy pageToken hiện tại
      let pageToken = null;
      const stateRes = await client.query(`SELECT page_token FROM drive_sync_state WHERE project_id = $1`, [targetProjectId]);
      
      const drive = await getDriveClient();

      if (stateRes.rows.length > 0) {
        pageToken = stateRes.rows[0].page_token;
      } else {
        // Lần đầu tiên: Lấy StartPageToken
        const startPageRes = await drive.changes.getStartPageToken();
        pageToken = startPageRes.data.startPageToken;
      }

      let newStartPageToken = pageToken;
      let hasMore = true;

      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.shortcut' // Thêm shortcut
      ];

      // 3. Quét các thay đổi
      while (hasMore && pageToken) {
        const res = await drive.changes.list({
          pageToken,
          fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, webViewLink, modifiedTime, shortcutDetails, parents, trashed))',
        });

        const changes = res.data.changes || [];
        for (const change of changes) {
          if (change.removed || (change.file && change.file.trashed)) {
            // Xóa file
            await client.query(`DELETE FROM drive_file_metadata WHERE file_id = $1`, [change.fileId]);
            resultLog.deleted++;
          } else if (change.file) {
            const file = change.file;
            if (!allowedMimes.includes(file.mimeType)) continue;

            // Kiểm tra xem file có thuộc thư mục của dự án này không
            let parentFolderId = null;
            if (file.parents) {
              parentFolderId = file.parents.find(id => folderMap[id]);
            }

            if (!parentFolderId) {
              // Nếu file bị di chuyển ra ngoài thư mục dự án, coi như bị xóa khỏi dự án này
              await client.query(`DELETE FROM drive_file_metadata WHERE file_id = $1`, [file.id]);
              continue;
            }

            const folderName = folderMap[parentFolderId];
            const { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui } = parseFileName(file.name, folderName);
            const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
            
            let targetDriveId = null;
            if (file.mimeType === 'application/vnd.google-apps.shortcut' && file.shortcutDetails) {
              targetDriveId = file.shortcutDetails.targetId;
            }

            // Insert or Update
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

        if (res.data.newStartPageToken) {
          newStartPageToken = res.data.newStartPageToken;
          hasMore = false;
        } else {
          pageToken = res.data.nextPageToken;
        }
      }

      // 4. Lưu lại newStartPageToken
      await client.query(`
        INSERT INTO drive_sync_state (project_id, page_token, last_synced_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (project_id) DO UPDATE SET
          page_token = EXCLUDED.page_token,
          last_synced_at = CURRENT_TIMESTAMP
      `, [targetProjectId, newStartPageToken]);

      console.log(`[incremental-sync] Hoàn tất: Cập nhật ${resultLog.updated} file, Xoá ${resultLog.deleted} file.`);

    } finally {
      client.release();
      await pool.end();
    }

    return NextResponse.json({
      success: true,
      resultLog,
      message: `Đồng bộ incremental hoàn tất: Cập nhật ${resultLog.updated}, Xóa ${resultLog.deleted}`
    });

  } catch (error) {
    console.error('[incremental-sync] Lỗi nghiêm trọng:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
