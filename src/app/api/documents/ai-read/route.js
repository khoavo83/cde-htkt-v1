import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDriveClient } from '@/lib/drive';
import fs from 'fs';
import path from 'path';

// ─── Throttle chống quá tải (chia sẻ cùng giới hạn với analyze) ───
const MIN_INTERVAL_MS = 4000;
let lastCallTimestamp = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastCallTimestamp = Date.now();
}

// ─── Gemini AI Client ─────────────────────────────────────────────
function getGeminiClient() {
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        apiKey = config.gemini_api_key || config.google_ai_api_key;
      }
    } catch (e) { /* ignore */ }
  }
  
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── POST Handler ─────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { fileId, filePath, fileName } = await request.json();

    if (!fileId && !filePath) {
      return NextResponse.json({ error: 'Thiếu fileId hoặc filePath' }, { status: 400 });
    }

    // Kiểm tra Gemini API key
    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json({ 
        error: 'Chưa cấu hình Gemini API Key. Thêm gemini_api_key vào config.json hoặc biến môi trường GEMINI_API_KEY.' 
      }, { status: 400 });
    }

    // Tải file PDF
    let pdfBuffer = null;

    if (fileId && !fileId.startsWith('file-sync')) {
      try {
        const drive = await getDriveClient();
        const response = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        pdfBuffer = Buffer.from(response.data);
      } catch (driveErr) {
        console.error('Lỗi tải file từ Drive:', driveErr.message);
      }
    }

    if (!pdfBuffer && filePath) {
      try {
        if (fs.existsSync(filePath)) {
          pdfBuffer = fs.readFileSync(filePath);
        }
      } catch (fsErr) {
        console.error('Lỗi đọc file local:', fsErr.message);
      }
    }

    if (!pdfBuffer) {
      return NextResponse.json({
        error: 'Không thể tải file PDF.'
      }, { status: 500 });
    }

    // Gửi PDF cho Gemini AI đọc
    await throttle();

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.05,     // Cực kỳ chính xác, không sáng tạo
        maxOutputTokens: 4096, // Đủ cho toàn bộ trang đầu
      }
    });

    const inlineData = {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      }
    };

    const prompt = `Bạn là trợ lý chuyên đọc và sao chép nội dung văn bản hành chính Việt Nam.

NHIỆM VỤ: Đọc TRANG ĐẦU TIÊN của tài liệu PDF đính kèm và sao chép LẠI NGUYÊN VĂN toàn bộ nội dung chữ trên trang đó.

QUY TẮC BẮT BUỘC:
1. Sao chép CHÍNH XÁC từng chữ, từng dấu câu, giữ nguyên font tiếng Việt CÓ DẤU đầy đủ.
2. Giữ nguyên bố cục: tiêu đề trên, nội dung dưới, các dòng xuống hàng đúng vị trí.
3. KHÔNG thêm bất kỳ bình luận, giải thích, hoặc markdown nào.
4. KHÔNG bỏ sót bất kỳ dòng chữ nào trên trang đầu tiên.
5. Nếu có bảng, trình bày dạng text có căn lề rõ ràng.
6. CHỈ trả về nội dung chữ thuần túy (plain text), KHÔNG có markdown code fence.

Hãy bắt đầu sao chép ngay:`;

    const result = await model.generateContent([prompt, inlineData]);
    const responseText = result.response.text().trim();

    // Loại bỏ markdown code fence nếu Gemini tự thêm
    const cleanText = responseText
      .replace(/^```[\s\S]*?\n/i, '')
      .replace(/\n```\s*$/i, '')
      .trim();

    return NextResponse.json({
      success: true,
      text: cleanText,
      mode: 'gemini_ai',
    });

  } catch (error) {
    console.error('Lỗi AI đọc PDF:', error);
    
    const isRateLimit = error.message?.includes('429') || error.message?.includes('quota');
    const errorMsg = isRateLimit 
      ? 'Vượt giới hạn gọi AI (rate limit). Vui lòng thử lại sau 1 phút.'
      : 'Lỗi AI đọc PDF: ' + error.message;
    
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
