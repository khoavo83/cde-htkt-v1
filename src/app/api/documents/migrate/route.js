import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;

// ─── Hàm nhận dạng loại văn bản từ tên file ──────────────────────────────
function detectDocType(fileName) {
  const n = fileName;
  if (n.includes('QĐ') || n.toLowerCase().includes('quyết định')) return 'Quyết định';
  if (n.includes('TB') || n.toLowerCase().includes('thông báo')) return 'Thông báo';
  if (n.includes('TTr') || n.includes('PTr') || n.toLowerCase().includes('tờ trình')) return 'Tờ trình';
  if (n.includes('GM') || n.toLowerCase().includes('giấy mời')) return 'Giấy mời';
  if (n.includes('BC') || n.toLowerCase().includes('báo cáo')) return 'Báo cáo';
  if (n.toLowerCase().includes('hợp đồng')) return 'Hợp đồng';
  if (n.toLowerCase().includes('lịch họp')) return 'Lịch họp';
  if (n.includes('CV') || n.toLowerCase().includes('công văn')) return 'Công văn';
  return 'Công văn';
}

// ─── Hàm suy luận category từ tên thư mục ────────────────────────────────
function detectCategory(folderName) {
  if (!folderName) return 'Khác';
  if (folderName.includes('Quy hoạch')) return 'Quy hoạch';
  if (folderName.includes('Sở NNMT') || folderName.includes('Sở NN')) return 'Sở ngành';
  if (folderName.includes('ĐKĐĐ') || folderName.includes('Địa chính') || folderName.includes('Đất đai')) return 'Đất đai';
  if (folderName.includes('bom mìn') || folderName.includes('RPBM') ||
      folderName.includes('Lũng Lô') || folderName.includes('Thành An') || folderName.includes('Lữ đoàn')) return 'Rà phá bom mìn';
  if (folderName.includes('Phú Mỹ Hưng') || folderName.includes('PMH')) return 'Phú Mỹ Hưng';
  if (folderName.includes('Bồi thường') || folderName.includes('GPMB') || folderName.includes('BT-CG')) return 'Bồi thường';
  if (folderName.includes('HTKT') || folderName.includes('cây xanh') || folderName.includes('chiếu sáng')) return 'Hạ tầng kỹ thuật';
  return 'Khác';
}

