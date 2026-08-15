import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/drive';
import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseDocDetailsImproved } from '@/utils/regexParser';
import path from 'path';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
      draft_files    JSONB DEFAULT '[]'::jsonb,
      extracted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Migration: thêm cột manually_edited nếu chưa có
  await client.query(`
    ALTER TABLE drive_file_metadata
    ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT FALSE;
  `).catch(() => {});
  await client.query(`
    ALTER TABLE drive_file_metadata
    ADD COLUMN IF NOT EXISTS draft_files JSONB DEFAULT '[]'::jsonb;
  `).catch(() => {});
  await client.query(`
    ALTER TABLE drive_file_metadata
    ADD COLUMN IF NOT EXISTS nguoi_xu_ly TEXT;
  `).catch(() => {});
}

async function getCached(client, fileId) {
  const res = await client.query(
    'SELECT * FROM drive_file_metadata WHERE file_id = $1',
    [fileId]
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}

async function saveToCache(client, fileId, fileName, metadata, webViewLink, manuallyEdited = false) {
  const draftFilesJson = JSON.stringify(metadata.draftFiles || []);
  const isOutgoing = metadata.is_outgoing || false;
  await client.query(`
    INSERT INTO drive_file_metadata
      (file_id, file_name, loai_vb, so_vb, ngay_phat_hanh, noi_phat_hanh, trich_yeu, noi_gui, web_view_link, manually_edited, draft_files, is_outgoing, nguoi_xu_ly, extracted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP)
    ON CONFLICT (file_id) DO UPDATE SET
      file_name      = EXCLUDED.file_name,
      loai_vb        = EXCLUDED.loai_vb,
      so_vb          = EXCLUDED.so_vb,
      ngay_phat_hanh = EXCLUDED.ngay_phat_hanh,
      noi_phat_hanh  = EXCLUDED.noi_phat_hanh,
      trich_yeu      = EXCLUDED.trich_yeu,
      noi_gui        = EXCLUDED.noi_gui,
      web_view_link  = EXCLUDED.web_view_link,
      manually_edited = EXCLUDED.manually_edited,
      draft_files    = EXCLUDED.draft_files,
      is_outgoing    = EXCLUDED.is_outgoing,
      nguoi_xu_ly    = EXCLUDED.nguoi_xu_ly,
      extracted_at   = CURRENT_TIMESTAMP;
  `, [fileId, fileName,
      metadata.loai_vb, metadata.so_vb, metadata.ngay_phat_hanh,
      metadata.noi_phat_hanh, metadata.trich_yeu, metadata.noi_gui,
      webViewLink, manuallyEdited, draftFilesJson, isOutgoing, metadata.nguoi_xu_ly]);
}

// Download nội dung PDF dưới dạng Base64
async function downloadPdfBase64(drive, fileId) {
  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(res.data);
    return buffer.toString('base64');
  } catch (err) {
    console.error('Lỗi tải PDF:', err.message);
    return null;
  }
}

