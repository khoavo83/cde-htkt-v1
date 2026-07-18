import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Hàm quét đệ quy các file trong thư mục
function scanDirRecursive(dirPath, rootDir, fileList = []) {
  if (!fs.existsSync(dirPath)) return fileList;
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    // Chuẩn hóa đường dẫn dạng gạch chéo xuôi cho đồng bộ
    const normalizedPath = fullPath.replace(/\\/g, '/');
    const itemNameLower = item.name.toLowerCase();
    
    if (item.isDirectory()) {
      // Chỉ quét sâu vào các thư mục con
      scanDirRecursive(fullPath, rootDir, fileList);
    } else if (item.isFile()) {
      // Loại bỏ file tạm của Microsoft Office (bắt đầu bằng ~$) và các file hệ thống rác
      if (item.name.startsWith('~$') || 
          itemNameLower === 'desktop.ini' || 
          itemNameLower === 'thumbs.db' || 
          item.name.startsWith('.')) {
        continue;
      }
      
      try {
        const stat = fs.statSync(fullPath);
        fileList.push({
          name: item.name,
          fullPath: normalizedPath,
          relativePath: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
          parentDirName: path.basename(dirPath),
          sizeBytes: stat.size,
          mtime: stat.mtime
        });
      } catch (err) {
        console.error(`Không thể đọc thông tin file: ${fullPath}`, err);
      }
    }
  }
  return fileList;
}

