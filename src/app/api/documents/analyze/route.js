import { Pool } from 'pg';
import { getDriveClient } from '@/lib/drive';

// ─── Cấu hình Rate Limiting Gemini ───────────────────────────────────────
// Gemini 2.0 Flash Free: 15 RPM (requests per minute), 1500 RPD
// Chiến lược: 1 file / 5 giây = 12 files/phút → an toàn dưới 15 RPM
const DELAY_BETWEEN_FILES_MS = 5000;       // 5 giây giữa mỗi file
const DELAY_ON_QUOTA_ERROR_MS = 65000;     // 65 giây khi gặp 429
const MAX_RETRY_PER_FILE = 3;              // Tối đa 3 lần thử lại mỗi file
const MAX_FILE_SIZE_BYTES = 19 * 1024 * 1024; // 19MB giới hạn an toàn Gemini

// Cấu hình models — thử tuần tự, tự chuyển khi quota hết
// Gemini 2.0 Flash: 15 RPM, 200 RPD (free tier)
// Mỗi model có quota riêng trong cùng 1 project
const GEMINI_MODELS = [
  'gemini-2.0-flash',       // Ưu tiên — nhanh, hỗ trợ PDF tốt nhất
  'gemini-2.0-flash-lite',  // Fallback 1 — nhẹ hơn, quota riêng
  'gemini-2.5-flash',       // Fallback 2 — mới hơn
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Khi TẤT CẢ models đều hết quota → chờ rồi thử lại toàn bộ
const DELAY_ALL_QUOTA_EXHAUSTED_MS = 70000; // 70 giây

// ─── Pool DB ─────────────────────────────────────────────────────────────
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;

// ─── Sleep helper ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Prompt thiết kế cho văn bản hành chính Việt Nam ─────────────────────
const EXTRACTION_PROMPT = `Bạn là chuyên gia phân tích văn bản hành chính Việt Nam.
Đọc TOÀN BỘ nội dung tài liệu PDF này và trích xuất CHÍNH XÁC các thông tin.

Trả về DUY NHẤT một JSON hợp lệ, KHÔNG có markdown, KHÔNG có giải thích:
{
  "loai_vb": "Một trong: Quyết định | Công văn | Thông báo | Tờ trình | Báo cáo | Biên bản | Hợp đồng | Giấy mời | Lịch họp | Nghị quyết | Thông tư | Nghị định | Phụ lục | Khác",
  "so_vb": "Số hiệu văn bản đầy đủ. VD: 250/QĐ-BQLĐSĐT hoặc 1949/BQLĐSĐT-HTKT. null nếu không có.",
  "ngay_phat_hanh": "Ngày ký chính thức định dạng DD/MM/YYYY. null nếu không có.",
  "noi_phat_hanh": "Tên đầy đủ cơ quan BAN HÀNH (ở đầu trang, KHÔNG phải nơi nhận). VD: Ban Quản lý Đường sắt Đô thị TP.HCM",
  "noi_nhan": "Tên đơn vị/người nhận. null nếu không ghi rõ.",
  "trich_yeu": "Tóm tắt nội dung chính ngắn gọn, tiếng Việt, tối đa 200 ký tự. Lấy từ mục V/v hoặc tiêu đề.",
  "chu_ky": "Họ tên người ký phía dưới văn bản. null nếu không rõ."
}

Quy tắc bắt buộc:
1. Số hiệu văn bản: thường ở góc trên bên TRÁI trang đầu tiên (Số: ..../...)
2. Ngày: lấy ngày ký chính thức, thường sau chữ "ngày ... tháng ... năm" gần cuối văn bản
3. Nơi phát hành: tên cơ quan IN Ở ĐẦU TRANG bên trái (không phải nơi nhận ở bên phải)
4. Trích yếu: ưu tiên nội dung sau "V/v:" - phần mô tả mục đích văn bản
5. Nếu không đọc được rõ → trả null, KHÔNG được đoán bừa`;

// ─── Gọi Gemini API với retry tự động + fallback model + xoay vòng key ──
async function callGeminiWithRetry(base64Data, mimeType, sendEvent) {
  let lastError = null;

  // Đọc danh sách API keys (hỗ trợ nhiều key cách nhau bằng dấu phẩy)
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
  if (apiKeys.length === 0) throw new Error('Chưa cấu hình GEMINI_API_KEYS trong .env.local');

  // Thử từng tổ hợp [key × model]
  for (const apiKey of apiKeys) {
    for (const model of GEMINI_MODELS) {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const keyLabel = `...${apiKey.slice(-8)}`; // Chỉ hiện 8 ký tự cuối

    for (let attempt = 1; attempt <= MAX_RETRY_PER_FILE; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: EXTRACTION_PROMPT }
              ]
            }],
            generationConfig: {
              temperature: 0.05,
              response_mime_type: 'application/json',
              max_output_tokens: 512,
            }
          }),
          signal: AbortSignal.timeout(60000)
        });

        // Rate Limit 429
        if (response.status === 429) {
          const errBody = await response.json().catch(() => ({}));
          // Lấy retryDelay từ response nếu có
          const retryDelaySec = errBody?.error?.details
            ?.find(d => d.retryDelay)?.retryDelay?.replace('s','');
          const waitMs = retryDelaySec
            ? (parseInt(retryDelaySec) + 5) * 1000   // Dùng retryDelay chính xác từ Google
            : DELAY_ON_QUOTA_ERROR_MS * attempt;      // Fallback: tăng dần

          // Kiểm tra nếu quota ngày hết (limit:0) → chuyển sang model/key khác
          const isQuotaExhausted = JSON.stringify(errBody).includes('limit: 0');
          if (isQuotaExhausted) {
            sendEvent({
              type: 'rate_limit',
              message: `⚠️ [key ${keyLabel} / ${model}] Hết quota ngày, thử tiếp...`,
            });
            break; // Thoát vòng attempt, thử model tiếp theo
          }

          sendEvent({
            type: 'rate_limit',
            message: `⏳ [${model}] Vượt hạn mức (lần ${attempt}/${MAX_RETRY_PER_FILE}). Chờ ${Math.round(waitMs/1000)}s...`,
            waitSeconds: Math.round(waitMs / 1000)
          });
          await sleep(waitMs);
          continue;
        }

        // 404 = model không tồn tại → bỏ qua, thử model tiếp
        if (response.status === 404) {
          sendEvent({ type: 'rate_limit', message: `⚠️ Model ${model} không khả dụng (404), thử model khác...` });
          break; // Thoát vòng attempt, sang model tiếp
        }

        if (!response.ok) {
          const errBody = await response.text().catch(() => 'unknown');
          throw new Error(`Gemini ${model} ${response.status}: ${errBody.slice(0, 200)}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Gemini không trả về nội dung');

        // Làm sạch JSON
        const cleaned = rawText
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        sendEvent({ type: 'model_used', model, key: keyLabel });
        return JSON.parse(cleaned);

      } catch (err) {
        lastError = err;
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          sendEvent({ type: 'retry', message: `⚠️ [${model}] Timeout lần ${attempt}, thử lại...` });
          await sleep(10000);
          continue;
        }
        if (err instanceof SyntaxError) throw new Error(`JSON không hợp lệ từ ${model}`);
        throw err;
      }
    } // end attempt loop
    } // end model loop
  } // end apiKey loop

  throw lastError || new Error(
    `Tất cả ${apiKeys.length} API key và ${GEMINI_MODELS.length} model đều hết quota. ` +
    `Thêm API key mới vào GEMINI_API_KEYS trong .env.local, hoặc chờ quota reset lúc 7h sáng.`
  );
}

// ─── Phân tích 1 file ─────────────────────────────────────────────────────
async function analyzeFile(drive, dbClient, file, sendEvent) {
  sendEvent({ type: 'processing', fileId: file.file_id, fileName: file.file_name, folder: file.folder_name });

  try {
    // Lấy metadata để kiểm tra kích thước
    const metaRes = await drive.files.get({ fileId: file.file_id, fields: 'id,name,size,mimeType' });
    const fileMeta = metaRes.data;
    const fileSize = parseInt(fileMeta.size || '0');

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File quá lớn (${Math.round(fileSize/1024/1024)}MB > 19MB)`);
    }

    // Xác định mime type
    let mimeType = fileMeta.mimeType || 'application/pdf';
    const isGoogleDoc = mimeType === 'application/vnd.google-apps.document';
    if (isGoogleDoc) mimeType = 'application/pdf';
    else if (!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'image/jpeg','image/png'].includes(mimeType)) mimeType = 'application/pdf';

    // Tải file
    let fileBuffer;
    if (isGoogleDoc) {
      const dlRes = await drive.files.export({ fileId: file.file_id, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(dlRes.data);
    } else {
      const dlRes = await drive.files.get({ fileId: file.file_id, alt: 'media' }, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(dlRes.data);
    }

    sendEvent({ type: 'analyzing', fileId: file.file_id, message: '🤖 Gemini đang đọc nội dung...' });

    // Gọi Gemini
    const extracted = await callGeminiWithRetry(fileBuffer.toString('base64'), mimeType, sendEvent);

    // Validate & chuẩn hóa
    const cleanDate = (d) => {
      if (!d) return null;
      const m = String(d).match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      return m ? `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}` : null;
    };
    const clean = (t) => (t && typeof t === 'string' && t.trim() && t.toLowerCase() !== 'null') ? t.trim() : null;
    const validTypes = ['Quyết định','Công văn','Thông báo','Tờ trình','Báo cáo','Biên bản','Hợp đồng','Giấy mời','Lịch họp','Nghị quyết','Thông tư','Nghị định','Phụ lục','Khác'];

    const result = {
      loai_vb: validTypes.includes(extracted.loai_vb) ? extracted.loai_vb : 'Khác',
      so_vb: clean(extracted.so_vb),
      ngay_phat_hanh: cleanDate(extracted.ngay_phat_hanh),
      noi_phat_hanh: clean(extracted.noi_phat_hanh),
      noi_nhan: clean(extracted.noi_nhan),
      trich_yeu: clean(extracted.trich_yeu) || file.trich_yeu,
      chu_ky: clean(extracted.chu_ky),
    };

    // Lưu vào DB
    await dbClient.query(`
      UPDATE drive_file_metadata SET
        loai_vb=$1, so_vb=COALESCE($2,so_vb), ngay_phat_hanh=COALESCE($3,ngay_phat_hanh),
        noi_phat_hanh=$4, noi_nhan=$5, trich_yeu=$6, chu_ky=$7,
        ai_analyzed=true, ai_analyzed_at=NOW(), ai_error=NULL, ai_retry_count=0
      WHERE file_id=$8
    `, [result.loai_vb, result.so_vb, result.ngay_phat_hanh, result.noi_phat_hanh,
        result.noi_nhan, result.trich_yeu, result.chu_ky, file.file_id]);

    sendEvent({ type: 'success', fileId: file.file_id, fileName: file.file_name, result });
    return true;

  } catch (err) {
    await dbClient.query(`
      UPDATE drive_file_metadata SET
        ai_error=$1, ai_retry_count=COALESCE(ai_retry_count,0)+1, ai_analyzed_at=NOW()
      WHERE file_id=$2
    `, [err.message.slice(0, 500), file.file_id]);
    sendEvent({ type: 'error', fileId: file.file_id, fileName: file.file_name, error: err.message });
    return false;
  }
}

// ─── Helper migrate 1 row ─────────────────────────────────────────────────
async function migrateOneDoc(dbClient, row) {
  const cat = (f) => {
    if (!f) return 'Khác';
    if (f.includes('Quy hoạch')) return 'Quy hoạch';
    if (f.includes('Sở NNMT')||f.includes('Sở NN')) return 'Sở ngành';
    if (f.includes('ĐKĐĐ')||f.includes('Đất đai')) return 'Đất đai';
    if (f.includes('bom mìn')||f.includes('RPBM')||f.includes('Lũng Lô')||f.includes('Lữ đoàn')) return 'Rà phá bom mìn';
    if (f.includes('Phú Mỹ Hưng')||f.includes('PMH')) return 'Phú Mỹ Hưng';
    if (f.includes('Bồi thường')||f.includes('GPMB')||f.includes('BT-CG')) return 'Bồi thường';
    if (f.includes('HTKT')||f.includes('cây xanh')||f.includes('chiếu sáng')) return 'Hạ tầng kỹ thuật';
    return 'Khác';
  };
  const parseDate = (d) => {
    if (!d) return null;
    const m = String(d).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
    return null;
  };

  await dbClient.query(`
    INSERT INTO documents (file_name,name,file_path,drive_file_id,drive_web_link,
      folder,category,document_type,document_date,issuing_agency,receiving_agency,
      summary,document_number,file_size,updated_at)
    VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,NOW())
    ON CONFLICT (drive_file_id) DO UPDATE SET
      file_name=EXCLUDED.file_name, name=EXCLUDED.name,
      drive_web_link=EXCLUDED.drive_web_link,
      folder=EXCLUDED.folder, category=EXCLUDED.category,
      document_type=CASE WHEN documents.manually_edited=true THEN documents.document_type ELSE COALESCE(EXCLUDED.document_type,documents.document_type) END,
      document_date=CASE WHEN documents.manually_edited=true THEN documents.document_date ELSE COALESCE(EXCLUDED.document_date,documents.document_date) END,
      issuing_agency=CASE WHEN documents.manually_edited=true THEN documents.issuing_agency ELSE COALESCE(EXCLUDED.issuing_agency,documents.issuing_agency) END,
      summary=CASE WHEN documents.manually_edited=true THEN documents.summary ELSE COALESCE(EXCLUDED.summary,documents.summary) END,
      document_number=CASE WHEN documents.manually_edited=true THEN documents.document_number ELSE COALESCE(EXCLUDED.document_number,documents.document_number) END,
      updated_at=NOW()
  `, [row.file_name, `drive://${row.file_id}`, row.file_id, row.web_view_link,
      row.folder_name, cat(row.folder_name), row.loai_vb||'Công văn',
      parseDate(row.ngay_phat_hanh), row.noi_phat_hanh||'Đang cập nhật',
      row.noi_nhan, row.trich_yeu, row.so_vb]);
}

// ─── Main POST handler ────────────────────────────────────────────────────
export async function POST(request) {
  if (!pool) return Response.json({ error: 'DATABASE_URL chưa cấu hình' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { action, limit = 10, retryErrors = false } = body;

  // Status (không stream)
  if (action === 'status') {
    const client = await pool.connect();
    try {
      const r = await client.query(`
        SELECT COUNT(*) as total,
          COUNT(CASE WHEN ai_analyzed=true THEN 1 END) as analyzed,
          COUNT(CASE WHEN ai_analyzed=false AND (ai_error IS NULL OR ai_retry_count<3) THEN 1 END) as pending,
          COUNT(CASE WHEN ai_error IS NOT NULL AND ai_retry_count>=3 THEN 1 END) as failed,
          COUNT(CASE WHEN manually_edited=true THEN 1 END) as protected
        FROM drive_file_metadata`);
      return Response.json({ success: true, ...r.rows[0] });
    } finally { client.release(); }
  }

  // ── Test 1 file đơn giản (không SSE, dùng để debug) ───────────────────
  if (action === 'analyze_one_sync') {
    const client = await pool.connect();
    try {
      // Lấy 1 file chưa phân tích
      const fileRes = await client.query(`
        SELECT file_id, file_name, folder_name, trich_yeu, manually_edited
        FROM drive_file_metadata
        WHERE ai_analyzed = false AND manually_edited != true AND ai_error IS NULL
        ORDER BY folder_name, file_name
        LIMIT 1
      `);
      if (fileRes.rows.length === 0) {
        return Response.json({ success: true, message: 'Không còn file nào cần phân tích' });
      }

      const file = fileRes.rows[0];
      const results = [];
      const fakeEvents = [];
      const sendEvent = (e) => fakeEvents.push(e);

      const drive = await getDriveClient();
      const ok = await analyzeFile(drive, client, file, sendEvent);

      return Response.json({
        success: ok,
        file: file.file_name,
        events: fakeEvents,
        message: ok ? 'Phân tích thành công' : 'Phân tích thất bại'
      });
    } finally {
      client.release();
    }
  }

  // Analyze với SSE streaming
  if (action === 'analyze') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data) => {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); }
          catch (_) {}
        };

        let drive, dbClient;
        try {
          drive = await getDriveClient();
          dbClient = await pool.connect();

          // Lấy danh sách file cần xử lý
          const filesRes = await dbClient.query(`
            SELECT file_id, file_name, folder_name, trich_yeu, manually_edited, ai_retry_count
            FROM drive_file_metadata
            WHERE manually_edited != true AND (
              ai_analyzed = false
              ${retryErrors ? "OR (ai_error IS NOT NULL AND ai_retry_count < 3)" : ""}
            )
            ORDER BY
              CASE WHEN ai_analyzed=false AND ai_error IS NULL THEN 0 ELSE 1 END,
              folder_name, file_name
            LIMIT $1
          `, [limit]);

          const files = filesRes.rows;
          send({ type: 'start', total: files.length,
                 message: `Bắt đầu ${files.length} văn bản | Tốc độ: 1 file/${DELAY_BETWEEN_FILES_MS/1000}s` });

          if (files.length === 0) {
            send({ type: 'complete', message: '✅ Tất cả văn bản đã được phân tích!' });
            controller.close(); dbClient.release(); return;
          }

          let successCount = 0, errorCount = 0;

          for (let i = 0; i < files.length; i++) {
            send({ type: 'progress', current: i+1, total: files.length, percent: Math.round(i/files.length*100) });

            const ok = await analyzeFile(drive, dbClient, files[i], send);
            if (ok) successCount++; else errorCount++;

            // Delay giữa các file (trừ file cuối)
            if (i < files.length - 1) {
              send({ type: 'waiting', seconds: DELAY_BETWEEN_FILES_MS/1000,
                     message: `⏱️ Chờ ${DELAY_BETWEEN_FILES_MS/1000}s tránh vượt hạn mức...` });
              await sleep(DELAY_BETWEEN_FILES_MS);
            }
          }

          // Auto re-migrate files vừa xong
          send({ type: 'migrating', message: '🔄 Cập nhật bảng documents...' });
          try {
            const toMigrate = await dbClient.query(
              'SELECT * FROM drive_file_metadata WHERE file_id = ANY($1::text[])',
              [files.map(f => f.file_id)]
            );
            for (const row of toMigrate.rows) await migrateOneDoc(dbClient, row);
            send({ type: 'migrated', count: toMigrate.rows.length });
          } catch (me) { send({ type: 'migrate_error', error: me.message }); }

          // Đếm còn lại
          const remRes = await dbClient.query(`
            SELECT COUNT(*) as remaining FROM drive_file_metadata
            WHERE ai_analyzed=false AND manually_edited!=true AND ai_error IS NULL`);

          send({
            type: 'complete', successCount, errorCount,
            remaining: parseInt(remRes.rows[0].remaining),
            message: `✅ Xong: ${successCount} thành công, ${errorCount} lỗi. Còn lại: ${remRes.rows[0].remaining} file.`
          });

        } catch (err) {
          send({ type: 'fatal_error', error: err.message });
        } finally {
          if (dbClient) dbClient.release();
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    });
  }

  return Response.json({ error: 'action phải là: status | analyze' }, { status: 400 });
}

export async function GET() {
  if (!pool) return Response.json({ error: 'DB chưa cấu hình' }, { status: 503 });
  let client;
  try {
    client = await pool.connect();
    const r = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN ai_analyzed=true THEN 1 END) as analyzed,
        COUNT(CASE WHEN ai_analyzed=false AND (ai_error IS NULL OR ai_retry_count<3) THEN 1 END) as pending,
        COUNT(CASE WHEN ai_error IS NOT NULL AND ai_retry_count>=3 THEN 1 END) as failed,
        COUNT(CASE WHEN manually_edited=true THEN 1 END) as protected
      FROM drive_file_metadata`);
    return Response.json({ success: true, ...r.rows[0] });
  } catch (err) {
    console.error('Lỗi kết nối DB trong GET analyze status:', err.message);
    return Response.json({ success: false, error: 'Không thể kết nối đến Database. Vui lòng kiểm tra lại DATABASE_URL (có thể do lỗi IPv6).' }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
