import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDriveClient } from '@/lib/drive';
import { extractText, getDocumentProxy } from 'unpdf';
import { 
  extractAllPdfPagesStructured, 
  checkVietnameseTextQuality, 
  repairGarbledVietnameseWithAI 
} from '@/utils/pdfExtractor';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest'
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Lấy danh sách API keys (hỗ trợ nhiều key cách nhau bằng dấu phẩy)
function getGeminiApiKeys() {
  let rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  if (!rawKeys) {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        rawKeys = config.gemini_api_keys || config.gemini_api_key || config.google_ai_api_key || '';
      }
    } catch (e) {}
  }
  return String(rawKeys).split(',').map(k => k.trim()).filter(Boolean);
}

// Gọi Gemini AI để OCR văn bản scan hoặc PDF phức tạp
async function ocrDocumentWithGemini(base64Data, mimeType) {
  const apiKeys = getGeminiApiKeys();
  if (apiKeys.length === 0) {
    return {
      success: false,
      error: 'Chưa cấu hình GEMINI_API_KEYS trong .env.local hoặc config.json.'
    };
  }

  const prompt = `Bạn là trợ lý chuyên nghiệp bóc tách văn bản công trình và hồ sơ pháp lý Việt Nam.
Nhiệm vụ: Trích xuất toàn bộ nội dung văn bản trong tài liệu đính kèm thành định dạng GitHub-Flavored Markdown chuẩn.

Yêu cầu:
1. Giữ nguyên đầy đủ nội dung, từng điều khoản, từng chương mục (Điều 1, Điều 2, Điều 3...).
2. Nếu có bảng biểu số liệu (tổng mức đầu tư, danh mục gói thầu, khối lượng), định dạng chính xác thành bảng Markdown (\`| Cột 1 | Cột 2 |\`).
3. Giữ nguyên font tiếng Việt có dấu, ngày tháng, số tiền.
4. Chỉ trả về nội dung Markdown thuần túy, không thêm lời chào, không bọc trong code fence \`\`\`markdown.`;

  for (const apiKey of apiKeys) {
    for (const model of GEMINI_MODELS) {
      try {
        const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192
            }
          })
        });

        if (!res.ok) {
          const err = await res.text();
          console.warn(`[Gemini OCR] Model ${model} failed (${res.status}):`, err.slice(0, 150));
          continue;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return {
            success: true,
            text: text.replace(/^```[\s\S]*?\n/i, '').replace(/\n```\s*$/i, '').trim(),
            model
          };
        }
      } catch (err) {
        console.warn(`[Gemini OCR] Lỗi kết nối model ${model}:`, err.message);
      }
    }
  }

  return {
    success: false,
    error: 'Tất cả API keys và models Gemini đều không thể xử lý file này.'
  };
}

// Chuyển đổi dữ liệu Sheet Excel sang bảng Markdown
function convertSheetToMarkdown(worksheet, sheetName) {
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!jsonData || jsonData.length === 0) return '';

  // Lọc các hàng rỗng
  const rows = jsonData.filter(row => Array.isArray(row) && row.some(cell => cell !== ''));
  if (rows.length === 0) return '';

  let md = `### Bảng: ${sheetName}\n\n`;
  const maxCols = Math.max(...rows.map(r => r.length));
  
  // Header row
  const headerRow = rows[0].map(c => String(c || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' '));
  while (headerRow.length < maxCols) headerRow.push('');
  md += '| ' + headerRow.join(' | ') + ' |\n';
  md += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n';

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].map(c => String(c ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>'));
    while (row.length < maxCols) row.push('');
    md += '| ' + row.join(' | ') + ' |\n';
  }
  md += '\n';
  return md;
}

