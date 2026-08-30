import { getDocumentProxy } from 'unpdf';
import { PDFDocument } from 'pdf-lib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
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

// ─── 2. Bộ Giải Mã & Chuẩn Hóa Font Scanner/OCR Tiếng Việt Toàn Diện ───
export function decodeVietnameseScannerOCR(text) {
  if (!text) return text;

  let str = text;

  // 1. Phục hồi các tiêu đề và quốc hiệu chuẩn
  str = str
    .replace(/(OY|UY|Uy|oY)\s*BAN\s*NHAN\s*DAN/gi, 'ỦY BAN NHÂN DÂN')
    .replace(/CONG\s*HOA\s*XA\s*HOI\s*CHU\s*NGH[iI1]A\s*VIET\s*NAM/gi, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')
    .replace(/D[Oo0]c\s*l[§a-z]P\s*-\s*T[Vu]\s*do\s*-\s*H[ae]nh\s*ph[iI1u]c/gi, 'Độc lập - Tự do - Hạnh phúc')
    .replace(/BAN\s*QUAN\s*L[VY]\s*D[UƯu][’']?O[’']?NG\s*SAT\s*D[OÔo0]\s*TH[!I1]/gi, 'BAN QUẢN LÝ ĐƯỜNG SẮT ĐÔ THỊ')
    .replace(/THANH\s*PH[OÔo06]\s*H[OÔo06]\s*CH[IÍi1]\s*MINH/gi, 'THÀNH PHỐ HỒ CHÍ MINH')
    .replace(/QUYET\s*DINH/gi, 'QUYẾT ĐỊNH')
    .replace(/THONG\s*BAO/gi, 'THÔNG BÁO')
    .replace(/TO\s*TRINH/gi, 'TỜ TRÌNH')
    .replace(/BAO\s*CAO/gi, 'BÁO CÁO')
    .replace(/BIEN\s*BAN/gi, 'BIÊN BẢN');

  // 2. Thay thế âm tiết, chức danh, cơ quan, thuật ngữ xây dựng bị lỗi font scanner
  const patterns = [
    // Điều & Chức danh
    [/Di[6êe8u]+(\s*\d+)?/gi, 'Điều$1'],
    [/Chanh\s*Van\s*ph[d6êo]ng/gi, 'Chánh Văn phòng'],
    [/oiam\s*d[6êe]c/gi, 'Giám đốc'],
    [/Ban\s*Hg\s*tang\s*k[p\?]\s*thu[§8t]t/gi, 'Ban Hạ tầng kỹ thuật'],
    [/Hg\s*tang/gi, 'Hạ tầng'],
    [/k[p\?]\s*thu[§8t]t/gi, 'kỹ thuật'],
    [/KP\s*thu[8t§]t/gi, 'kỹ thuật'],
    [/Tru[6êe]ng\s*ph[d6êo]ng/gi, 'Trưởng phòng'],
    [/Trudng\s*ph[6dêo]ng/gi, 'Trưởng phòng'],
    [/Tru[6êe]ng/gi, 'Trưởng'],
    [/Trudng/gi, 'Trưởng'],
    [/ph[6dêo]ng/gi, 'phòng'],
    [/K[6eé]\s*hogch/gi, 'Kế hoạch'],
    [/K[6eé]\s*ho[aạ]ch/gi, 'Kế hoạch'],
    [/Tai\s*chi\s*nh/gi, 'Tài chính'],
    [/K[6eé]\s*to[£a]n/gi, 'Kế toán'],
    [/Lanh\s*doo\s*Ban/gi, 'Lãnh đạo Ban'],
    [/Lanh\s*doo/gi, 'Lãnh đạo'],

    // Doanh nghiệp & Liên danh
    [/C[6êe]ng\s*ty\s*TNHH\s*Tu\s*van\s*thi&\s*k[gq]\s*B\.R/gi, 'Công ty TNHH Tư vấn thiết kế B.R'],
    [/Li[6êe]n\s*danh\s*C[6êe]ng\s*ty\s*C[6o]\s*phan\s*Tu\s*van\s*\(?[Il|1]au\s*tu\s*Giao\s*th[6êe]ng\s*v[8a]n\s*tai\s*-\s*Sai\s*Gan/gi, 'Liên danh Công ty Cổ phần Tư vấn Đầu tư Giao thông vận tải - Sài Gòn'],
    [/C[6êe]ng\s*ty\s*TNHH\s*Tu\s*van\s*C[6êe]ng\s*nghe\s*Xay\s*dvng\s*Quang\s*Minh/gi, 'Công ty TNHH Tư vấn Công nghệ Xây dựng Quang Minh'],
    [/Li[6êe]n\s*danh/gi, 'Liên danh'],
    [/C[6êe]ng\s*ty/gi, 'Công ty'],
    [/C[6o]\s*phan/gi, 'Cổ phần'],
    [/Tu\s*van/gi, 'Tư vấn'],
    [/thi&\s*k[gq]/gi, 'thiết kế'],
    [/\(?[Il|1]au\s*tu/gi, 'Đầu tư'],
    [/Giao\s*th[6êe]ng/gi, 'Giao thông'],
    [/th[6êe]ng/gi, 'thông'],
    [/v[8a]n\s*tai/gi, 'vận tải'],
    [/Sai\s*Gan/gi, 'Sài Gòn'],
    [/C[6êe]ng\s*nghe/gi, 'Công nghệ'],
    [/C[6êe]ng/gi, 'Công'],
    [/Xay\s*dvng/gi, 'Xây dựng'],
    [/Xay\s*dung/gi, 'Xây dựng'],

    // Trách nhiệm thi hành
    [/chju\s*tr[£a]ch\s*nhi[êe]m/gi, 'chịu trách nhiệm'],
    [/chju/gi, 'chịu'],
    [/tr[£a]ch\s*nhi[êe]m/gi, 'trách nhiệm'],
    [/tr[£a]ch/gi, 'trách'],
    [/thi\s*hanh\s*Quy[6eéê]t\s*d[jị]nh\s*nay[\.\/\s]*/gi, 'thi hành Quyết định này./.\n'],
    [/thi\s*hanh\s*Quy[6eéê]t\s*d[jị]nh\s*nay/gi, 'thi hành Quyết định này'],
    [/Quy[6eéê]t\s*d[jị]nh\s*nay[\.\/\s]*/gi, 'Quyết định này./.\n'],
    [/Quy[6eéê]t\s*d[jị]nh\s*nay/gi, 'Quyết định này'],
    [/thi\s*hanh/gi, 'thi hành'],
    [/Quy[6eéê]t\s*d[jị]nh/gi, 'Quyết định'],

    // Nơi nhận
    [/No['’]?i\s*nh[frn]+:\s*KT\.\s*TRU[’']?CJNG\s*BAN/gi, 'Nơi nhận: KT. TRƯỞNG BAN'],
    [/No['’]?i\s*nh[frn]+:?/gi, 'Nơi nhận:'],
    [/KT\.\s*TRU[’']?CJNG\s*BAN/gi, 'KT. TRƯỞNG BAN'],
    [/[Il1]tr[6e]['’]?NG\s*BAN/gi, 'TRƯỞNG BAN'],
    [/TRU[’']?CJNG\s*BAN/gi, 'TRƯỞNG BAN'],
    [/Nha\s*Di[8êe6u]+\s*(\d+)/gi, 'Như Điều $1'],
    [/Nha\s*Di[8êe6u]+/gi, 'Như Điều'],
    [/Nh[aư]\s*Di[8êe6u]+/gi, 'Như Điều'],
    [/Nha\s*Điều/gi, 'Như Điều'],
    [/Huy[6êe]n/gi, 'Huyên'],

    // Trách nhiệm tư vấn & phê duyệt
    [/tr[£a]ch\s*nhi[êe]m\s*c[uủ]a\s*cac\s*d[aơ]n\s*v[iị]\s*Tu\s*van\s*d[eé]i\s*v[aơ]i\s*n[êe]i\s*dung\s*h[dô]s?\s*so\s*d[aã]\s*thuc\s*hi[êe]n\s*va\s*trinh\s*ph[6eê]\s*duyet/gi, 'trách nhiệm của các đơn vị Tư vấn đối với nội dung hồ sơ đã thực hiện và trình phê duyệt'],
    [/d[eé]i\s*v[aơ]i/gi, 'đối với'],
    [/dẻi\s*vai/gi, 'đối với'],
    [/n[êe]i\s*dung/gi, 'nội dung'],
    [/h[dô]s?\s*so/gi, 'hồ sơ'],
    [/d[aã]\s*thuc\s*hi[êe]n/gi, 'đã thực hiện'],
    [/trinh\s*ph[6eê]\s*duyet/gi, 'trình phê duyệt'],
    [/ph[6eê]\s*duyet/gi, 'phê duyệt'],
    [/cac\s*d[aơ]n\s*v[iị]/gi, 'các đơn vị'],

    // Căn cứ pháp lý
    [/Can\s*ca/gi, 'Căn cứ'],
    [/Cim\s*ca/gi, 'Căn cứ'],
    [/Ngh\{\s*djnh\s*sa/gi, 'Nghị định số'],
    [/Ngh[iị]\{\s*d[iị]nh\s*s[oốa]/gi, 'Nghị định số'],
    [/Ngh[iị]\s*d[iị]nh\s*s[oốa]/gi, 'Nghị định số'],
    [/Th[êêe][nêe]ng\s*tu\s*sa/gi, 'Thông tư số'],
    [/Tttang\s*tu\s*sa/gi, 'Thông tư số'],
    [/Th[oô]ng\s*tu\s*sa/gi, 'Thông tư số'],
    [/caa\s*Chinh\s*ph\(?I\)?/gi, 'của Chính phủ'],
    [/Chinh\s*ph\(?I\)?/gi, 'Chính phủ'],
    [/caa\s*U\)'\s*ban\s*nhan\s*dan/gi, 'của Ủy ban nhân dân'],
    [/U\)'\s*ban\s*nhan\s*dan/gi, 'Ủy ban nhân dân'],
    [/caa\s*Ba\s*Xay\s*dtmg/gi, 'của Bộ Xây dựng'],
    [/caa\s*BQ\s*Xa\);\s*d\\mg/gi, 'của Bộ Xây dựng'],
    [/Ba\s*Xay\s*dtmg/gi, 'Bộ Xây dựng'],
    [/B§\s*N§i\s*VV/gi, 'Bộ Nội vụ'],
    [/BQ\s*X[aâ]y\s*d[uự]ng/gi, 'Bộ Xây dựng'],

    // Ngày tháng
    [/ngdy/gi, 'ngày'],
    [/ngay/gi, 'ngày'],
    [/nga\)\/[a-zA-Z0-9<>]+\b/gi, 'ngày'],
    [/thdng/gi, 'tháng'],
    [/ttlang/gi, 'tháng'],
    [/tIlang/gi, 'tháng'],
    [/tlang/gi, 'tháng'],
    [/nam\s*(\d{4})/gi, 'năm $1'],

    // Thuật ngữ xây dựng & đầu tư
    [/v&\s*quan\s*l[jif]\s*chi\s*phi/gi, 'về quản lý chi phí'],
    [/quan\s*l[jif]\s*chi\s*phi/gi, 'quản lý chi phí'],
    [/(daII\s*tu|aau\s*M|aau\s*tlr|dau\s*tu)\s*(xay\s*dLmg|xay\s*dtmg|xay\s*dImg|xay\s*dung)/gi, 'đầu tư xây dựng'],
    [/(daII\s*tu|aau\s*M|aau\s*tlr)/gi, 'đầu tư'],
    [/(xay\s*dLmg|xay\s*dtmg|xay\s*dImg)/gi, 'xây dựng'],
    [/hbr[êe]bg\s*dan/gi, 'hướng dẫn'],
    [/met\s*s[6o]/gi, 'một số'],
    [/xdc\s*djnh/gi, 'xác định'],
    [/duQC/gi, 'được'],
    [/(saa\s*d[eê]i|saa\s*dai),\s*(b[68]\s*sung|bo\s*sung)/gi, 'sửa đổi, bổ sung'],
    [/tqi\s*cdc\s*tll[eê]ng\s*tbc/gi, 'tại các thông tư'],
    [/gaIn:/gi, 'gồm:'],
    [/guy\s*djnh/gi, 'quy định'],
    [/quy\s*djnh/gi, 'quy định'],
    [/mac\s*IU/gi, 'mức lương'],

    // Dự án & Tuyến Bến Thành - Cần Giờ
    [/Tuy6n\s+dudng\s+sat\s+B6n\s+Thanh\s*-\s*Can\s+Gia/gi, 'Tuyến đường sắt Bến Thành - Cần Giờ'],
    [/Tuy6n\s+dudng\s+sat/gi, 'Tuyến đường sắt'],
    [/B6n\s+Thanh\s*-\s*Can\s+Gia/gi, 'Bến Thành - Cần Giờ'],
    [/Can\s+Gia/g, 'Cần Giờ'],
    [/Gi6'i\s+thi6u\s+(dlr\s+in|dw\s+in|du\s+in)/gi, 'Giới thiệu dự án'],
    [/Gi6'i\s+thi6u/gi, 'Giới thiệu'],
    [/Ten\s+(dw\s+in|dlr\s+in|du\s+in)/gi, 'Tên dự án'],
    [/Ten\s+dlr\s+in\s+thinh\s+phan/gi, 'Tên dự án thành phần'],
    [/B&i\s+thueyng,\s*hg\s*tr9[.,]?\s*tai\s+djnh\s+cu\s+ph\s+tlc\s+vv\s+dv\s+an/gi, 'Bồi thường, hỗ trợ, tái định cư phục vụ dự án'],
    [/B&i\s+thueyng/gi, 'Bồi thường'],
    [/hg\s*tr9/gi, 'hỗ trợ'],
    [/tai\s+djnh\s+cu/gi, 'tái định cư'],
    [/ph\s+tlc\s+vv\s+dv\s+an/gi, 'phục vụ dự án'],
    [/Nh6m\s+(dy\s+in|du\s+in|dw\s+in)/gi, 'Nhóm dự án'],
    [/nh6rn\s+A/gi, 'nhóm A'],
    [/nh6rn\s+B/gi, 'nhóm B'],
    [/c6ng\s+trinh\s+cap\s+dBe\s+biet/gi, 'công trình cấp đặc biệt'],
    [/c6ng\s+trinh/gi, 'công trình'],
    [/Chti\s+dau\s+tlr\s+(dw\s+in|du\s+in)/gi, 'Chủ đầu tư dự án'],
    [/Chti\s+dau\s+tlr/gi, 'Chủ đầu tư'],
    [/Dei\s+di[€eê]n\s+chi\s+dau\s+tlr/gi, 'Đại diện chủ đầu tư'],
    [/Dei\s+di[€eê]n/gi, 'Đại diện'],
    [/Ban\s+Quan\s+(IV|LY|Ly|ly|Lt)\s+Dudng\s+sat\s+d6\s+thi/gi, 'Ban Quản lý Đường sắt đô thị'],
    [/TRU’aNG\s+BAN\s+QUAN\s+L[tT]\s+DU['’]6['’]NG\s+SAT\s+d[oô]s?\s+th[iị]/gi, 'TRƯỞNG BAN QUẢN LÝ ĐƯỜNG SẮT ĐÔ THỊ'],
    [/Dudng\s+sat\s+d6\s+thi/gi, 'Đường sắt đô thị'],
    [/d6\s+thi/gi, 'đô thị'],
    [/Tang\s+mac\s+aau\s+tlr/gi, 'Tổng mức đầu tư'],
    [/tP\s+di\)ng/gi, 'tỷ đồng'],
    [/Thai\s+gian\s+thl\.rc\s+hien\s+(dw\s+in|du\s+in)/gi, 'Thời gian thực hiện dự án'],
    [/Thai\s+gian\s+thl\.rc\s+hien/gi, 'Thời gian thực hiện'],
    [/chuan\s+bi\s+\(iau\s+tu\s+va\s+thtrc\s+hien/gi, 'chuẩn bị đầu tư và thực hiện'],
    [/Quy6t\s+djnh\s+chap\s+thu\s+an\s+cha\s+huang\s+dhl\s+tu/gi, 'Quyết định chấp thuận chủ trương đầu tư'],
    [/chap\s+thu\s+an/gi, 'chấp thuận'],
    [/cha\s+huang\s+dhl\s+tu/gi, 'chủ trương đầu tư'],
    [/dang\s+thai\s+chip\s+thugn\s+nha\s+au\s+tu/gi, 'đồng thời chấp thuận nhà đầu tư'],
    [/Thanh\s+ph6\s+H6\s+Chi\s+Minh/gi, 'Thành phố Hồ Chí Minh'],
    [/TP\.\s*He\s*Chi\s+Minh/gi, 'TP. Hồ Chí Minh'],
    [/Dja\s+di6m\s+thlrc\s+hien/gi, 'Địa điểm thực hiện'],
    [/Ngu6n\s+van:\s*van\s+ngan\s+sach/gi, 'Nguồn vốn: vốn ngân sách'],
    [/Ngu6n\s+van/gi, 'Nguồn vốn'],
    [/van\s+ngan\s+sach/gi, 'vốn ngân sách'],
    [/ngan\s+sach\s+Thanh\s+pha/gi, 'ngân sách Thành phố'],
    [/Ha\s+sa\s+nhi[€e]m\s+VIr\s+vi\s+dv\s+to[£a]n/gi, 'Hồ sơ nhiệm vụ và dự toán'],
    [/Ha\s+sa\s+nhi[€e]m\s+vu/gi, 'Hồ sơ nhiệm vụ'],
    [/dv\s+to[£a]n/gi, 'dự toán'],
    [/G6i\s+th[iI1]u/gi, 'Gói thầu'],
    [/Tw\s+vin\s+do\s+vd,\s*l[§a]p\s+ban\s+da\s+vi\s+tri/gi, 'Tư vấn đo vẽ, lập bản đồ vị trí'],
    [/ph\s+Irc\s+VII\s+c6ng\s+tic\s+thu\s+hai\s+d[£a]t/gi, 'phục vụ công tác thu hồi đất'],
    [/giao\s+ranh\s+c[aá]m\s+m[oó]c\s+giai\s+ph[oó]ng\s+m[aặ]t\s+b[aà]ng/gi, 'giao ranh cắm mốc giải phóng mặt bằng'],
    [/giao\s+ranh\s+cim\s+mêc\s+gigi\s+phêng\s+mjt\s+bing/gi, 'giao ranh cắm mốc giải phóng mặt bằng'],
    [/(dw\s+in|dlr\s+in|dy\s+in)/gi, 'dự án'],
    [/dudng/gi, 'đường'],
    [/Tuy6n/g, 'Tuyến'],
    [/B6n/g, 'Bến'],
    [/nh6m/gi, 'nhóm'],
    [/Thanh\s+pha/gi, 'Thành phố']
  ];

  for (const [pat, rep] of patterns) {
    str = str.replace(pat, rep);
  }

  // 3. Quy tắc từ đơn & phụ âm/nguyên âm phổ biến
  str = str
    .replace(/\bcaa\b/g, 'của')
    .replace(/\bv&\b/g, 'và')
    .replace(/\bva\b(?=\s+[A-ZÀ-Ỹa-zà-ỹ])/g, 'và')
    .replace(/\bvi\b(?=\s+[A-ZÀ-Ỹa-zà-ỹ])/g, 'và')
    .replace(/\bsa\s+(\d+)/g, 'số $1')
    .replace(/\bs6:\b/g, 'Số:')
    .replace(/;;/g, ';')
    .replace(/(\b[a-zA-Z])6'([a-zA-Z]*\b)/g, '$1ới$2')
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

// ─── 5. OCR đa trang cho tệp PDF scan ảnh thuần túy bằng pdf-lib và Gemini ───
export async function ocrFullScannedPdfChunked(pdfBuffer, pagesPerChunk = 2) {
  const apiKeys = getGeminiApiKeys();
  let totalPages = 1;
  let srcDoc = null;

  try {
    srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    totalPages = srcDoc.getPageCount();
  } catch (loadErr) {
    console.warn('Lỗi đọc cấu trúc PDF scan bằng pdf-lib:', loadErr.message);
    return null;
  }

  if (apiKeys.length === 0) {
    return `*(Chưa cấu hình GEMINI_API_KEYS để thực hiện OCR cho tài liệu scan ${totalPages} trang)*`;
  }

  const chunkResults = [];

  for (let i = 0; i < totalPages; i += pagesPerChunk) {
    const startPage = i + 1;
    const endPage = Math.min(i + pagesPerChunk, totalPages);
    const label = `Trang ${startPage}-${endPage}/${totalPages}`;

    try {
      const subDoc = await PDFDocument.create();
      const pageIndices = [];
      for (let p = i; p < endPage; p++) {
        pageIndices.push(p);
      }

      const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
      for (const cp of copiedPages) {
        subDoc.addPage(cp);
      }

      const subPdfBytes = await subDoc.save();
      const subPdfBase64 = Buffer.from(subPdfBytes).toString('base64');

      const prompt = `Bạn là chuyên gia OCR tài liệu hồ sơ hành chính, công trình và pháp lý Việt Nam.
Tài liệu đính kèm là ảnh scan các trang từ ${startPage} đến ${endPage} (trong tổng số ${totalPages} trang).

NHIỆM VỤ:
1. Nhận diện CHÍNH XÁC 100% toàn văn tiếng Việt có dấu thanh đầy đủ từ ảnh scan.
2. Với mỗi trang, đánh dấu tiêu đề rõ ràng:
### 📄 Trang X/${totalPages}
(với X là số trang thực tế từ ${startPage} đến ${endPage}).
3. Giữ nguyên số hiệu, ngày tháng, các bảng biểu số liệu, chữ ký, nơi nhận.
4. Chỉ trả về nội dung Markdown thuần túy, KHÔNG thêm lời chào, KHÔNG bọc trong \`\`\`markdown.`;

      let chunkText = null;
      for (let k = 0; k < apiKeys.length && !chunkText; k++) {
        const key = apiKeys[(Math.floor(i / pagesPerChunk) + k) % apiKeys.length];
        const genAI = new GoogleGenerativeAI(key);

        for (const modelName of GEMINI_MODELS) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
            });

            const result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: subPdfBase64,
                  mimeType: 'application/pdf'
                }
              }
            ]);

            const resText = result.response.text();
            if (resText && resText.trim()) {
              chunkText = resText.replace(/^```[\s\S]*?\n/i, '').replace(/\n```\s*$/i, '').trim();
              break;
            }
          } catch (err) {
            console.warn(`[OCR ${label}] Lỗi model ${modelName}:`, err.message?.slice(0, 80));
            if (err.message?.includes('429') || err.message?.includes('Quota exceeded')) {
              throw new Error(`Google Gemini API đã vượt quá hạn mức miễn phí trong ngày (Mã lỗi 429 - Quota Exceeded tại ${label}). Vui lòng thêm Google API Key mới hoặc thử lại sau.`);
            }
          }
        }
      }

      if (chunkText) {
        chunkResults.push(chunkText);
      } else {
        throw new Error(`Không thể trích xuất văn bản từ ${label} do lỗi kết nối AI.`);
      }
    } catch (chunkErr) {
      console.warn(`[OCR ${label}] Lỗi xử lý:`, chunkErr.message);
      throw chunkErr;
    }
  }

  return chunkResults.join('\n\n---\n\n');
}
