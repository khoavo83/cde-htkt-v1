import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const env = fs.readFileSync('.env.local', 'utf-8');
const dbUrl = env.match(/DATABASE_URL="?([^"\n]+)"?/)[1];

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const fileId = '81b9bc5d-f264-4634-aa02-7d9cb768a3de';
    
    // Simulate the PUT body
    const metadata = {
      loai_vb: 'Công văn',
      so_vb: '750/BQLĐSĐT-HTKT',
      ngay_phat_hanh: '27/03/2026',
      noi_phat_hanh: 'Ban Quản lý Đường sắt Đô thị',
      noi_gui: '',
      trich_yeu: 'Ve thu tuc tam ung kinh phi thuc hien DA',
      is_outgoing: false
    };

    const parseDateToYYYYMMDD = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (parts) {
        const day = parts[1].padStart(2, '0');
        const month = parts[2].padStart(2, '0');
        return `${parts[3]}-${month}-${day}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      return null;
    };

    console.log('Parsed date:', parseDateToYYYYMMDD(metadata.ngay_phat_hanh));
    
    const updateResult = await pool.query(`
        UPDATE documents 
        SET 
          document_type = $1,
          document_number = $2,
          document_date = $3,
          issuing_agency = $4,
          receiving_agency = $5,
          summary = $6,
          is_outgoing = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id::text = $8 OR drive_file_id = $8
        RETURNING *;
      `, [
        metadata.loai_vb,
        metadata.so_vb,
        parseDateToYYYYMMDD(metadata.ngay_phat_hanh),
        metadata.noi_phat_hanh,
        metadata.noi_gui,
        metadata.trich_yeu,
        metadata.is_outgoing,
        fileId
      ]);
      
    console.log('Update result rows:', updateResult.rows.length);
    console.log('Updated summary:', updateResult.rows.length > 0 ? updateResult.rows[0].summary : 'none');
  } catch(e) {
    console.error('Update error:', e.message);
  } finally {
    pool.end();
  }
}

run();