// =========================================================
// PROMPT TEMPLATE CẢI TIẾN (Native PDF)
// =========================================================
function buildPrompt(fileName) {
  return `Bạn là một Chuyên viên Văn thư lưu trữ cấp cao của Nhà nước Việt Nam.
Hãy đọc toàn bộ tài liệu PDF đính kèm (hoặc dựa vào tên file: ${fileName}) và trích xuất thông tin.

## CẤU TRÚC ĐIỂN HÌNH CỦA VĂN BẢN HÀNH CHÍNH VN

Văn bản hành chính VN thường có layout như sau:
\`\`\`
[CỘT TRÁI]                          [CỘT PHẢI]
TÊN BỘ/CƠ QUAN CẤP TRÊN            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
TÊN CƠ QUAN BAN HÀNH               Độc lập - Tự do - Hạnh phúc
-------                             --------
Số: 1234/UBND-KT                    [Địa danh], ngày dd tháng mm năm yyyy
V/v: Về việc XYZ...
\`\`\`
Tiếp theo là loại văn bản (in hoa): CÔNG VĂN / QUYẾT ĐỊNH / TỜ TRÌNH / BÁO CÁO...
Sau đó: "Kính gửi:" hoặc "Nơi nhận:" (là nơi gửi văn bản)

## QUY TẮC TRÍCH XUẤT

1. **loai_vb**: Tìm từ khóa in hoa. Ưu tiên theo thứ tự:
   - "QUYẾT ĐỊNH" → "Quyết định"
   - "CÔNG VĂN" → "Công văn"
   - "TỜ TRÌNH" → "Tờ trình"
   - "BÁO CÁO" → "Báo cáo"
   - "THÔNG BÁO" → "Thông báo"
   - "BIÊN BẢN" → "Biên bản"
   - "HỢP ĐỒNG" → "Hợp đồng"
   - Nếu không rõ → "Văn bản khác"

2. **so_vb**: Tìm dòng bắt đầu bằng "Số:" hoặc "Số/KH:" — lấy phần sau dấu hai chấm.
   Ví dụ: "Số: 1329-3/BQLĐSĐT-HTKT" → "1329-3/BQLĐSĐT-HTKT"

3. **ngay_phat_hanh**: Tìm dòng có "ngày ... tháng ... năm" hoặc "Ngày ... /... /...".
   Chuẩn hóa sang định dạng DD/MM/YYYY.
   Ví dụ: "ngày 15 tháng 05 năm 2026" → "15/05/2026"

4. **noi_phat_hanh**: Tên CƠ QUAN BAN HÀNH (không phải cơ quan cấp trên).
   Thường ở cột trái, dòng 2 hoặc 3 từ trên, trước "Số:".
   Ví dụ: "BAN QUẢN LÝ ĐƯỜNG SẮT ĐÔ THỊ" hoặc "UBND THÀNH PHỐ HỒ CHÍ MINH"

5. **trich_yeu**: Lấy nội dung sau "V/v:" hoặc "Về việc:" hoặc tiêu đề chính văn bản.
   Giữ nguyên, tối đa 120 ký tự.

6. **noi_gui**: Lấy nội dung sau "Kính gửi:" (đầu văn bản).
   Nếu có nhiều nơi nhận, nối bằng "; ".

## VÍ DỤ MẪU

**VÍ DỤ 1 - Công văn:**
Input text:
\`\`\`
BAN QUẢN LÝ ĐƯỜNG SẮT ĐÔ THỊ
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Số: 1329-3/BQLĐSĐT-HTKT          Độc lập - Tự do - Hạnh phúc
V/v: Đề nghị thẩm tra HSNVDT      TP. Hồ Chí Minh, ngày 15 tháng 05 năm 2025
CÔNG VĂN
Kính gửi: Hội đồng Thẩm định Nhà nước
\`\`\`
Output JSON:
\`\`\`json
{
  "loai_vb": "Công văn",
  "so_vb": "1329-3/BQLĐSĐT-HTKT",
  "ngay_phat_hanh": "15/05/2025",
  "noi_phat_hanh": "Ban Quản lý Đường sắt Đô thị",
  "trich_yeu": "Đề nghị thẩm tra hồ sơ nhà đầu tư",
  "noi_gui": "Hội đồng Thẩm định Nhà nước"
}
\`\`\`

**VÍ DỤ 2 - Quyết định:**
Input text:
\`\`\`
ỦY BAN NHÂN DÂN                   CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
THÀNH PHỐ HỒ CHÍ MINH             Độc lập - Tự do - Hạnh phúc
Số: 2495/QĐ-UBND                  TP. HCM, ngày 04 tháng 11 năm 2025
QUYẾT ĐỊNH
Về việc ban hành danh mục đơn giá áp dụng theo NQ 66.4
\`\`\`
Output JSON:
\`\`\`json
{
  "loai_vb": "Quyết định",
  "so_vb": "2495/QĐ-UBND",
  "ngay_phat_hanh": "04/11/2025",
  "noi_phat_hanh": "UBND Thành phố Hồ Chí Minh",
  "trich_yeu": "Ban hành danh mục đơn giá áp dụng theo Nghị quyết 66.4",
  "noi_gui": ""
}
\`\`\`

---

## YÊU CẦU

Phân tích văn bản đính kèm và trả về JSON với 6 trường trên.
Chú ý đọc kỹ các bảng biểu, chữ ký, con dấu đỏ nếu có.
Nếu không tìm thấy thông tin → để chuỗi rỗng "".
CHỈ trả về JSON thuần túy, không markdown, không giải thích.`;
}