// ─── Parse ngày từ chuỗi DD/MM/YYYY → YYYY-MM-DD ─────────────────────────
function parseDate(dateStr) {
  if (!dateStr) return null;
  // Format: DD/MM/YYYY
  const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // Format: YYYY-MM-DD (đã đúng)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

// ─── Trích xuất nơi phát hành từ tên file ────────────────────────────────
// Pattern chuẩn: YYYY-MM-DD_SoVB_COQUAN_trichyeu.pdf
// Hoặc: SoVB COQUAN NGAY trichyeu.pdf
function parseIssuingAgency(fileName, existingAgency) {
  // Nếu đã có dữ liệu từ AI (không phải null) thì dùng luôn
  if (existingAgency && existingAgency.trim() !== '') return existingAgency;

  const base = fileName.replace(/\.[^/.]+$/, ''); // bỏ đuôi file

  // Pattern chuẩn: 2026-01-12_68_BQLĐSĐT-KHKT_trích yếu
  // Phần sau số VB (token thứ 3) là mã cơ quan
  const stdMatch = base.match(/^\d{4}-\d{2}-\d{2}_[\d]+_([A-ZĐƯĂÂÔƠ\-\/\.]+)_/i);
  if (stdMatch) {
    const code = stdMatch[1].toUpperCase();
    return mapAgencyCode(code);
  }

  // Pattern: số năm cơ quan (vd: "1949 BQLDSDT HTKT 01072026")
  const looseMatch = base.match(/\b(BQLDSDT|BQLĐSĐT|SNNMT|SNN|UBND|VPDK|PMH|SXD|STC|KBNN|BCT|VSP)\b/i);
  if (looseMatch) {
    return mapAgencyCode(looseMatch[1].toUpperCase());
  }

  return null; // Trả về null → giữ nguyên giá trị cũ hoặc 'Đang cập nhật'
}

// Bảng ánh xạ mã viết tắt → tên đầy đủ
function mapAgencyCode(code) {
  const map = {
    'BQLDSDT': 'Ban Quản lý Đường sắt Đô thị TP.HCM',
    'BQLĐSĐT': 'Ban Quản lý Đường sắt Đô thị TP.HCM',
    'KHKT': 'Ban Quản lý Đường sắt Đô thị TP.HCM',
    'TCKT': 'Ban Quản lý Đường sắt Đô thị TP.HCM',
    'HTKT': 'Ban Quản lý Đường sắt Đô thị TP.HCM',
    'SNNMT': 'Sở Nông nghiệp & PTNT TP.HCM',
    'SNN': 'Sở Nông nghiệp & PTNT TP.HCM',
    'SXD': 'Sở Xây dựng TP.HCM',
    'STC': 'Sở Tài chính TP.HCM',
    'UBND': 'UBND TP.HCM',
    'VPDK': 'Văn phòng Đăng ký Đất đai TP.HCM',
    'PMH': 'Công ty TNHH Phát triển Phú Mỹ Hưng',
    'KBNN': 'Kho bạc Nhà nước',
    'BCT': 'Bộ Công Thương',
    'VSP': 'Vinspeed',
  };
  // Tìm theo prefix
  for (const [k, v] of Object.entries(map)) {
    if (code.startsWith(k)) return v;
  }
  return code; // Trả lại mã gốc nếu không map được
}

// ─── Lấy trạng thái migrate ───────────────────────────────────────────────
async function getStatus(client) {
  const [totalRes, migratedRes, pendingRes] = await Promise.all([
    client.query('SELECT COUNT(*) FROM drive_file_metadata'),
    client.query('SELECT COUNT(*) FROM documents WHERE drive_file_id IS NOT NULL'),
    client.query(`
      SELECT COUNT(*) FROM drive_file_metadata m
      WHERE NOT EXISTS (
        SELECT 1 FROM documents d WHERE d.drive_file_id = m.file_id
      )
    `)
  ]);
  return {
    total: parseInt(totalRes.rows[0].count),
    migrated: parseInt(migratedRes.rows[0].count),
    pending: parseInt(pendingRes.rows[0].count),
  };
}

// ─── Handler chính ────────────────────────────────────────────────────────
export async function POST(request) {
  if (!pool) {
    return NextResponse.json({ error: 'DATABASE_URL chưa được cấu hình' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { action, fileId } = body;

  const client = await pool.connect();
  try {
    // ── ACTION: status ────────────────────────────────────────────────────
    if (action === 'status') {
      const status = await getStatus(client);
      return NextResponse.json({ success: true, ...status });
    }

    // ── ACTION: preview ───────────────────────────────────────────────────
    if (action === 'preview') {
      const res = await client.query(`
        SELECT 
          m.file_id, m.file_name, m.folder_name, m.trich_yeu,
          m.ngay_phat_hanh, m.so_vb, m.noi_phat_hanh, m.web_view_link,
          m.manually_edited,
          CASE WHEN d.drive_file_id IS NOT NULL THEN true ELSE false END as already_migrated
        FROM drive_file_metadata m
        LEFT JOIN documents d ON d.drive_file_id = m.file_id
        ORDER BY m.folder_name, m.file_name
        LIMIT 200
      `);
      const status = await getStatus(client);
      return NextResponse.json({ success: true, ...status, items: res.rows });
    }

    // ─── Hàm upsert 1 văn bản (dùng chung cho migrate_one và migrate_all) ─
    const upsertOne = async (row) => {
      const docDate = parseDate(row.ngay_phat_hanh);
      const category = detectCategory(row.folder_name);
      const docType = row.loai_vb || detectDocType(row.file_name);
      const filePath = `drive://${row.file_id}`;

      // Trích xuất nơi phát hành: ưu tiên DB, fallback sang parse tên file
      const issuingAgency = parseIssuingAgency(row.file_name, row.noi_phat_hanh) || 'Đang cập nhật';

      // Cải thiện summary: nếu trich_yeu = tên file thô → dùng tên file bỏ đuôi và bỏ ngày/số VB
      let summary = row.trich_yeu;
      const isRawFilename = summary && (
        summary === row.file_name ||
        summary.endsWith('.pdf') || summary.endsWith('.docx') || summary.endsWith('.doc')
      );
      if (isRawFilename) {
        // Cố trích xuất phần trích yếu từ tên file (phần sau _ cuối cùng của mã cơ quan)
        const base = row.file_name.replace(/\.[^/.]+$/, '');
        // Pattern: YYYY-MM-DD_SoVB_COQUAN_trichyeu → lấy phần trichyeu
        const extracted = base.match(/^\d{4}-\d{2}-\d{2}_[\d]+_[A-Z\-\/\.Đ]+_(.+)$/i);
        if (extracted) {
          summary = extracted[1].replace(/_/g, ' ').trim();
        } else {
          // Fallback: bỏ đuôi file và dùng tên file gốc (bỏ đuôi signed/pdf)
          summary = base
            .replace(/\.signed$|\.signed\.pdf$/i, '')
            .replace(/_/g, ' ')
            .trim();
        }
      }

      // Với bản đã migrate và manually_edited = true:
      // → chỉ cập nhật các trường AI điền (không chạm trường user sửa)
      await client.query(`
        INSERT INTO documents (
          file_name, name, file_path, drive_file_id, drive_web_link,
          folder, category, document_type, document_date,
          issuing_agency, receiving_agency, summary,
          document_number, file_size, updated_at
        )
        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (drive_file_id) DO UPDATE SET
          -- Luôn cập nhật tên file và link (dữ liệu gốc từ Drive)
          file_name = EXCLUDED.file_name,
          name = EXCLUDED.name,
          drive_web_link = EXCLUDED.drive_web_link,
          -- Cập nhật thông tin AI chỉ khi CHƯA được sửa tay
          -- (manually_edited trong drive_file_metadata → bảo vệ qua cờ)
          document_date = CASE
            WHEN $14 = true THEN documents.document_date
            ELSE COALESCE(EXCLUDED.document_date, documents.document_date)
          END,
          summary = CASE
            WHEN $14 = true THEN documents.summary
            ELSE COALESCE(EXCLUDED.summary, documents.summary)
          END,
          issuing_agency = CASE
            WHEN $14 = true THEN documents.issuing_agency
            ELSE COALESCE(EXCLUDED.issuing_agency, documents.issuing_agency)
          END,
          document_number = CASE
            WHEN $14 = true THEN documents.document_number
            ELSE COALESCE(EXCLUDED.document_number, documents.document_number)
          END,
          -- Luôn cập nhật category và folder (metadata cấu trúc)
          folder = EXCLUDED.folder,
          category = EXCLUDED.category,
          document_type = EXCLUDED.document_type,
          updated_at = NOW()
      `, [
        row.file_name,                // $1: file_name + name
        filePath,                     // $2: file_path (virtual)
        row.file_id,                  // $3: drive_file_id
        row.web_view_link,            // $4: drive_web_link
        row.folder_name,              // $5: folder
        category,                     // $6: category
        docType,                      // $7: document_type
        docDate,                      // $8: document_date
        issuingAgency,                // $9: issuing_agency (đã parse từ tên file)
        null,                         // $10: receiving_agency
        summary,                      // $11: summary (đã cải thiện)
        row.so_vb,                    // $12: document_number
        null,                         // $13: file_size
        row.manually_edited || false, // $14: cờ bảo vệ bản sửa tay
      ]);
    };

    // ── ACTION: migrate_one ───────────────────────────────────────────────
    if (action === 'migrate_one') {
      if (!fileId) return NextResponse.json({ error: 'Thiếu fileId' }, { status: 400 });

      const res = await client.query(
        'SELECT * FROM drive_file_metadata WHERE file_id = $1',
        [fileId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 404 });
      }

      await upsertOne(res.rows[0]);
      const status = await getStatus(client);
      return NextResponse.json({
        success: true,
        message: `Đã migrate văn bản: ${res.rows[0].file_name}`,
        ...status
      });
    }

    // ── ACTION: migrate_all ───────────────────────────────────────────────
    if (action === 'migrate_all') {
      // Lấy tất cả từ drive_file_metadata
      const res = await client.query(`
        SELECT * FROM drive_file_metadata
        ORDER BY folder_name, file_name
      `);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Migrate từng văn bản — lỗi 1 cái không dừng cái khác
      for (const row of res.rows) {
        try {
          await upsertOne(row);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push({ file: row.file_name, error: err.message });
          console.error(`Lỗi migrate: ${row.file_name}`, err.message);
        }
      }

      const status = await getStatus(client);
      return NextResponse.json({
        success: true,
        message: `Migrate hoàn tất: ${successCount} thành công, ${errorCount} lỗi`,
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // Trả về tối đa 10 lỗi đầu
        ...status
      });
    }

    return NextResponse.json({ error: 'action không hợp lệ. Dùng: status | preview | migrate_one | migrate_all' }, { status: 400 });

  } catch (error) {
    console.error('Lỗi migrate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// ── GET: Lấy trạng thái nhanh ────────────────────────────────────────────
export async function GET() {
  if (!pool) return NextResponse.json({ error: 'DATABASE_URL chưa cấu hình' }, { status: 503 });
  
  let client;
  try {
    client = await pool.connect();
    const status = await getStatus(client);
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    console.error('Lỗi kết nối DB trong GET migrate status:', err.message);
    return NextResponse.json({ success: false, error: 'Không thể kết nối đến Database. Vui lòng kiểm tra lại DATABASE_URL (có thể do lỗi IPv6).' }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
