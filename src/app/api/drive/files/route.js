import { NextResponse } from 'next/server';
import { fetchFolderFiles, renameFile } from '@/lib/drive';
import { Pool } from 'pg';

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
    const allowedFiles = driveFiles.filter(f => f.mimeType === 'application/pdf' || f.mimeType.includes('word'));

    if (allowedFiles.length === 0 || !pool) {
      return NextResponse.json({ success: true, data: driveFiles });
    }

    client = await pool.connect();
    await ensureTable(client);

    const fileIds = allowedFiles.map(f => f.id);
    
    // Bulk fetch existing metadata
    const { rows: existingMetadata } = await client.query(
      `SELECT * FROM drive_file_metadata WHERE file_id = ANY($1)`,
      [fileIds]
    );

    const metadataMap = new Map();
    existingMetadata.forEach(row => metadataMap.set(row.file_id, row));

    const updatedFiles = [];
    
    // So sánh và tính toán trạng thái
    for (const file of driveFiles) {
      if (file.mimeType !== 'application/pdf' && !file.mimeType.includes('word')) {
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

      if (file.mimeType === 'application/pdf') {
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
        // Đối với file Word hoặc file khác: không bóc tách, giữ nguyên toàn bộ tên file làm Trích yếu
        parsedTrichYeu = fileNameStr;
      }

      if (!existing) {
        await client.query(`
          INSERT INTO drive_file_metadata (file_id, file_name, web_view_link, modified_time, ngay_phat_hanh, so_vb, trich_yeu, folder_id, folder_name, is_outgoing, parent_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [file.id, file.name, file.webViewLink, driveModifiedTime, parsedNgay, parsedSoVb, parsedTrichYeu, folderId, folderName, false, null]);
      } else if (!existing.manually_edited) {
        const isModifiedOnDrive = (!dbModifiedTime || driveModifiedTime.getTime() > dbModifiedTime.getTime());
        const hasNewExtractedData = (parsedNgay && existing.ngay_phat_hanh !== parsedNgay) ||
                                    (parsedSoVb && existing.so_vb !== parsedSoVb) ||
                                    (parsedTrichYeu && existing.trich_yeu !== parsedTrichYeu);
        const isNameChanged = (file.name !== existing.file_name);

        if (isModifiedOnDrive || hasNewExtractedData || existing.folder_id !== folderId || isNameChanged) {
          let finalNgay, finalSoVb, finalTrichYeu;
          if (file.mimeType === 'application/pdf') {
            finalNgay = parsedNgay || existing.ngay_phat_hanh;
            finalSoVb = parsedSoVb || existing.so_vb;
            finalTrichYeu = parsedTrichYeu || existing.trich_yeu;
          } else {
            // Force clear for non-PDFs
            finalNgay = null;
            finalSoVb = null;
            finalTrichYeu = parsedTrichYeu; // this is the full file name
          }

          await client.query(`
            UPDATE drive_file_metadata 
            SET modified_time = $1, file_name = $2, web_view_link = $3, ngay_phat_hanh = $5, so_vb = $6, trich_yeu = $7, folder_id = $8, folder_name = $9
            WHERE file_id = $4
          `, [driveModifiedTime, file.name, file.webViewLink, file.id, finalNgay, finalSoVb, finalTrichYeu, folderId, folderName]);
          
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
                    if (childInDriveFiles) {
                       childInDriveFiles.name = newChildName;
                    }
                  } catch (e) {
                    console.error('Lỗi tự động đổi tên file đính kèm:', e);
                  }
                }
             }
          }

          // Update in-memory existing object so mergedFile gets the latest
          existing.ngay_phat_hanh = finalNgay;
          existing.so_vb = finalSoVb;
          existing.trich_yeu = finalTrichYeu;
          existing.file_name = file.name;
        }
      }

      const mergedFile = {
        ...file,
        needs_ai: needsAi,
        loai_vb: existing?.loai_vb || '',
        so_vb: existing?.so_vb || parsedSoVb || '',
        ngay_phat_hanh: existing?.ngay_phat_hanh || parsedNgay || '',
        noi_phat_hanh: existing?.noi_phat_hanh || '',
        trich_yeu: existing?.trich_yeu || parsedTrichYeu || '',
        noi_gui: existing?.noi_gui || '',
        manually_edited: existing?.manually_edited || false,
        custom_order_index: existing?.custom_order_index || 0,
        is_outgoing: existing?.is_outgoing || false,
        parent_id: existing?.parent_id || null,
        // Trả về mảng draftFiles (legacy) để frontend không ghi đè bằng [] khi lưu
        draftFiles: existing?.draft_files || [],
      };

      updatedFiles.push(mergedFile);
    }

    return NextResponse.json({ success: true, data: updatedFiles });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