// Bộ phân tích tên file thông minh trích xuất thông tin tài liệu
function parseFileName(name, parentDirName) {
  let docDate = null;
  let docType = "Công văn";
  let issuingAgency = "Đang cập nhật";
  let receivingAgency = null;
  let summary = name.replace(/\.[^/.]+$/, ""); // Loại bỏ phần mở rộng file

  // Helper kiểm tra ngày hợp lệ trên thực tế
  const isValidDate = (dateStr) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (year < 1990 || year > 2040) return false; // Giới hạn năm dự án thực tế
    if (month < 1 || month > 12) return false;
    const monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
    if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) monthLength[1] = 29;
    return day > 0 && day <= monthLength[month - 1];
  };

  // 1. Tìm ngày phát hành (YYYY-MM-DD hoặc DD-MM-YYYY hoặc YYYY_MM_DD hoặc YYYYMMDD)
  const dateMatch = name.match(/(\d{4})[-_](\d{2})[-_](\d{2})|(\d{2})[-_](\d{2})[-_](\d{4})/);
  const rawDateMatch = name.match(/(202\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  
  if (dateMatch) {
    let testDate = null;
    if (dateMatch[1]) {
      // Dạng YYYY-MM-DD
      testDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      // Dạng DD-MM-YYYY -> YYYY-MM-DD
      testDate = `${dateMatch[6]}-${dateMatch[5]}-${dateMatch[4]}`;
    }
    if (isValidDate(testDate)) {
      docDate = testDate;
    }
  }
  
  if (!docDate && rawDateMatch) {
    // Dạng YYYYMMDD liền nhau (ví dụ: 20260106)
    const testDate = `${rawDateMatch[1]}-${rawDateMatch[2]}-${rawDateMatch[3]}`;
    if (isValidDate(testDate)) {
      docDate = testDate;
    }
  }

  // 2. Nhận diện loại văn bản dựa trên từ khóa trong tên file
  const lowerName = name.toLowerCase();
  if (name.includes("QĐ") || lowerName.includes("quyet dinh") || lowerName.includes("quyết định")) docType = "Quyết định";
  else if (name.includes("TB") || lowerName.includes("thong bao") || lowerName.includes("thông báo")) docType = "Thông báo";
  else if (name.includes("TTr") || lowerName.includes("to trinh") || lowerName.includes("tờ trình")) docType = "Tờ trình";
  else if (name.includes("GM") || lowerName.includes("giay moi") || lowerName.includes("giấy mời")) docType = "Giấy mời";
  else if (name.includes("BC") || lowerName.includes("bao cao") || lowerName.includes("báo cáo")) docType = "Báo cáo";
  else if (name.includes("KHLCNT")) docType = "Kế hoạch lựa chọn nhà thầu";
  else if (lowerName.includes("lich hop") || lowerName.includes("lịch họp")) docType = "Lịch họp";
  else if (lowerName.includes("hop dong") || lowerName.includes("hợp đồng")) docType = "Hợp đồng";

  // 3. Phân tích trích yếu, cơ quan ban hành, nơi nhận
  let cleanName = name.replace(/\.[^/.]+$/, ""); // bỏ đuôi file
  if (dateMatch) {
    cleanName = cleanName.replace(dateMatch[0], "").trim();
  }
  // Loại bỏ các ký tự gạch dưới, gạch ngang thừa ở đầu
  cleanName = cleanName.replace(/^[-_]+/, "").trim();

  // Nhận diện nơi gửi (issuing_agency) và nơi nhận (receiving_agency) qua từ khóa "_gui_"
  const guiMatch = cleanName.match(/(.+)_gui_(.+)/i) || cleanName.match(/(.+)_gui\s+(.+)/i);
  if (guiMatch) {
    const senderPart = guiMatch[1].replace(/^[-_]+|[-_]+$/g, "").trim();
    const receiverPart = guiMatch[2].replace(/^[-_]+|[-_]+$/g, "").trim();
    
    // Tách số hiệu và cơ quan ban hành ở phần sender
    const senderTokens = senderPart.split(/[-_]/);
    if (senderTokens.length > 1) {
      issuingAgency = senderTokens[senderTokens.length - 1].toUpperCase();
    } else {
      issuingAgency = senderPart.toUpperCase();
    }
    
    receivingAgency = receiverPart.split(/[-_]/)[0].trim();
    summary = receiverPart;
  } else {
    // Không có chữ "gui", thử phân tích theo dấu gạch ngang/gạch dưới
    const tokens = cleanName.split(/[-_]/);
    if (tokens.length > 1) {
      const agencies = ["BQLĐSĐT", "SNN", "SNNMT", "VPĐK", "UBND", "PMH", "TCT", "TDNS", "LĐ239", "LĐ299"];
      for (let token of tokens) {
        token = token.trim().toUpperCase();
        if (agencies.includes(token) || token.match(/^[A-ZĐƯĂÂÔƠ]{3,6}$/)) {
          issuingAgency = token;
          break;
        }
      }
    }
    summary = cleanName;
  }

  // Chuẩn hóa tên viết tắt các cơ quan ban hành phổ biến
  if (issuingAgency === "SNN" || issuingAgency === "SNNMT") issuingAgency = "Sở Nông nghiệp & PTNT";
  else if (issuingAgency === "VPĐK" || issuingAgency === "ĐKĐĐ") issuingAgency = "Văn phòng Đăng ký Đất đai";
  else if (issuingAgency === "BQLĐSĐT") issuingAgency = "Ban Quản lý Đường sắt Đô thị";
  else if (issuingAgency === "PMH") issuingAgency = "Công ty TNHH Phát triển Phú Mỹ Hưng";
  else if (issuingAgency === "UBND") {
    if (lowerName.includes("hcm") || lowerName.includes("tp")) issuingAgency = "UBND Thành phố";
    else issuingAgency = "UBND Quận 7";
  }

  // Chuẩn hóa nơi nhận
  if (receivingAgency) {
    receivingAgency = receivingAgency.trim();
    const upperRec = receivingAgency.toUpperCase();
    if (upperRec === "BQLĐSĐT") receivingAgency = "Ban Quản lý Đường sắt Đô thị";
    else if (upperRec.includes("LĐ239") || upperRec.includes("LU DOAN 239")) receivingAgency = "Lữ đoàn 239";
    else if (upperRec.includes("LĐ299") || upperRec.includes("LU DOAN 299")) receivingAgency = "Lữ đoàn 299";
    else if (upperRec.includes("LUNG LO")) receivingAgency = "Tổng Công ty Lũng Lô";
  }

  return {
    docType,
    docDate,
    issuingAgency,
    receivingAgency,
    summary: summary.replace(/[-_]+/g, " ").trim()
  };
}

// Phân loại danh mục dự án dựa theo tên thư mục cha
function getCategoryFromFolder(folderName) {
  let category = "Khác";
  if (folderName.includes("Quy hoạch")) category = "Quy hoạch";
  else if (folderName.includes("Sở NNMT") || folderName.includes("Sở NN")) category = "Sở ngành";
  else if (folderName.includes("ĐKĐĐ") || folderName.includes("Địa chính") || folderName.includes("Đất đai")) category = "Đất đai";
  else if (folderName.includes("bom mìn") || folderName.includes("RPBM") || folderName.includes("Lũng Lô") || folderName.includes("Thành An") || folderName.includes("Lữ đoàn")) category = "Rà phá bom mìn";
  else if (folderName.includes("Phú Mỹ Hưng") || folderName.includes("PMH")) category = "Phú Mỹ Hưng";
  else if (folderName.includes("Di dời HTKT") || folderName.includes("HTKT") || folderName.includes("cây xanh") || folderName.includes("chiếu sáng")) category = "Hạ tầng kỹ thuật";
  else if (folderName.includes("Bồi thường") || folderName.includes("GPMB") || folderName.includes("BTGPMB") || folderName.includes("BT-CG")) category = "Bồi thường";
  return category;
}

export async function POST() {
  try {
    const drivePath = process.env.LOCAL_DRIVE_PATH || "H:\\My Drive\\Bồi thường BT-CG";
    console.log(`Đang tiến hành đồng bộ tài liệu từ đường dẫn cục bộ: ${drivePath}`);

    if (!fs.existsSync(drivePath)) {
      return NextResponse.json({ 
        success: false, 
        error: `Không tìm thấy thư mục đồng bộ Google Drive tại '${drivePath}'. Vui lòng gắn ổ H: hoặc cấu hình lại biến LOCAL_DRIVE_PATH trong tệp .env.local.` 
      }, { status: 400 });
    }

    // 1. Quét đệ quy tất cả các file từ thư mục ổ H:
    const files = scanDirRecursive(drivePath, drivePath);
    console.log(`Đã quét được ${files.length} tệp tin.`);

    // 2. Phân tích thông tin cho từng file
    const documentsToSync = files.map(file => {
      const parsedInfo = parseFileName(file.name, file.parentDirName);
      const category = getCategoryFromFolder(file.parentDirName);
      const sizeMB = file.sizeBytes ? `${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "N/A";
      
      return {
        fileName: file.name,
        filePath: file.fullPath,
        documentType: parsedInfo.docType,
        documentDate: parsedInfo.docDate,
        issuingAgency: parsedInfo.issuingAgency,
        receivingAgency: parsedInfo.receivingAgency,
        summary: parsedInfo.summary,
        category: category,
        fileSize: sizeMB,
        updatedAt: file.mtime
      };
    });

    // 3. Đồng bộ vào Supabase (nếu biến DATABASE_URL được cấu hình)
    let syncToSupabaseSuccess = false;
    let syncedCount = 0;
    let dbErrorMessage = null;

    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_PASSWORD]")) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Supabase yêu cầu kết nối bảo mật SSL
      });

      try {
        const client = await pool.connect();
        
        try {
          // Thực hiện transaction đồng bộ hàng loạt
          await client.query('BEGIN');
          
          for (const doc of documentsToSync) {
            const query = `
              INSERT INTO documents (
                file_name, file_path, document_type, document_date, 
                issuing_agency, receiving_agency, summary, category, file_size, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (file_path) 
              DO UPDATE SET 
                file_name = EXCLUDED.file_name,
                document_type = EXCLUDED.document_type,
                document_date = EXCLUDED.document_date,
                issuing_agency = EXCLUDED.issuing_agency,
                receiving_agency = EXCLUDED.receiving_agency,
                summary = EXCLUDED.summary,
                category = EXCLUDED.category,
                file_size = EXCLUDED.file_size,
                updated_at = EXCLUDED.updated_at
            `;
            
            await client.query(query, [
              doc.fileName,
              doc.filePath,
              doc.documentType,
              doc.documentDate,
              doc.issuingAgency,
              doc.receivingAgency,
              doc.summary,
              doc.category,
              doc.fileSize,
              doc.updatedAt
            ]);
            syncedCount++;
          }
          
          await client.query('COMMIT');
          syncToSupabaseSuccess = true;
          console.log(`Đồng bộ thành công ${syncedCount} tài liệu lên Supabase.`);
        } catch (txError) {
          await client.query('ROLLBACK');
          throw txError;
        } finally {
          client.release();
        }
      } catch (dbError) {
        dbErrorMessage = dbError.message;
        console.error("Lỗi kết nối cơ sở dữ liệu Supabase:", dbError);
      } finally {
        await pool.end();
      }
    } else {
      dbErrorMessage = "Chưa cấu hình DATABASE_URL hợp lệ trong tệp .env.local.";
      console.log("DATABASE_URL chưa được cấu hình. Bỏ qua ghi vào Supabase.");
    }

    // 4. Cơ chế Fallback: Ghi dữ liệu đồng bộ vào db.json cục bộ
    // Điều này đảm bảo ứng dụng vẫn hoạt động bình thường ngay cả khi không có kết nối Supabase
    try {
      const dbPath = path.join(process.cwd(), 'src', 'data', 'db.json');
      let dbData = { plots: [], tasks: [], documents: [] };
      
      if (fs.existsSync(dbPath)) {
        dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      }

      // Format dữ liệu sang cấu trúc hiển thị ở Frontend
      const formattedDocs = documentsToSync.map((doc, idx) => ({
        id: `file-sync-${idx + 1}`,
        name: doc.fileName,
        path: doc.filePath,
        folder: doc.category,
        category: doc.category,
        documentType: doc.documentType,
        documentDate: doc.documentDate,
        issuingAgency: doc.issuingAgency,
        receivingAgency: doc.receivingAgency,
        summary: doc.summary,
        size: doc.fileSize,
        updatedAt: doc.updatedAt
      }));

      dbData.documents = formattedDocs;
      
      // Tạo thư mục cha nếu chưa tồn tại
      const parentDir = path.dirname(dbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf-8');
      console.log("Đã lưu dữ liệu đồng bộ vào tệp db.json cục bộ.");
    } catch (fsError) {
      console.error("Lỗi khi ghi dữ liệu vào tệp db.json:", fsError);
    }

    return NextResponse.json({
      success: true,
      scannedCount: files.length,
      syncedToSupabase: syncToSupabaseSuccess,
      syncedCount: syncedCount,
      databaseStatus: syncToSupabaseSuccess ? "Connected" : `Offline (${dbErrorMessage})`,
      message: syncToSupabaseSuccess 
        ? `Đã quét và đồng bộ thành công ${syncedCount} tài liệu lên Supabase.`
        : `Đã quét ${files.length} tài liệu từ ổ H: và cập nhật cơ sở dữ liệu cục bộ db.json (Supabase Offline).`
    });

  } catch (error) {
    console.error("Lỗi nghiêm trọng trong quá trình đồng bộ:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