// =========================================================
// GET: Trích xuất metadata (có cache)
// =========================================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId      = searchParams.get('fileId');
  const fileName    = searchParams.get('fileName') || '';
  const mimeType    = searchParams.get('mimeType') || '';
  const webViewLink = searchParams.get('webViewLink') || '';
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!fileId) {
    return NextResponse.json({ error: 'Thiếu fileId' }, { status: 400 });
  }

  // Chỉ xử lý PDF
  if (mimeType !== 'application/pdf') {
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: 'Chỉ xử lý file PDF',
    });
  }

  const useSupabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('[YOUR_PASSWORD]');
  let client = null;

  try {
    if (useSupabase) {
      client = await pool.connect();
      await ensureTable(client);

      if (!forceRefresh) {
        const cached = await getCached(client, fileId);
        if (cached) {
          cached.draftFiles = cached.draft_files || [];
          return NextResponse.json({ success: true, data: cached, fromCache: true });
        }
      }
    }

    // Download nội dung PDF dạng Base64
    const drive = await getDriveClient();
    const pdfBase64 = await downloadPdfBase64(drive, fileId);

    // Gọi Gemini
    let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          apiKey = config.gemini_api_key || config.google_ai_api_key;
        }
      } catch (e) {}
    }
    
    if (!apiKey) throw new Error('Thiếu GEMINI_API_KEY trong môi trường hoặc config.json');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { temperature: 0.1 }, // Giảm sáng tạo, tăng nhất quán
    });

    const prompt = buildPrompt(fileName);
    let requestPayload = prompt;

    if (pdfBase64) {
      requestPayload = [
        prompt,
        { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } }
      ];
    }

    const result = await model.generateContent(requestPayload);
    const raw = result.response.text().trim();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini không trả về JSON hợp lệ');

    const metadata = JSON.parse(jsonMatch[0]);

    if (useSupabase && client) {
      await saveToCache(client, fileId, fileName, metadata, webViewLink, false);
    }

    return NextResponse.json({
      success: true,
      data: { file_id: fileId, file_name: fileName, web_view_link: webViewLink, ...metadata },
      fromCache: false,
    });

  } catch (error) {
    console.error('Lỗi extract:', error.message);
    
    // Nếu lỗi gọi AI (thường là rate limit), dùng fallback thay vì bỏ trống
    const fallback = parseDocDetailsImproved(fileName, '');
    const fallbackMetadata = {
      loai_vb: fallback.loai_vb || 'Khác',
      so_vb: fallback.documentNumber || '',
      ngay_phat_hanh: fallback.issuedDate !== 'Chưa xác định' ? fallback.issuedDate : '',
      noi_phat_hanh: fallback.issuer || '',
      trich_yeu: fallback.notes || fileName,
      noi_gui: ''
    };

    // VẪN LƯU vào cache để khỏi bắt AI đọc lại liên tục khi đang rate limit
    if (useSupabase && client) {
      await saveToCache(client, fileId, fileName, fallbackMetadata, webViewLink, false);
    }

    return NextResponse.json({
      success: true,
      data: {
        file_id: fileId, file_name: fileName, web_view_link: webViewLink,
        ...fallbackMetadata
      },
      error: error.message,
      fromCache: false,
    });
  } finally {
    if (client) client.release();
  }
}

// =========================================================
// PUT: Lưu chỉnh sửa thủ công từ người dùng
// =========================================================
export async function PUT(request) {
  const useSupabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('[YOUR_PASSWORD]');
  if (!useSupabase) {
    return NextResponse.json({ error: 'Chưa cấu hình Supabase' }, { status: 500 });
  }

  let client = null;
  try {
    const body = await request.json();
    const { fileId, fileName, webViewLink, ...metadata } = body;

    if (!fileId) return NextResponse.json({ error: 'Thiếu fileId' }, { status: 400 });

    client = await pool.connect();
    await ensureTable(client);

    // Map các trường từ frontend sang đúng key của database
    const dbMetadata = {
      loai_vb: metadata.category || metadata.loai_vb,
      so_vb: metadata.documentNumber || metadata.so_vb,
      ngay_phat_hanh: metadata.issuedDate || metadata.ngay_phat_hanh,
      noi_phat_hanh: metadata.issuer || metadata.noi_phat_hanh,
      trich_yeu: metadata.notes || metadata.trich_yeu,
      noi_gui: metadata.receiver || metadata.noi_gui,
      is_outgoing: metadata.is_outgoing,
      draftFiles: metadata.draftFiles,
      nguoi_xu_ly: metadata.assignedStaff || metadata.nguoi_xu_ly
    };

    // Lưu vào bảng drive_file_metadata (dùng catch lỡ thiếu cột is_outgoing không làm hỏng app)
    try {
      await saveToCache(client, fileId, fileName, dbMetadata, webViewLink, true);
    } catch (err) {
      console.warn("Lỗi lưu drive_file_metadata (có thể do thiếu cột):", err.message);
    }

    // Helper function để parse date sang YYYY-MM-DD cho Postgres DATE column
    const parseDateToYYYYMMDD = (dateStr) => {
      if (!dateStr) return null;
      // Trùng DD/MM/YYYY hoặc DD-MM-YYYY
      const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (parts) {
        const day = parts[1].padStart(2, '0');
        const month = parts[2].padStart(2, '0');
        return `${parts[3]}-${month}-${day}`;
      }
      // Trùng YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      
      return null; // Trả về null nếu không đúng format để tránh crash DB
    };

    // Quan trọng: Cập nhật luôn vào bảng documents để giao diện hiển thị đúng khi load lại
    try {
      await client.query(`
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
      `, [
        dbMetadata.loai_vb,
        dbMetadata.so_vb,
        parseDateToYYYYMMDD(dbMetadata.ngay_phat_hanh),
        dbMetadata.noi_phat_hanh,
        dbMetadata.noi_gui,
        dbMetadata.trich_yeu,
        dbMetadata.is_outgoing,
        fileId
      ]);
    } catch (err) {
      console.error("Lỗi cập nhật bảng documents:", err.message);
    }

    return NextResponse.json({ success: true, message: 'Đã lưu chỉnh sửa' });
  } catch (error) {
    console.error('Lỗi PUT extract:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