// Xử lý trích xuất file sang Markdown
async function extractDocumentToMarkdown({ buffer, fileName, docMetadata = {}, useAI = false }) {
  const ext = (path.extname(fileName || '') || '').toLowerCase();
  let rawBody = '';
  let extractionMethod = 'native';

  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames || [];
      const sheetMds = sheetNames.map(name => convertSheetToMarkdown(workbook.Sheets[name], name)).filter(Boolean);
      rawBody = sheetMds.join('\n---\n\n') || 'Không có dữ liệu bảng biểu trong file Excel.';
      extractionMethod = 'xlsx_parser';
    } catch (e) {
      rawBody = `Lỗi đọc file Excel: ${e.message}`;
    }
  } else if (ext === '.docx') {
    try {
      const res = await mammoth.convertToHtml({ buffer });
      let html = res.value || '';
      rawBody = html
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<ul>([\s\S]*?)<\/ul>/gi, '$1\n')
        .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      extractionMethod = 'mammoth_docx';
    } catch (e) {
      try {
        const rawRes = await mammoth.extractRawText({ buffer });
        rawBody = rawRes.value || '';
        extractionMethod = 'mammoth_raw';
      } catch (err2) {
        rawBody = `Lỗi đọc file Word DOCX: ${err2.message}`;
      }
    }
  } else {
    // Xử lý file PDF đa trang (đảm bảo 100% toàn vẹn tất cả các trang)
    let pageCount = 1;
    let textPages = 0;
    let extractedDetails = '';

    try {
      const pdfData = await extractAllPdfPagesStructured(buffer);
      pageCount = pdfData.totalPages || 1;
      textPages = pdfData.textPagesCount || 0;

      if (textPages > 0 && !useAI) {
        // Tài liệu PDF dạng số có lớp chữ -> Xuất toàn bộ 100% các trang
        const formattedPages = pdfData.pages.map(p => {
          if (p.isEmpty) {
            return `### 📄 Trang ${p.pageNumber}/${pageCount}\n*(Trang không có nội dung chữ hoặc là ảnh scan đính kèm)*`;
          }
          return `### 📄 Trang ${p.pageNumber}/${pageCount}\n\n${p.text}`;
        });

        rawBody = formattedPages.join('\n\n---\n\n');

        // Tự động kiểm tra chất lượng font tiếng Việt
        const quality = checkVietnameseTextQuality(rawBody);
        if (quality.isGarbled) {
          console.log(`[Auto-Repair] Phát hiện văn bản PDF bị lỗi font/OCR máy quét (${quality.garbledCount} từ lỗi). Đang kích hoạt AI phục hồi...`);
          try {
            const repaired = await repairGarbledVietnameseWithAI(rawBody);
            if (repaired && repaired.length > 50) {
              rawBody = repaired;
              extractionMethod = `unpdf_structured + AI_Vietnamese_Reconstruction (${textPages}/${pageCount} trang)`;
            } else {
              extractionMethod = `unpdf_structured (${textPages}/${pageCount} trang)`;
            }
          } catch (repErr) {
            console.warn('[Auto-Repair] Lỗi phục hồi tiếng Việt:', repErr.message);
            extractionMethod = `unpdf_structured (${textPages}/${pageCount} trang)`;
          }
        } else {
          extractionMethod = `unpdf_structured (${textPages}/${pageCount} trang)`;
        }
      } else {
        // Toàn bộ là trang scan hoặc người dùng ép OCR bằng AI
        const ocrResult = await ocrDocumentWithGemini(
          buffer.toString('base64'),
          ext === '.pdf' ? 'application/pdf' : 'image/jpeg'
        );

        if (ocrResult.success && ocrResult.text) {
          rawBody = ocrResult.text;
          extractionMethod = `gemini_ocr_${ocrResult.model} (${pageCount} trang)`;
        } else {
          // Fallback nếu OCR lỗi: vẫn giữ text đọc được từ PDF nếu có
          if (textPages > 0) {
            rawBody = pdfData.pages.filter(p => !p.isEmpty).map(p => `### 📄 Trang ${p.pageNumber}/${pageCount}\n\n${p.text}`).join('\n\n---\n\n');
            extractionMethod = `pdf_text_partial (${textPages}/${pageCount} trang)`;
          } else {
            rawBody = `Không thể trích xuất nội dung văn bản scan (${pageCount} trang): ${ocrResult.error || 'Lỗi OCR'}`;
            extractionMethod = 'ocr_failed';
          }
        }
      }
    } catch (pdfErr) {
      console.error('Lỗi phân tích PDF:', pdfErr);
      rawBody = `Lỗi phân tích tệp PDF: ${pdfErr.message}`;
      extractionMethod = 'error';
    }
  }

  // Tạo tiêu đề và Header bảng tóm tắt chuẩn Markdown
  const docType = docMetadata.loai_vb || docMetadata.documentType || 'Văn bản';
  const docNumber = docMetadata.so_vb || docMetadata.documentNumber || 'Đang cập nhật';
  const docDate = docMetadata.ngay_phat_hanh || docMetadata.documentDate || 'Chưa xác định';
  const issuer = docMetadata.noi_phat_hanh || docMetadata.issuingAgency || 'Đang cập nhật';
  const receiver = docMetadata.noi_gui || docMetadata.receivingAgency || '---';
  const summary = docMetadata.trich_yeu || docMetadata.summary || fileName || 'Văn bản dự án';
  const staff = docMetadata.nguoi_xu_ly || docMetadata.assignedStaff || '---';

  const fullMarkdown = `# ${docType}: ${docNumber}
> **Trích yếu:** ${summary}

| Thông tin văn bản | Chi tiết |
| :--- | :--- |
| **Số hiệu văn bản** | \`${docNumber}\` |
| **Ngày ban hành** | ${docDate} |
| **Cơ quan ban hành** | ${issuer} |
| **Nơi nhận / Gửi** | ${receiver} |
| **Người thụ lý / Xử lý** | ${staff} |
| **Tên tệp gốc** | \`${fileName}\` |
| **Phương thức trích xuất** | \`${extractionMethod}\` |

---

## 📄 Toàn văn nội dung tài liệu

${rawBody || '*(Không tìm thấy nội dung văn bản)*'}
`;

  return {
    markdown: fullMarkdown,
    charCount: fullMarkdown.length,
    method: extractionMethod
  };
}

