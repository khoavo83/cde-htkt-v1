import { NextResponse } from 'next/server';
import { fetchFolderFiles } from '@/lib/drive';
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
  `).catch(() => {});
}

export async function GET(request) {
  let client = null;
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Thiếu folderId' }, { status: 400 });
    }

    const driveFiles = await fetchFolderFiles(folderId);
    const pdfFiles = driveFiles.filter(f => f.mimeType === 'application/pdf');

    if (pdfFiles.length === 0 || !pool) {
      return NextResponse.json({ success: true, data: driveFiles });
    }

    client = await pool.connect();
    await ensureTable(client);

    const fileIds = pdfFiles.map(f => f.id);
    
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
      if (file.mimeType !== 'application/pdf') {
        file.needs_ai = false;
        updatedFiles.push(file);
        continue;
      }

      const existing = metadataMap.get(file.id);
      const driveModifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
      
      let needsAi = false; // Luôn false theo yêu cầu mới, không tự động quét AI
      let dbModifiedTime = existing && existing.modified_time ? new Date(existing.modified_time) : null;

      if (!existing) {
        await client.query(`
          INSERT INTO drive_file_metadata (file_id, file_name, web_view_link, modified_time)
          VALUES ($1, $2, $3, $4)
        `, [file.id, file.name, file.webViewLink, driveModifiedTime]);
      } else if (!existing.manually_edited && (!dbModifiedTime || driveModifiedTime.getTime() > dbModifiedTime.getTime())) {
        await client.query(`
          UPDATE drive_file_metadata 
          SET modified_time = $1, file_name = $2, web_view_link = $3
          WHERE file_id = $4
        `, [driveModifiedTime, file.name, file.webViewLink, file.id]);
      }

      const mergedFile = {
        ...file,
        needs_ai: needsAi,
        loai_vb: existing?.loai_vb || '',
        so_vb: existing?.so_vb || '',
        ngay_phat_hanh: existing?.ngay_phat_hanh || '',
        noi_phat_hanh: existing?.noi_phat_hanh || '',
        trich_yeu: existing?.trich_yeu || '',
        noi_gui: existing?.noi_gui || '',
        manually_edited: existing?.manually_edited || false,
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
