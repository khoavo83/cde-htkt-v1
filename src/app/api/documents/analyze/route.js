import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDriveClient } from '@/lib/drive';
import { parseDocDetailsImproved } from '@/utils/regexParser';
import fs from 'fs';
import path from 'path';

// ─── Throttle chống quá tải ──────────────────────────────────────
// Gemini Free Tier: 15 RPM → chúng ta giới hạn 1 req/4 giây = ~15 RPM
const MIN_INTERVAL_MS = 4000; // 4 giây giữa các lần gọi
let lastCallTimestamp = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < MIN_INTERVAL_MS) {
    const waitMs = MIN_INTERVAL_MS - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  lastCallTimestamp = Date.now();
}

// ─── Gemini AI Client ────────────────────────────────────────────
function getGeminiClient() {
  // Đọc API key từ biến môi trường hoặc config
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    // Thử đọc từ file config.json
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        apiKey = config.gemini_api_key || config.google_ai_api_key;
      }
    } catch (e) {
      // ignore
    }
  }
  
  if (!apiKey) {
    return null;
  }
  
  return new GoogleGenerativeAI(apiKey);
}

// ─── Prompt template cho Gemini ──────────────────────────────────
function buildAnalysisPrompt(fileName, folderName, hasPdf = false) {
  return `Bạn là chuyên gia phân tích văn bản hành chính nhà nước Việt Nam. 
${hasPdf ? 'Hãy đọc toàn bộ tài liệu đính kèm' : 'Hãy phân tích tên file sau'} và trích xuất thông tin chi tiết dựa theo tiêu chuẩn của **Nghị định 30/2020/NĐ-CP** về công tác văn thư.

**Tên file:** ${fileName}
**Thư mục chứa:** ${folderName}

Quy ước đặt tên file thường theo format: YYYY-MM-DD_SốHiệu_KýHiệuCơQuan_TríchYếuNộiDung.ext
Nhưng có file không theo format chuẩn này.

Hãy phân tích và trả về JSON với cấu trúc CHÍNH XÁC sau (không thêm markdown code fence):
{
  "documentNumber": "Số, ký hiệu văn bản (VD: 1209/BQLĐSĐT-HTKT). Trích xuất chính xác theo Nghị định 30. Nếu không rõ thì ghi 'Chưa xác định'",
  "issuedDate": "Ngày, tháng, năm ban hành format DD/MM/YYYY. Nếu không rõ ghi ngày hôm nay (DD/MM/YYYY)",
  "issuer": "Tên cơ quan, tổ chức ban hành văn bản đầy đủ bằng tiếng Việt có dấu theo Nghị định 30",
  "notes": "Trích yếu nội dung văn bản bằng tiếng Việt có dấu, viết thành câu hoàn chỉnh tóm tắt chính xác nội dung",
  "category": "Một trong: Quy hoạch, Sở ngành, Đất đai, Rà phá bom mìn, Phú Mỹ Hưng, Khác",
  "confidence": {
    "documentNumber": 0.0-1.0,
    "issuedDate": 0.0-1.0,
    "issuer": 0.0-1.0,
    "notes": 0.0-1.0
  }
}

Lưu ý:
- BQLĐSĐT = Ban Quản lý Đường sắt Đô thị TP.HCM
- HTKT = Hạ tầng Kỹ thuật
- PMH = Phú Mỹ Hưng
- VPĐK = Văn phòng Đăng ký Đất đai
- SNN = Sở Nông nghiệp & Phát triển Nông thôn
- CN1 = Chi nhánh 1
- RPBM = Rà phá bom mìn
- PTr = Phiếu trình
- GM = Giấy mời
- TB = Thông báo
- QĐ = Quyết định
- NQ = Nghị quyết
- TCT = Tổng Công ty
- DAĐT = Đầu tư Dự án
- TT-KHKT = Trung tâm Kỹ thuật
- Thư mục "${folderName}" cho biết ngữ cảnh văn bản thuộc đơn vị/lĩnh vực nào

Chỉ trả về JSON thuần túy, không có bất kỳ text hay markdown nào khác.`;
}
// ─── POST Handler ────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { fileId, fileName, folderName, forceAI = false } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'Thiếu tên file để phân tích' }, { status: 400 });
    }

    const folder = folderName || 'Bồi thường BT-CG';

    // Thử dùng Gemini AI trước
    const genAI = getGeminiClient();

    if (genAI) {
      try {
        await throttle(); // Chờ nếu gọi quá nhanh

        const model = genAI.getGenerativeModel({ 
          model: 'gemini-flash-latest',
          generationConfig: {
            temperature: 0.1,      // Rất chính xác
            maxOutputTokens: 800,  // Giới hạn output
          }
        });

        let inlineData = null;
        if (fileId) {
          try {
            const drive = await getDriveClient();
            const res = await drive.files.get(
              { fileId, alt: 'media' },
              { responseType: 'arraybuffer' }
            );
            inlineData = {
              inlineData: {
                data: Buffer.from(res.data).toString('base64'),
                mimeType: 'application/pdf',
              }
            };
          } catch (e) {
            console.error('Không thể tải PDF từ Drive:', e.message);
          }
        }

        const prompt = buildAnalysisPrompt(fileName, folder, !!inlineData);
        const requestPayload = inlineData ? [prompt, inlineData] : prompt;
        
        const result = await model.generateContent(requestPayload);
        const responseText = result.response.text().trim();

        // Parse JSON từ response
        let parsed;
        try {
          // Loại bỏ markdown code fence nếu có
          const cleanJson = responseText
            .replace(/^`{3}json\s*/i, '')
            .replace(/^`{3}\s*/i, '')
            .replace(/\s*`{3}$/i, '')
            .trim();
          parsed = JSON.parse(cleanJson);
        } catch (parseErr) {
          console.error('Lỗi parse JSON từ Gemini:', parseErr);
          console.error('Response text:', responseText);
          // Fallback về regex
          const fallback = parseDocDetailsImproved(fileName, folder);
          return NextResponse.json({
            success: true,
            analysis: fallback,
            warning: 'AI trả kết quả không hợp lệ, đã dùng regex cải tiến',
          });
        }

        return NextResponse.json({
          success: true,
          analysis: {
            documentNumber: parsed.documentNumber || 'Chưa xác định',
            issuedDate: parsed.issuedDate || (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` })(),
            issuer: parsed.issuer || 'Ban Quản lý Đường sắt Đô thị TP.HCM',
            notes: parsed.notes || fileName,
            category: parsed.category || 'Khác',
            confidence: parsed.confidence || {
              documentNumber: 0.7,
              issuedDate: 0.7,
              issuer: 0.7,
              notes: 0.7,
            },
            analysisMode: 'gemini_flash_latest',
          },
        });
      } catch (aiError) {
        console.error('Lỗi Gemini AI, fallback sang regex:', aiError.message);
        // Nếu lỗi quota/rate-limit, báo cho client biết
        const isRateLimit = aiError.message?.includes('429') || aiError.message?.includes('quota');
        const fallback = parseDocDetailsImproved(fileName, folder);
        return NextResponse.json({
          success: true,
          analysis: fallback,
          warning: isRateLimit 
            ? 'Đã vượt giới hạn gọi AI (rate limit). Sử dụng regex cải tiến. Vui lòng thử lại sau 1 phút.'
            : `Lỗi AI: ${aiError.message}. Đã dùng regex cải tiến.`,
        });
      }
    }

    // Không có API key → dùng regex cải tiến
    const regexResult = parseDocDetailsImproved(fileName, folder);
    return NextResponse.json({
      success: true,
      analysis: regexResult,
      warning: 'Chưa cấu hình Gemini API Key. Sử dụng phân tích regex cải tiến. Để dùng AI, thêm gemini_api_key vào config.json.',
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