// ─── GET: Lấy nội dung Markdown của văn bản ────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const fileName = searchParams.get('fileName');

    if (!fileId && !fileName) {
      return NextResponse.json({ error: 'Thiếu fileId hoặc fileName' }, { status: 400 });
    }

    if (pool) {
      const client = await pool.connect();
      try {
        let query = 'SELECT file_id, file_name, content_md, is_md_generated, md_generated_at, md_char_count FROM drive_file_metadata WHERE ';
        let params = [];
        if (fileId) {
          query += 'file_id = $1';
          params.push(fileId);
        } else {
          query += 'file_name = $1';
          params.push(fileName);
        }

        const res = await client.query(query, params);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return NextResponse.json({
            success: true,
            has_md: !!row.content_md,
            content_md: row.content_md || '',
            is_md_generated: row.is_md_generated || false,
            md_generated_at: row.md_generated_at,
            md_char_count: row.md_char_count || (row.content_md ? row.content_md.length : 0)
          });
        }
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, has_md: false, content_md: '' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Tạo hoặc tạo lại Markdown cho văn bản ─────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { fileId, filePath, fileName: requestedFileName, useAI = false, force = false, fileIds = [] } = body;

    // Xử lý hàng loạt nếu có fileIds
    if (Array.isArray(fileIds) && fileIds.length > 0) {
      const results = [];
      for (const id of fileIds.slice(0, 10)) { // Giới hạn batch 10 file một lần tránh timeout
        try {
          const res = await processSingleFile({ fileId: id, useAI, force });
          results.push({ fileId: id, success: true, ...res });
        } catch (err) {
          results.push({ fileId: id, success: false, error: err.message });
        }
      }
      return NextResponse.json({ success: true, batchResults: results });
    }

    if (!fileId && !filePath && !requestedFileName) {
      return NextResponse.json({ error: 'Thiếu fileId, filePath hoặc fileName' }, { status: 400 });
    }

    const result = await processSingleFile({
      fileId,
      filePath,
      requestedFileName,
      useAI,
      force
    });

    return NextResponse.json({
      success: true,
      message: 'Đã tạo và lưu trữ nội dung Markdown vào Kho tri thức thành công!',
      ...result
    });

  } catch (error) {
    console.error('Lỗi khi tạo Markdown văn bản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper xử lý cho 1 tệp tin
async function processSingleFile({ fileId, filePath, requestedFileName, useAI = false, force = false }) {
  let dbDoc = null;
  let client = null;

  if (pool) {
    client = await pool.connect();
    try {
      let query = 'SELECT * FROM drive_file_metadata WHERE ';
      let params = [];
      if (fileId) {
        query += 'file_id = $1';
        params.push(fileId);
      } else if (requestedFileName) {
        query += 'file_name = $1';
        params.push(requestedFileName);
      }

      if (params.length > 0) {
        const res = await client.query(query, params);
        if (res.rows.length > 0) {
          dbDoc = res.rows[0];
        }
      }
    } finally {
      client.release();
    }
  }

  // Nếu đã có MD và không yêu cầu force tạo lại -> trả về luôn
  if (!force && dbDoc && dbDoc.content_md && dbDoc.content_md.length > 50) {
    return {
      fileId: dbDoc.file_id,
      fileName: dbDoc.file_name,
      content_md: dbDoc.content_md,
      md_char_count: dbDoc.md_char_count || dbDoc.content_md.length,
      md_generated_at: dbDoc.md_generated_at,
      fromCache: true
    };
  }

  const effectiveFileName = requestedFileName || dbDoc?.file_name || (filePath ? path.basename(filePath) : 'document.pdf');
  const effectiveFileId = fileId || dbDoc?.file_id;

  // 1. Tải buffer của file
  let fileBuffer = null;

  if (effectiveFileId && !effectiveFileId.startsWith('file-sync')) {
    try {
      const drive = await getDriveClient();
      const response = await drive.files.get(
        { fileId: effectiveFileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      fileBuffer = Buffer.from(response.data);
    } catch (driveErr) {
      console.warn('Lỗi tải file từ Google Drive:', driveErr.message);
    }
  }

  if (!fileBuffer && filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
      }
    } catch (fsErr) {
      console.warn('Lỗi đọc file từ đĩa local:', fsErr.message);
    }
  }

  if (!fileBuffer) {
    throw new Error(`Không thể tải nội dung tệp tin "${effectiveFileName}". Hãy kiểm tra kết nối Google Drive hoặc đường dẫn file.`);
  }

  // 2. Chuyển đổi sang Markdown
  const extracted = await extractDocumentToMarkdown({
    buffer: fileBuffer,
    fileName: effectiveFileName,
    docMetadata: dbDoc || {},
    useAI
  });

  // 3. Lưu vào Supabase Postgres
  if (pool && effectiveFileId) {
    const dbClient = await pool.connect();
    try {
      await dbClient.query(`
        UPDATE drive_file_metadata
        SET 
          content_md = $1,
          is_md_generated = true,
          md_generated_at = CURRENT_TIMESTAMP,
          md_char_count = $2
        WHERE file_id = $3
      `, [extracted.markdown, extracted.charCount, effectiveFileId]);
      console.log(`Đã lưu ${extracted.charCount} ký tự Markdown cho file ${effectiveFileId} vào Supabase.`);
    } finally {
      dbClient.release();
    }
  }

  // 4. Fallback cập nhật vào db.json
  try {
    const dbJsonPath = path.join(process.cwd(), 'src', 'data', 'db.json');
    if (fs.existsSync(dbJsonPath)) {
      const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
      if (dbData.documents) {
        const idx = dbData.documents.findIndex(d => d.id === effectiveFileId || d.name === effectiveFileName);
        if (idx !== -1) {
          dbData.documents[idx].content_md = extracted.markdown;
          dbData.documents[idx].is_md_generated = true;
          dbData.documents[idx].md_generated_at = new Date().toISOString();
          dbData.documents[idx].md_char_count = extracted.charCount;
          fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf-8');
        }
      }
    }
  } catch (e) {}

  return {
    fileId: effectiveFileId,
    fileName: effectiveFileName,
    content_md: extracted.markdown,
    md_char_count: extracted.charCount,
    md_generated_at: new Date().toISOString(),
    method: extracted.method
  };
}
