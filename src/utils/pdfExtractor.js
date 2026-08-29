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

// ─── 2. Bộ Giải Mã & Chuẩn Hóa Font Scanner/OCR Tiếng Việt Chuyên Sâu ───
export function decodeVietnameseScannerOCR(text) {
  if (!text) return text;

  let str = text;

  // 1. Phục hồi các tiêu đề và quốc hiệu chuẩn
  str = str
    .replace(/\b(OY|UY|Uy|oY)\s*BAN\s*NHAN\s*DAN\b/gi, 'ỦY BAN NHÂN DÂN')
    .replace(/\bCONG\s*HOA\s*XA\s*HOI\s*CHU\s*NGH[iI1]A\s*VIET\s*NAM\b/gi, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')
    .replace(/\bD[Oo0]c\s*l[§a-z]P\s*-\s*T[Vu]\s*do\s*-\s*H[ae]nh\s*ph[iI1u]c\b/gi, 'Độc lập - Tự do - Hạnh phúc')
    .replace(/\bBAN\s*QUAN\s*L[VY]\s*D[UƯu][’']?O[’']?NG\s*SAT\s*D[OÔo0]\s*TH[!I1]\b/gi, 'BAN QUẢN LÝ ĐƯỜNG SẮT ĐÔ THỊ')
    .replace(/\bTHANH\s*PH[OÔo06]\s*H[OÔo06]\s*CH[IÍi1]\s*MINH\b/gi, 'THÀNH PHỐ HỒ CHÍ MINH')
    .replace(/\bQUYET\s*DINH\b/gi, 'QUYẾT ĐỊNH')
    .replace(/\bTHONG\s*BAO\b/gi, 'THÔNG BÁO')
    .replace(/\bTO\s*TRINH\b/gi, 'TỜ TRÌNH')
    .replace(/\bBAO\s*CAO\b/gi, 'BÁO CÁO')
    .replace(/\bBIEN\s*BAN\b/gi, 'BIÊN BẢN');

  // 2. Thay thế các từ vựng pháp lý & hành chính thường xuyên gặp lỗi glyph
  const directDict = [
    // Căn cứ pháp lý
    [/\bCan\s*ca\b/gi, 'Căn cứ'],
    [/\bCim\s*ca\b/gi, 'Căn cứ'],
    [/\bNgh\{\s*djnh\s*sa\b/gi, 'Nghị định số'],
    [/\bNgh[iị]\{\s*d[iị]nh\s*s[oốa]\b/gi, 'Nghị định số'],
    [/\bNgh[iị]\s*d[iị]nh\s*s[oốa]\b/gi, 'Nghị định số'],
    [/\bTh[êêe][nêe]ng\s*tu\s*sa\b/gi, 'Thông tư số'],
    [/\bTttang\s*tu\s*sa\b/gi, 'Thông tư số'],
    [/\bTh[oô]ng\s*tu\s*sa\b/gi, 'Thông tư số'],
    [/\bQuy[6eé]t\s*djnh\s*sa\b/gi, 'Quyết định số'],
    [/\bQuy[6eé]t\s*djnh\b/gi, 'Quyết định'],
    [/\bcaa\s*Chinh\s*ph\(?I\)?\b/gi, 'của Chính phủ'],
    [/\bChinh\s*ph\(?I\)?\b/gi, 'Chính phủ'],
    [/\bcaa\s*U\)'\s*ban\s*nhan\s*dan\b/gi, 'của Ủy ban nhân dân'],
    [/\bU\)'\s*ban\s*nhan\s*dan\b/gi, 'Ủy ban nhân dân'],
    [/\bcaa\s*Ba\s*Xay\s*dtmg\b/gi, 'của Bộ Xây dựng'],
    [/\bcaa\s*BQ\s*Xa\);\s*d\\mg\b/gi, 'của Bộ Xây dựng'],
    [/\bBa\s*Xay\s*dtmg\b/gi, 'Bộ Xây dựng'],
    [/\bB§\s*N§i\s*VV\b/gi, 'Bộ Nội vụ'],
    [/\bBQ\s*X[aâ]y\s*d[uự]ng\b/gi, 'Bộ Xây dựng'],
    
    // Ngày tháng năm
    [/\bngdy\b/gi, 'ngày'],
    [/\bngay\b/gi, 'ngày'],
    [/\bnga\)\/[a-zA-Z0-9<>]+\b/gi, 'ngày'],
    [/\bthdng\b/gi, 'tháng'],
    [/\bttlang\b/gi, 'tháng'],
    [/\btIlang\b/gi, 'tháng'],
    [/\btlang\b/gi, 'tháng'],
    [/\bnam\s*(\d{4})\b/gi, 'năm $1'],
    
    // Thuật ngữ xây dựng & đầu tư
    [/\bv&\s*quan\s*l[jif]\s*chi\s*phi\b/gi, 'về quản lý chi phí'],
    [/\bquan\s*l[jif]\s*chi\s*phi\b/gi, 'quản lý chi phí'],
    [/\b(daII\s*tu|aau\s*M|aau\s*tlr|dau\s*tu)\s*(xay\s*dLmg|xay\s*dtmg|xay\s*dImg|xay\s*dung)\b/gi, 'đầu tư xây dựng'],
    [/\b(daII\s*tu|aau\s*M|aau\s*tlr)\b/gi, 'đầu tư'],
    [/\b(xay\s*dLmg|xay\s*dtmg|xay\s*dImg)\b/gi, 'xây dựng'],
    [/\bhbr[êe]bg\s*dan\b/gi, 'hướng dẫn'],
    [/\bmet\s*s[6o]\b/gi, 'một số'],
    [/\bnOi\s*dung\b/gi, 'nội dung'],
    [/\bxdc\s*djnh\b/gi, 'xác định'],
    [/\bduQC\b/gi, 'được'],
    [/\b(saa\s*d[eê]i|saa\s*dai),\s*(b[68]\s*sung|bo\s*sung)\b/gi, 'sửa đổi, bổ sung'],
    [/\btqi\s*cdc\s*tll[eê]ng\s*tbc\b/gi, 'tại các thông tư'],
    [/\bgaIn:\b/gi, 'gồm:'],
    [/\bguy\s*djnh\b/gi, 'quy định'],
    [/\bquy\s*djnh\b/gi, 'quy định'],
    [/\bmac\s*IU\b/gi, 'mức lương'],
    
    // Dự án & Tuyến Bến Thành - Cần Giờ
    [/\bTuy6n\s+dudng\s+sat\s+B6n\s+Thanh\s*-\s*Can\s+Gia\b/gi, 'Tuyến đường sắt Bến Thành - Cần Giờ'],
    [/\bTuy6n\s+dudng\s+sat\b/gi, 'Tuyến đường sắt'],
    [/\bB6n\s+Thanh\s*-\s*Can\s+Gia\b/gi, 'Bến Thành - Cần Giờ'],
    [/\bCan\s+Gia\b/g, 'Cần Giờ'],
    [/\bGi6'i\s+thi6u\s+(dlr\s+in|dw\s+in|du\s+in)\b/gi, 'Giới thiệu dự án'],
    [/\bGi6'i\s+thi6u\b/gi, 'Giới thiệu'],
    [/\bTen\s+(dw\s+in|dlr\s+in|du\s+in)\b/gi, 'Tên dự án'],
    [/\bTen\s+dlr\s+in\s+thinh\s+phan\b/gi, 'Tên dự án thành phần'],
    [/\bB&i\s+thueyng,\s*hg\s*tr9[.,]?\s*tai\s+djnh\s+cu\s+ph\s+tlc\s+vv\s+dv\s+an\b/gi, 'Bồi thường, hỗ trợ, tái định cư phục vụ dự án'],
    [/\bB&i\s+thueyng\b/gi, 'Bồi thường'],
    [/\bhg\s*tr9\b/gi, 'hỗ trợ'],
    [/\btai\s+djnh\s+cu\b/gi, 'tái định cư'],
    [/\bph\s+tlc\s+vv\s+dv\s+an\b/gi, 'phục vụ dự án'],
    [/\bNh6m\s+(dy\s+in|du\s+in|dw\s+in)\b/gi, 'Nhóm dự án'],
    [/\bnh6rn\s+A\b/gi, 'nhóm A'],
    [/\bnh6rn\s+B\b/gi, 'nhóm B'],
    [/\bc6ng\s+trinh\s+cap\s+dBe\s+biet\b/gi, 'công trình cấp đặc biệt'],
    [/\bc6ng\s+trinh\b/gi, 'công trình'],
    [/\bChti\s+dau\s+tlr\s+(dw\s+in|du\s+in)\b/gi, 'Chủ đầu tư dự án'],
    [/\bChti\s+dau\s+tlr\b/gi, 'Chủ đầu tư'],
    [/\bDei\s+di[€eê]n\s+chi\s+dau\s+tlr\b/gi, 'Đại diện chủ đầu tư'],
    [/\bDei\s+di[€eê]n\b/gi, 'Đại diện'],
    [/\bBan\s+Quan\s+(IV|LY|Ly|ly|Lt)\s+Dudng\s+sat\s+d6\s+thi\b/gi, 'Ban Quản lý Đường sắt đô thị'],
    [/\bTRU’aNG\s+BAN\s+QUAN\s+L[tT]\s+DU['’]6['’]NG\s+SAT\s+d[oô]s?\s+th[iị]\b/gi, 'TRƯỞNG BAN QUẢN LÝ ĐƯỜNG SẮT ĐÔ THỊ'],
    [/\bDudng\s+sat\s+d6\s+thi\b/gi, 'Đường sắt đô thị'],
    [/\bd6\s+thi\b/gi, 'đô thị'],
    [/\bTang\s+mac\s+aau\s+tlr\b/gi, 'Tổng mức đầu tư'],
    [/\btP\s+di\)ng\b/gi, 'tỷ đồng'],
    [/\bThai\s+gian\s+thl\.rc\s+hien\s+(dw\s+in|du\s+in)\b/gi, 'Thời gian thực hiện dự án'],
    [/\bThai\s+gian\s+thl\.rc\s+hien\b/gi, 'Thời gian thực hiện'],
    [/\bchuan\s+bi\s+\(iau\s+tu\s+va\s+thtrc\s+hien\b/gi, 'chuẩn bị đầu tư và thực hiện'],
    [/\bQuy6t\s+djnh\s+chap\s+thu\s+an\s+cha\s+huang\s+dhl\s+tu\b/gi, 'Quyết định chấp thuận chủ trương đầu tư'],
    [/\bchap\s+thu\s+an\b/gi, 'chấp thuận'],
    [/\bcha\s+huang\s+dhl\s+tu\b/gi, 'chủ trương đầu tư'],
    [/\bdang\s+thai\s+chip\s+thugn\s+nha\s+au\s+tu\b/gi, 'đồng thời chấp thuận nhà đầu tư'],
    [/\bThanh\s+ph6\s+H6\s+Chi\s+Minh\b/gi, 'Thành phố Hồ Chí Minh'],
    [/\bTP\.\s*He\s*Chi\s+Minh\b/gi, 'TP. Hồ Chí Minh'],
    [/\bDja\s+di6m\s+thlrc\s+hien\b/gi, 'Địa điểm thực hiện'],
    [/\bNgu6n\s+van:\s*van\s+ngan\s+sach\b/gi, 'Nguồn vốn: vốn ngân sách'],
    [/\bNgu6n\s+van\b/gi, 'Nguồn vốn'],
    [/\bvan\s+ngan\s+sach\b/gi, 'vốn ngân sách'],
    [/\bngan\s+sach\s+Thanh\s+pha\b/gi, 'ngân sách Thành phố'],
    [/\bHa\s+sa\s+nhi[€e]m\s+VIr\s+vi\s+dv\s+to[£a]n\b/gi, 'Hồ sơ nhiệm vụ và dự toán'],
    [/\bHa\s+sa\s+nhi[€e]m\s+vu\b/gi, 'Hồ sơ nhiệm vụ'],
    [/\bdv\s+to[£a]n\b/gi, 'dự toán'],
    [/\bG6i\s+th[iI1]u\b/gi, 'Gói thầu'],
    [/\bTw\s+vin\s+do\s+vd,\s*l[§a]p\s+ban\s+da\s+vi\s+tri\b/gi, 'Tư vấn đo vẽ, lập bản đồ vị trí'],
    [/\bph\s+Irc\s+VII\s+c6ng\s+tic\s+thu\s+hai\s+d[£a]t\b/gi, 'phục vụ công tác thu hồi đất'],
    [/\bgiao\s+ranh\s+c[aá]m\s+m[oó]c\s+giai\s+ph[oó]ng\s+m[aặ]t\s+b[aà]ng\b/gi, 'giao ranh cắm mốc giải phóng mặt bằng'],
    [/\bgiao\s+ranh\s+cim\s+mêc\s+gigi\s+phêng\s+mjt\s+bing\b/gi, 'giao ranh cắm mốc giải phóng mặt bằng'],
    [/\b(dw\s+in|dlr\s+in|dy\s+in)\b/gi, 'dự án'],
    [/\bdudng\b/gi, 'đường'],
    [/\bTuy6n\b/g, 'Tuyến'],
    [/\bB6n\b/g, 'Bến'],
    [/\bc6ng\b/g, 'công'],
    [/\bnh6m\b/g, 'nhóm'],
    [/\bThanh\s+pha\b/gi, 'Thành phố']
  ];

  for (const [pat, rep] of directDict) {
    str = str.replace(pat, rep);
  }

  // 3. Quy tắc từ đơn & phụ âm/nguyên âm phổ biến
  str = str
    .replace(/\bcaa\b/g, 'của')
    .replace(/\bv&\b/g, 'và')
    .replace(/\bvi\b(?=\s+[a-zà-ỹ])/g, 'và')
    .replace(/\bsa\s+(\d+)/g, 'số $1')
    .replace(/\bs6:\b/g, 'Số:')
    .replace(/\b(\b[a-zA-Z])6'([a-zA-Z]*\b)/g, '$1ới$2')
    .replace(/([a-zA-Z])6([a-zA-Z]+)/g, '$1ê$2');

  return str;
}

export function normalizeVietnameseOCRText(text) {
  return decodeVietnameseScannerOCR(text);
}

export function heuristicRepairVietnamese(text) {
  return decodeVietnameseScannerOCR(text);
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
