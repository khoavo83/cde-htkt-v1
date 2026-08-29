import { getDocumentProxy } from 'unpdf';
import fs from 'fs';
import path from 'path';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest'
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

// ─── 1. Kiểm tra chất lượng và phát hiện lỗi font/OCR máy quét ───
export function checkVietnameseTextQuality(text) {
  if (!text || text.length < 50) return { isGarbled: false, score: 1.0 };

  // Các mẫu lỗi OCR scanner thường gặp (dùng số/ký tự lạ thay cho dấu tiếng Việt)
  const garbledPatterns = [
    /\b\w*[0-9]['`]?\w*\b/g,        // Từ chứa số lẫn chữ như Gi6'i, Tuy6n, ph6, c6ng, nh6m
    /\b(dw in|dlr in|dy in)\b/gi,   // Lỗi nhận diện "dự án"
    /\b(dudng|d6 thi|dBe biet|thl\.rc|tP di\)ng|caa U\)'|thueyng|djnh|c6ng|nh6rn|tlr|thtrc)\b/gi,
    /[a-zA-Z]+[0-9]+[a-zA-Z]*/g,   // Ký tự chữ số lẫn lộn
    /[€£¥§]/g                      // Ký tự tiền tệ/lạ do lỗi font
  ];

  let garbledCount = 0;
  for (const pattern of garbledPatterns) {
    const matches = text.match(pattern);
    if (matches) garbledCount += matches.length;
  }

  const validVnMatches = text.match(/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/gi) || [];
  const totalWords = (text.match(/\S+/g) || []).length || 1;

  const garbledRatio = garbledCount / totalWords;
  const isGarbled = (garbledCount >= 5 && garbledRatio > 0.015) || (garbledCount >= 10);

  return {
    isGarbled,
    garbledCount,
    garbledRatio,
    totalWords
  };
}

// ─── 2. Phục hồi nhanh một số mẫu phổ biến bằng Rule-based Regex ───
export function heuristicRepairVietnamese(text) {
  if (!text) return text;
  return text
    .replace(/\bTuy6n\b/g, 'Tuyến')
    .replace(/\bdudng\b/g, 'đường')
    .replace(/\bB6n\b/g, 'Bến')
    .replace(/\bCan Gia\b/g, 'Cần Giờ')
    .replace(/\bGi6'i thi6u\b/g, 'Giới thiệu')
    .replace(/\b(dw in|dlr in|dy in)\b/gi, 'dự án')
    .replace(/\bB&i thueyng\b/g, 'Bồi thường')
    .replace(/\bhg tr9\b/g, 'hỗ trợ')
    .replace(/\btai djnh cu\b/g, 'tái định cư')
    .replace(/\bph tlc vv dv an\b/g, 'phục vụ dự án')
    .replace(/\bNh6m\b/g, 'Nhóm')
    .replace(/\bc6ng trinh\b/g, 'công trình')
    .replace(/\bnh6rn A\b/g, 'nhóm A')
    .replace(/\bdBe biet\b/g, 'đặc biệt')
    .replace(/\bChti dau tlr\b/g, 'Chủ đầu tư')
    .replace(/\bDei di€n\b/g, 'Đại diện')
    .replace(/\bchi dau tlr\b/g, 'chủ đầu tư')
    .replace(/\bBan Quan IV\b/g, 'Ban Quản lý')
    .replace(/\bDudng sat d6 thi\b/g, 'Đường sắt đô thị')
    .replace(/\bTang mac aau tlr\b/g, 'Tổng mức đầu tư')
    .replace(/\btP di\)ng\b/g, 'tỷ đồng')
    .replace(/\bThai gian thl\.rc hien\b/g, 'Thời gian thực hiện')
    .replace(/\bQuy6t djnh\b/g, 'Quyết định')
    .replace(/\bchap thu an\b/g, 'chấp thuận')
    .replace(/\bcha huang dhl tu\b/g, 'chủ trương đầu tư')
    .replace(/\bchua xac djnh\b/g, 'chưa xác định')
    .replace(/\bcaa U\)' ban nhan dan\b/g, 'của Ủy ban nhân dân')
    .replace(/\bThanh ph6 H6 Chi Minh\b/g, 'Thành phố Hồ Chí Minh')
    .replace(/\bDja di6m thlrc hien\b/g, 'Địa điểm thực hiện')
    .replace(/\bNgu6n van\b/g, 'Nguồn vốn')
    .replace(/\bngan sach\b/g, 'ngân sách');
}

