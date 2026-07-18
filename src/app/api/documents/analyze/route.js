import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDriveClient } from '@/lib/drive';
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
${hasPdf ? 'Hãy đọc toàn bộ tài liệu đính kèm' : 'Hãy phân tích tên file sau'} và trích xuất thông tin chi tiết.

**Tên file:** ${fileName}
**Thư mục chứa:** ${folderName}

Quy ước đặt tên file thường theo format: YYYY-MM-DD_SốHiệu_KýHiệuCơQuan_TrịchYếuNộiDung.ext
Nhưng có file không theo format chuẩn này.

Hãy phân tích và trả về JSON với cấu trúc CHÍNH XÁC sau (không thêm markdown code fence):
{
  "documentNumber": "Số hiệu văn bản (VD: 1209/BQLĐSĐT-HTKT). Nếu không rõ thì ghi 'Chưa xác định'",
  "issuedDate": "Ngày ban hành format YYYY-MM-DD. Nếu không rõ ghi ngày hôm nay",
  "issuer": "Cơ quan ban hành đầy đủ bằng tiếng Việt có dấu",
  "notes": "Trích yếu nội dung văn bản bằng tiếng Việt có dấu, viết thành câu hoàn chỉnh",
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

// ─── Fallback: Phân tích bằng regex cải tiến ─────────────────────
function parseDocDetailsImproved(fileName, folderName) {
  // Trích xuất ngày ban hành
  const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  // Cũng thử format khác: DDMMYYYY hoặc embedded
  const altDateMatch = fileName.match(/(\d{1,2})(\d{2})(\d{4})/);
  let issuedDate = 'Chưa xác định';
  let dateConfidence = 0.3;
  
  if (dateMatch) {
    issuedDate = dateMatch[1];
    dateConfidence = 0.95;
  } else if (altDateMatch) {
    const [, d, m, y] = altDateMatch;
    if (parseInt(m) <= 12 && parseInt(d) <= 31) {
      issuedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      dateConfidence = 0.5;
    }
  }

  // Trích xuất số hiệu văn bản - cải tiến nhiều pattern
  let documentNumber = 'Chưa xác định';
  let docNumConfidence = 0.2;

  // Pattern 1: YYYY-MM-DD_SốHiệu_KýHiệu_MôTả
  const numP1 = fileName.match(/^\d{4}-\d{2}-\d{2}_([^_]+)_([A-ZĐa-zđ\-\.]+(?:-[A-ZĐa-zđ]+)*)_/);
  // Pattern Đặc biệt: 250 QD-BQLDSDT 2662026 dieu chinh...
  const spacePattern = fileName.match(/^(\d{1,5})\s+([A-ZĐa-zđ]+)-([A-ZĐa-zđ]+)\s+(\d{6,8})\s+(.*)/i);
  
  if (numP1) {
    documentNumber = `${numP1[1]}/${numP1[2]}`;
    docNumConfidence = 0.85;
  } else if (spacePattern) {
    documentNumber = `${spacePattern[1]}/${spacePattern[2]}-${spacePattern[3]}`.toUpperCase();
    docNumConfidence = 0.9;
    
    // Trích xuất ngày từ chuỗi số (VD: 2662026 -> 26/06/2026)
    const dStr = spacePattern[4];
    if (dStr.length === 7) {
      const d = dStr.substring(0, 2);
      const m = dStr.substring(2, 3).padStart(2, '0');
      const y = dStr.substring(3);
      issuedDate = `${y}-${m}-${d}`;
      dateConfidence = 0.8;
    } else if (dStr.length === 8) {
      const d = dStr.substring(0, 2);
      const m = dStr.substring(2, 4);
      const y = dStr.substring(4);
      issuedDate = `${y}-${m}-${d}`;
      dateConfidence = 0.8;
    }
  } else {
    // Pattern 2: Số liên tiếp ở đầu (sau date)
    const numP2 = fileName.match(/^\d{4}-\d{2}-\d{2}_(\d{2,6})_/);
    if (numP2) {
      // Tìm ký hiệu cơ quan ngay sau
      const orgMatch = fileName.match(new RegExp(`${numP2[1]}_([A-ZĐÀ-Ỹa-zđà-ỹ\\-\\.]+)_`));
      if (orgMatch) {
        documentNumber = `${numP2[1]}/${orgMatch[1]}`;
        docNumConfidence = 0.75;
      } else {
        documentNumber = numP2[1];
        docNumConfidence = 0.5;
      }
    } else {
      // Pattern 3: Số có trong tên file (VD: 20696-Phụ lục)
      const numP3 = fileName.match(/^(\d{3,6})-/);
      if (numP3) {
        documentNumber = numP3[1];
        docNumConfidence = 0.4;
      } else {
        // Pattern 4: PTr-HTKT (phiếu trình - không có số)
        const ptrMatch = fileName.match(/_(PTr[^_]*)/);
        if (ptrMatch) {
          documentNumber = ptrMatch[1];
          docNumConfidence = 0.6;
        } else {
           // Pattern 5: Bắt đầu bằng số và khoảng trắng (VD: 250 QD BQL)
           const startNum = fileName.match(/^(\d{1,5})\s+([A-Za-zĐđ]+)[-\s]([A-Za-zĐđ]+)/);
           if (startNum) {
             documentNumber = `${startNum[1]}/${startNum[2]}-${startNum[3]}`.toUpperCase();
             docNumConfidence = 0.8;
           }
        }
      }
    }
  }

  // Phân tích cơ quan ban hành - ưu tiên dựa vào thư mục
  let issuer = 'Ban Quản lý Đường sắt Đô thị TP.HCM';
  let issuerConfidence = 0.3;

  const folderIssuerMap = {
    'Sở NNMT': { name: 'Sở Nông nghiệp & Phát triển Nông thôn TP.HCM', conf: 0.9 },
    'Văn phòng ĐKĐĐ TP': { name: 'Văn phòng Đăng ký Đất đai TP.HCM', conf: 0.9 },
    'Lữ đoàn 239 - Binh chủng Công binh': { name: 'Lữ đoàn Công binh 239 - Binh chủng Công binh', conf: 0.9 },
    'Tổng Công ty Xây dựng Lũng Lô': { name: 'Tổng Công ty Xây dựng Lũng Lô - Bộ Quốc phòng', conf: 0.9 },
    'Tổng Công ty Thành An - Binh đoàn 11': { name: 'Tổng Công ty Thành An - Binh đoàn 11', conf: 0.9 },
    'Trung tâm xử lý bom mìn': { name: 'Trung tâm Xử lý Bom mìn Quốc gia', conf: 0.9 },
    'Lữ đoàn 299 -Quân đoàn 12': { name: 'Lữ đoàn Công binh 299 - Quân đoàn 12', conf: 0.9 },
    'Công ty TNHH Phát triển Phú Mỹ Hưng': { name: 'Công ty TNHH Phát triển Phú Mỹ Hưng', conf: 0.9 },
    'Xí nghiệp TDNS': { name: 'Xí nghiệp Truyền dẫn Nước sạch', conf: 0.85 },
  };

  if (folderIssuerMap[folderName]) {
    issuer = folderIssuerMap[folderName].name;
    issuerConfidence = folderIssuerMap[folderName].conf;
  } else {
    // Nhận diện từ tên file
    const upperName = fileName.toUpperCase();
    if (upperName.includes('VPĐK') || upperName.includes('VĂN PHÒNG ĐĂNG KÝ')) {
      issuer = 'Văn phòng Đăng ký Đất đai TP.HCM';
      issuerConfidence = 0.8;
    } else if (upperName.includes('BQLĐSĐT')) {
      issuer = 'Ban Quản lý Đường sắt Đô thị TP.HCM';
      issuerConfidence = 0.85;
    } else if (upperName.includes('PMH') || upperName.includes('PHÚ MỸ HƯNG')) {
      issuer = 'Công ty TNHH Phát triển Phú Mỹ Hưng';
      issuerConfidence = 0.8;
    } else if (upperName.includes('SNN') || upperName.includes('SỞ NN')) {
      issuer = 'Sở Nông nghiệp & Phát triển Nông thôn TP.HCM';
      issuerConfidence = 0.8;
    } else if (upperName.includes('UBND')) {
      issuer = 'UBND TP.HCM';
      issuerConfidence = 0.7;
    } else if (upperName.includes('TCT') || upperName.includes('TỔNG CÔNG TY')) {
      if (upperName.includes('LŨNG LÔ') || upperName.includes('LUNG LO')) {
        issuer = 'Tổng Công ty Xây dựng Lũng Lô';
        issuerConfidence = 0.8;
      } else if (upperName.includes('THÀNH AN') || upperName.includes('THANH AN')) {
        issuer = 'Tổng Công ty Thành An - Binh đoàn 11';
        issuerConfidence = 0.8;
      }
    } else if (upperName.includes('TBMNT') || upperName.includes('TBMMT')) {
      issuer = 'Trung tâm Xử lý Bom mìn Quốc gia';
      issuerConfidence = 0.7;
    }
  }

  // Trích yếu nội dung
  let notes = fileName;
  let notesConfidence = 0.4;
  const cleanName = fileName
    .replace(/^\d{4}-\d{2}-\d{2}_/, '')  // Bỏ ngày
    .replace(/\.[^/.]+$/, '')             // Bỏ extension
    .replace(/\.signed/g, '');            // Bỏ .signed

  const parts = cleanName.split('_');
  if (parts.length > 2) {
    // Bỏ số hiệu và ký hiệu, lấy phần mô tả
    notes = parts.slice(2).join(' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    notesConfidence = 0.5;
  } else if (parts.length > 1) {
    notes = parts.slice(1).join(' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    notesConfidence = 0.4;
  } else {
    notes = cleanName.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    notesConfidence = 0.3;
  }
  notes = notes.charAt(0).toUpperCase() + notes.slice(1);

  // Phân loại danh mục
  let category = 'Khác';
  if (folderName.includes('Quy hoạch') || fileName.includes('quy hoạch') || fileName.includes('QH')) category = 'Quy hoạch';
  else if (folderName.includes('Sở NNMT') || folderName.includes('Sở NN')) category = 'Sở ngành';
  else if (folderName.includes('ĐKĐĐ') || folderName.includes('Địa chính') || fileName.includes('đất đai') || fileName.includes('dat dai')) category = 'Đất đai';
  else if (folderName.includes('bom mìn') || folderName.includes('RPBM') || folderName.includes('Lũng Lô') || folderName.includes('Thành An') || folderName.includes('Lữ đoàn') || fileName.includes('RPBM') || fileName.includes('bom min')) category = 'Rà phá bom mìn';
  else if (folderName.includes('Phú Mỹ Hưng') || folderName.includes('PMH') || fileName.includes('PMH')) category = 'Phú Mỹ Hưng';

  return {
    documentNumber,
    issuedDate,
    issuer,
    notes,
    category,
    confidence: {
      documentNumber: docNumConfidence,
      issuedDate: dateConfidence,
      issuer: issuerConfidence,
      notes: notesConfidence,
    },
    analysisMode: 'regex_improved',
  };
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
          model: 'gemini-2.0-flash',
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
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
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
            issuedDate: parsed.issuedDate || new Date().toISOString().split('T')[0],
            issuer: parsed.issuer || 'Ban Quản lý Đường sắt Đô thị TP.HCM',
            notes: parsed.notes || fileName,
            category: parsed.category || 'Khác',
            confidence: parsed.confidence || {
              documentNumber: 0.7,
              issuedDate: 0.7,
              issuer: 0.7,
              notes: 0.7,
            },
            analysisMode: 'gemini_2.0_flash',
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
