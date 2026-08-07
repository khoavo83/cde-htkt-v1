import { NextResponse } from 'next/server';
import { fetchDriveFoldersFlat, getDriveClient } from '@/lib/drive';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Using config.json in the project root
const configPath = path.join(process.cwd(), 'config.json');

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
  ];
  let filesList = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime)',
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
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    let targetFolderId = null;
    let targetProjectId = projectId;
    
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

    const cachePath = path.join(process.cwd(), 'data', `drive_cache_${targetProjectId}.json`);
    const dataDir = path.dirname(cachePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // ── BƯỚC 1: Đồng bộ cấu trúc thư mục ──
    console.log('[sync] Bắt đầu đồng bộ thư mục:', targetFolderId);
    const flatFolders = await fetchDriveFoldersFlat(targetFolderId);
    
    let pool = null;
    let dbConfigured = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]");

    if (dbConfigured) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      const client = await pool.connect();
      try {
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
        
        console.log(`[sync] Đã lưu ${flatFolders.length} thư mục vào Supabase`);
      } catch (dbError) {
        console.error('[sync] Lỗi lưu thư mục vào Supabase:', dbError);
      } finally {
        client.release();
      }
    }
    
    fs.writeFileSync(cachePath, JSON.stringify(flatFolders, null, 2), 'utf8');
    console.log('[sync] Đã lưu cache thư mục');

    // ── BƯỚC 2: Tự động đồng bộ toàn bộ file (full-sync) ──
    let totalIndexed = 0;
    let totalPdfCount = 0;

    if (dbConfigured && pool) {
      console.log('[sync] Bắt đầu full-sync tất cả file...');
      const drive = await getDriveClient();
      const fileClient = await pool.connect();

      try {
        // Đảm bảo bảng tồn tại
        await fileClient.query(`
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
        await fileClient.query(`
          ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS modified_time TIMESTAMP;
          ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS folder_id VARCHAR(255);
          ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS folder_name TEXT;
          ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS parent_id VARCHAR(255) DEFAULT NULL;
          ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS is_outgoing BOOLEAN DEFAULT FALSE;
          ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS custom_order_index INTEGER DEFAULT 0;
        `).catch(() => {});

        // Quét từng thư mục theo batch
        const BATCH_SIZE = 5;
        for (let i = 0; i < flatFolders.length; i += BATCH_SIZE) {
          const batch = flatFolders.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map(f => fetchFilesInFolder(drive, f.id, f.name))
          );

          for (const result of batchResults) {
            if (result.status !== 'fulfilled') {
              console.error('[sync] Lỗi khi lấy file từ thư mục:', result.reason?.message);
              continue;
            }
            for (const file of result.value) {
              const { parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui } = parseFileName(file.name, file.folderName);
              const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
              await fileClient.query(`
                INSERT INTO drive_file_metadata
                  (file_id, file_name, web_view_link, modified_time, ngay_phat_hanh, so_vb, trich_yeu, noi_phat_hanh, noi_gui, folder_id, folder_name, is_outgoing, parent_id)
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
              `, [file.id, file.name, file.webViewLink, modifiedTime, parsedNgay, parsedSoVb, parsedTrichYeu, parsedNoiPhatHanh, parsedNoiGui, file.folderId, file.folderName]);
              totalIndexed++;
            }
          }
        }

        // Đếm tổng file theo project
        const countRes = await fileClient.query(
          `SELECT COUNT(DISTINCT m.file_id) as count
           FROM drive_file_metadata m
           JOIN drive_folders_flat f ON m.folder_id = f.folder_id
           WHERE f.project_id = $1`,
          [targetProjectId]
        );
        totalPdfCount = parseInt(countRes.rows[0].count, 10);
        console.log(`[sync] Full-sync hoàn tất: ${totalIndexed} file, DB count: ${totalPdfCount}`);

      } catch (fileErr) {
        console.error('[sync] Lỗi trong quá trình full-sync file:', fileErr);
      } finally {
        fileClient.release();
        await pool.end();
      }
    }

    return NextResponse.json({
      success: true,
      folderCount: flatFolders.length,
      fileCount: totalIndexed,
      totalPdfCount,
      message: `Đồng bộ hoàn tất: ${flatFolders.length} thư mục, ${totalIndexed} file. Tổng PDF trong DB: ${totalPdfCount}.`
    });

  } catch (error) {
    console.error('[sync] Lỗi nghiêm trọng:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