// ─── 3. Phục hồi toàn văn chuyên sâu 100% bằng Gemini AI ───
export async function repairGarbledVietnameseWithAI(garbledText) {
  const apiKeys = getGeminiApiKeys();
  if (apiKeys.length === 0) return heuristicRepairVietnamese(garbledText);

  const maxChunkLength = 7000;
  const paragraphs = garbledText.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk.length + para.length) > maxChunkLength) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  const repairedChunks = [];
  const apiKey = apiKeys[0];
  const model = 'gemini-2.5-flash';

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const prompt = `Bạn là chuyên gia khôi phục văn bản tiếng Việt bị lỗi font OCR từ máy scan/photocopy.
Văn bản dưới đây trích xuất từ tài liệu hồ sơ dự án xây dựng/hành chính Việt Nam nhưng bị sai bảng mã hoặc lỗi OCR máy quét (ví dụ: Tuy6n -> Tuyến, dw in -> dự án, c6ng -> công, thl.rc -> thực, d6 thi -> đô thị, tP di)ng -> tỷ đồng, caa U)' -> của Ủy...).

NHIỆM VỤ:
1. Đọc và khôi phục CHÍNH XÁC 100% tiếng Việt chuẩn Unicode có đầy đủ dấu thanh và dấu mũ.
2. Giữ nguyên toàn bộ các số liệu, ngày tháng, số tiền, điều khoản, danh mục và bảng biểu.
3. Trả về định dạng Markdown chuẩn, không thêm lời chào, không bọc trong \`\`\`markdown.

Nội dung cần khôi phục:
${chunk}`;

    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        })
      });

      if (!res.ok) {
        console.warn(`[Gemini Text Repair] Lỗi chunk ${i + 1}:`, await res.text());
        repairedChunks.push(heuristicRepairVietnamese(chunk));
        continue;
      }

      const json = await res.json();
      const repaired = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (repaired && repaired.trim()) {
        repairedChunks.push(repaired.replace(/^```[\s\S]*?\n/i, '').replace(/\n```\s*$/i, '').trim());
      } else {
        repairedChunks.push(heuristicRepairVietnamese(chunk));
      }
    } catch (e) {
      console.warn(`[Gemini Text Repair] Exception chunk ${i + 1}:`, e.message);
      repairedChunks.push(heuristicRepairVietnamese(chunk));
    }
  }

  return repairedChunks.join('\n\n---\n\n');
}

// ─── 4. Trích xuất toàn bộ trang PDF có cấu trúc layout và giữ nguyên 100% số trang ───
export async function extractAllPdfPagesStructured(buffer) {
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const totalPages = pdf.numPages || 1;

  const pagesData = [];
  let totalCharacters = 0;
  let textPagesCount = 0;
  let emptyPagesCount = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = textContent.items || [];
      if (items.length === 0) {
        emptyPagesCount++;
        pagesData.push({
          pageNumber: pageNum,
          text: '',
          isEmpty: true
        });
        continue;
      }

      const sortedItems = [...items].sort((a, b) => {
        const yA = a.transform ? a.transform[5] : 0;
        const yB = b.transform ? b.transform[5] : 0;
        const xA = a.transform ? a.transform[4] : 0;
        const xB = b.transform ? b.transform[4] : 0;

        if (Math.abs(yA - yB) > 3) {
          return yB - yA;
        }
        return xA - xB;
      });

      const lines = [];
      let currentLine = '';
      let lastY = null;

      for (const item of sortedItems) {
        if (!item.str && item.str !== '') continue;
        const y = item.transform ? item.transform[5] : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = item.str;
        } else {
          if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ') && item.str.length > 0) {
            currentLine += ' ' + item.str;
          } else {
            currentLine += item.str;
          }
        }
        lastY = y;
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const pageText = lines.join('\n');
      if (pageText.trim().length > 15) {
        textPagesCount++;
        totalCharacters += pageText.length;
        pagesData.push({
          pageNumber: pageNum,
          text: pageText.trim(),
          isEmpty: false
        });
      } else {
        emptyPagesCount++;
        pagesData.push({
          pageNumber: pageNum,
          text: pageText.trim(),
          isEmpty: true
        });
      }
    } catch (pageErr) {
      console.warn(`Lỗi đọc trang ${pageNum}:`, pageErr.message);
      pagesData.push({
        pageNumber: pageNum,
        text: `*(Lỗi đọc trang ${pageNum}: ${pageErr.message})*`,
        isEmpty: true
      });
    }
  }

  return {
    totalPages,
    textPagesCount,
    emptyPagesCount,
    totalCharacters,
    pages: pagesData
  };
}
