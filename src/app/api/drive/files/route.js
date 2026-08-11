import { NextResponse } from 'next/server';
import { fetchFolderFiles, renameFile } from '@/lib/drive';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS drive_file_metadata (
      file_id       VARCHAR(255) PRIMARY KEY,
      file_name     TEXT,
      loai_vb       TEXT,
      so_vb         TEXT,
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
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT FALSE;
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS modified_time TIMESTAMP;
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS custom_order_index INTEGER DEFAULT 0;
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS folder_id VARCHAR(255);
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS folder_name TEXT;
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS is_outgoing BOOLEAN DEFAULT FALSE;
    ALTER TABLE drive_file_metadata ADD COLUMN IF NOT EXISTS parent_id VARCHAR(255) DEFAULT NULL;
  `).catch(() => {});
}

export async function GET(request) {
  let client = null;
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const folderName = searchParams.get('folderName') || '';

    if (!folderId) {
      return NextResponse.json({ error: 'Thiếu folderId' }, { status: 400 });
    }

    const driveFiles = await fetchFolderFiles(folderId);
    const allowedFiles = driveFiles.filter(f => f.mimeType === 'application/pdf' || f.mimeType.includes('word') || f.mimeType === 'application/vnd.google-apps.shortcut');

    if (allowedFiles.length === 0 || !pool) {
      return NextResponse.json({ success: true, data: driveFiles });
    }

    client = await pool.connect();
    await ensureTable(client);

    const fileIds = allowedFiles.map(f => f.id);
    
    // Bulk fetch existing metadata with LEFT JOIN for shortcuts
    const { rows: existingMetadata } = await client.query(
      `SELECT d1.*, 
              d2.loai_vb as target_loai_vb,
              d2.so_vb as target_so_vb,
              d2.ngay_phat_hanh as target_ngay_phat_hanh,
              d2.noi_phat_hanh as target_noi_phat_hanh,
              d2.trich_yeu as target_trich_yeu,
              d2.noi_gui as target_noi_gui
       FROM drive_file_metadata d1 
       LEFT JOIN drive_file_metadata d2 ON d1.target_drive_id = d2.file_id 
       WHERE d1.file_id = ANY($1)`,
      [fileIds]
    );

    const metadataMap = new Map();
    existingMetadata.forEach(row => metadataMap.set(row.file_id, row));

    const updatedFiles = [];
    
    // So sánh và tính toán trạng thái
    for (const file of driveFiles) {
      const isAllowed = file.mimeType === 'application/pdf' || file.mimeType.includes('word') || file.mimeType === 'application/vnd.google-apps.shortcut';
      if (!isAllowed) {
        file.needs_ai = false;
        updatedFiles.push(file);
        continue;
      }

      const existing = metadataMap.get(file.id);
      const driveModifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
      
      let needsAi = false; // Luôn false theo yêu cầu mới, không tự động quét AI
      let dbModifiedTime = existing && existing.modified_time ? new Date(existing.modified_time) : null;

      // Logic parse tên file
      const fileNameStr = file.name || '';
      let parsedNgay = null;
      let parsedSoVb = null;
      let parsedTrichYeu = null;
      let targetDriveId = null;

      if (file.mimeType === 'application/vnd.google-apps.shortcut' && file.shortcutDetails) {
        targetDriveId = file.shortcutDetails.targetId;
      }

      if (file.mimeType === 'application/pdf' || file.mimeType === 'application/vnd.google-apps.shortcut') {
        const nameWithoutExt = fileNameStr.replace(/\.pdf$/i, '');
        const parts = nameWithoutExt.split('_');
        
        if (parts.length >= 3 && /^(\d{4})-(\d{2})-(\d{2})$/.test(parts[0])) {
          const dateMatch = parts[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
          parsedNgay = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
          parsedTrichYeu = parts[parts.length - 1];
          parsedSoVb = parts.slice(1, parts.length - 1).join('/');
        } else {
          parsedTrichYeu = fileNameStr;
        }
      } else {
        parsedTrichYeu = fileNameStr;
      }

      if (!existing) {
        // File mới: chỉ insert với dữ liệu parse từ tên file (dữ liệu thô ban đầu)
        await client.query(`
          INSERT INTO drive_file_metadata (file_id, file_name, web_view_link, modified_time, ngay_phat_hanh, so_vb, trich_yeu, folder_id, folder_name, is_outgoing, parent_id, target_drive_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [file.id, file.name, file.webViewLink, driveModifiedTime, parsedNgay, parsedSoVb, parsedTrichYeu, folderId, folderName, false, null, targetDriveId]);
      } else {
        // File đã có trong Supabase: KHÔNG BAO GIỜ ghi đè so_vb, trich_yeu, ngay_phat_hanh, noi_phat_hanh
        // Chỉ cập nhật thông tin kỹ thuật: tên file, link Drive, thư mục, thời gian sửa
        const isNameChanged = (file.name !== existing.file_name);
        const isTargetChanged = targetDriveId && existing.target_drive_id !== targetDriveId;

        if (isNameChanged || existing.folder_id !== folderId || existing.web_view_link !== file.webViewLink || isTargetChanged) {
          await client.query(`
            UPDATE drive_file_metadata 
            SET modified_time = $1, file_name = $2, web_view_link = $3, folder_id = $4, folder_name = $5, target_drive_id = $6
            WHERE file_id = $7
          `, [driveModifiedTime, file.name, file.webViewLink, folderId, folderName, targetDriveId, file.id]);

          // Tự động đổi tên các file đính kèm (Word) nếu PDF đổi tên
          if (isNameChanged && file.mimeType === 'application/pdf') {
            const resChildren = await client.query('SELECT file_id, file_name FROM drive_file_metadata WHERE parent_id = $1', [file.id]);
            for (const child of resChildren.rows) {
              const childExt = child.file_name.includes('.') ? child.file_name.split('.').pop() : 'doc';
              const pdfBase = file.name.replace(/\.pdf$/i, '');
              const newChildName = `${pdfBase}.${childExt}`;
              if (newChildName !== child.file_name) {
                try {
                  await renameFile(child.file_id, newChildName);
                  await client.query('UPDATE drive_file_metadata SET file_name = $1 WHERE file_id = $2', [newChildName, child.file_id]);
                  const childInDriveFiles = driveFiles.find(f => f.id === child.file_id);
                  if (childInDriveFiles) childInDriveFiles.name = newChildName;
                } catch (e) {
                  console.error('Lỗi tự động đổi tên file đính kèm:', e);
                }
              }
            }
          }

          existing.file_name = file.name;
        }
      }

      // Nguồn sự thật duy nhất = Supabase (existing)
      // Nếu là shortcut, ưu tiên lấy metadata từ target_ (d2)
      const mergedFile = {
        ...file,
        needs_ai: needsAi,
        loai_vb: existing?.target_loai_vb || existing?.loai_vb || '',
        so_vb: existing?.target_so_vb || existing?.so_vb || parsedSoVb || '',
        ngay_phat_hanh: existing?.target_ngay_phat_hanh || existing?.ngay_phat_hanh || parsedNgay || '',
        noi_phat_hanh: existing?.target_noi_phat_hanh || existing?.noi_phat_hanh || '',
        trich_yeu: existing?.target_trich_yeu || existing?.trich_yeu || parsedTrichYeu || '',
        noi_gui: existing?.target_noi_gui || existing?.noi_gui || '',
        manually_edited: existing?.manually_edited || false,
        custom_order_index: existing?.custom_order_index || 0,
        is_outgoing: existing?.is_outgoing || false,
        parent_id: existing?.parent_id || null,
        draftFiles: existing?.draft_files || [],
      };

      updatedFiles.push(mergedFile);
    }

    // ── Xử lý Phiếu trình ───────────────────────────────────────────────────
    // Phiếu trình (loai_vb='Phiếu trình' + parent_id!=null) được gắn vào Công văn đi cha
    // và ẩn khỏi danh sách hiển thị chính
    const phieuTrinhMap = new Map(); // parent_id => phieu_trinh object
    const finalFiles = [];

    for (const f of updatedFiles) {
      if (f.loai_vb === 'Phiếu trình' && f.parent_id) {
        phieuTrinhMap.set(f.parent_id, {
          id: f.id,
          name: f.name || f.file_name,
          webViewLink: f.webViewLink || f.web_view_link || '',
        });
        // Không push vào finalFiles — ẩn khỏi bảng chính
      } else {
        finalFiles.push(f);
      }
    }

    // Gắn phieu_trinh vào Công văn đi cha
    for (const f of finalFiles) {
      if (phieuTrinhMap.has(f.id)) {
        f.phieu_trinh = phieuTrinhMap.get(f.id);
      }
    }

    return NextResponse.json({ success: true, data: finalFiles });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

