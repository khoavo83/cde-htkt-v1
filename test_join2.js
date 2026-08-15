require('dotenv').config({path: '.env.local'});
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function test() {
  try {
    const res = await pool.query(SELECT * FROM (
            SELECT 
              d.id,
              COALESCE(dfm.file_name, d.name, d.file_name) AS name,
              d.file_path AS path,
              COALESCE(d.drive_file_id, dfm.file_id) AS "driveFileId",
              COALESCE(dfm.web_view_link, d.drive_web_link) AS "driveWebLink",
              COALESCE(dfm.folder_name, d.folder) AS folder,
              d.category,
              COALESCE(dfm.loai_vb, d.document_type) AS "documentType",
              COALESCE(dfm.so_vb, d.document_number) AS "documentNumber",
              COALESCE(dfm.ngay_phat_hanh, d.document_date) AS "documentDate",
              COALESCE(dfm.noi_phat_hanh, d.issuing_agency) AS "issuingAgency",
              COALESCE(dfm.noi_gui, d.receiving_agency) AS "receivingAgency",
              COALESCE(dfm.trich_yeu, d.summary) AS summary,
              COALESCE(dfm.is_outgoing, d.is_outgoing) AS "is_outgoing",
              COALESCE(d.size, d.file_size) AS size,
              COALESCE(dfm.modified_time, d.updated_at) AS "updatedAt"
            FROM documents d
            LEFT JOIN (
              SELECT DISTINCT ON (file_name) * FROM drive_file_metadata ORDER BY file_name, extracted_at DESC
            ) dfm ON COALESCE(d.name, d.file_name) = dfm.file_name

            UNION ALL

            SELECT 
              dfm.file_id AS id,
              dfm.file_name AS name,
              NULL AS path,
              dfm.file_id AS "driveFileId",
              dfm.web_view_link AS "driveWebLink",
              dfm.folder_name AS folder,
              'Khác' AS category,
              dfm.loai_vb AS "documentType",
              dfm.so_vb AS "documentNumber",
              dfm.ngay_phat_hanh AS "documentDate",
              dfm.noi_phat_hanh AS "issuingAgency",
              dfm.noi_gui AS "receivingAgency",
              dfm.trich_yeu AS summary,
              dfm.is_outgoing AS "is_outgoing",
              NULL AS size,
              dfm.modified_time AS "updatedAt"
            FROM drive_file_metadata dfm
            WHERE NOT EXISTS (
              SELECT 1 FROM documents d WHERE COALESCE(d.name, d.file_name) = dfm.file_name
            )
          ) combined_docs
          ORDER BY name ASC LIMIT 1);
    console.log(res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
test();
