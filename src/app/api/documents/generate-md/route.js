import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDriveClient } from '@/lib/drive';
import { extractText, getDocumentProxy } from 'unpdf';
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

// Lấy client Gemini AI nếu có cấu hình
function getGeminiClient() {
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
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
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
      // Chuyển HTML cơ bản sang Markdown
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
        .replace(/<[^>]+>/g, '') // Xóa tag còn lại
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
    // Mặc định xử lý PDF (hoặc fallback)
    let extractedPdfText = '';
    try {
      const uint8 = new Uint8Array(buffer);
      const pdf = await getDocumentProxy(uint8);
      const totalPages = pdf.numPages || 1;
      
      const pageTexts = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items.map(item => item.str).join(' ');
        if (pageStr.trim()) {
          pageTexts.push(`### Trang ${i}\n\n${pageStr.trim()}`);
        }
      }
      extractedPdfText = pageTexts.join('\n\n---\n\n');
    } catch (pdfErr) {
      console.warn('unpdf extract warning:', pdfErr.message);
    }

    // Nếu văn bản dạng scan (ít hơn 120 ký tự) hoặc người dùng yêu cầu dùng AI
    if ((extractedPdfText.length < 120 || useAI) && buffer) {
      const genAI = getGeminiClient();
      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            }
          });

          const inlineData = {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: ext === '.pdf' ? 'application/pdf' : 'image/jpeg'
            }
          };

          const prompt = `Bạn là trợ lý chuyên nghiệp bóc tách văn bản công trình và hồ sơ pháp lý Việt Nam.
Nhiệm vụ: Trích xuất toàn bộ nội dung văn bản trong tài liệu đính kèm thành định dạng GitHub-Flavored Markdown chuẩn.

Yêu cầu:
1. Giữ nguyên đầy đủ nội dung, từng điều khoản, từng chương mục (Điều 1, Điều 2, Điều 3...).
2. Nếu có bảng biểu số liệu (tổng mức đầu tư, danh mục gói thầu, khối lượng), định dạng chính xác thành bảng Markdown (\`| Cột 1 | Cột 2 |\`).
3. Giữ nguyên font tiếng Việt có dấu, ngày tháng, số tiền.
4. Chỉ trả về nội dung Markdown, không thêm lời chào, không bọc trong code fence \`\`\`markdown.`;

          const result = await model.generateContent([prompt, inlineData]);
          const aiText = result.response.text().trim();
          if (aiText) {
            rawBody = aiText.replace(/^```[\s\S]*?\n/i, '').replace(/\n```\s*$/i, '').trim();
            extractionMethod = 'gemini_vision_ocr';
          }
        } catch (aiErr) {
          console.error('Gemini OCR fallback error:', aiErr.message);
          rawBody = extractedPdfText || 'Không thể trích xuất nội dung văn bản (File scan không có lớp chữ).';
          extractionMethod = 'pdf_text_partial';
        }
      } else {
        rawBody = extractedPdfText || 'File PDF scan chưa có lớp chữ. Cần cấu hình Gemini API Key để tự động OCR.';
        extractionMethod = 'pdf_text';
      }
    } else {
      rawBody = extractedPdfText;
      extractionMethod = 'unpdf_native';
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
