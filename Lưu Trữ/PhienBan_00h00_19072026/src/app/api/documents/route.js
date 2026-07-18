import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const FOLDER_ID = "1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2";

const getDbPath = () => path.join(process.cwd(), 'src', 'data', 'db.json');

function readDb() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { plots: [], tasks: [], documents: [] };
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Phân tích thông tin chi tiết từ tên văn bản (cải tiến)
function parseDocDetails(fileName, folder, category) {
  // ── Trích xuất ngày ban hành ──
  const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  const altDateMatch = fileName.match(/(\d{1,2})(\d{2})(\d{4})/);
  let issuedDate = new Date().toISOString().split('T')[0];
  
  if (dateMatch) {
    issuedDate = dateMatch[1];
  } else if (altDateMatch) {
    const [, d, m, y] = altDateMatch;
    if (parseInt(m) <= 12 && parseInt(d) <= 31) {
      issuedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // ── Trích xuất số hiệu văn bản (cải tiến nhiều pattern) ──
  let documentNumber = "Đang cập nhật";
  
  // Pattern 1: YYYY-MM-DD_SốHiệu_KýHiệu_MôTả
  const numP1 = fileName.match(/^\d{4}-\d{2}-\d{2}_([^_]+)_([A-ZĐa-zđ\-\.]+(?:-[A-ZĐa-zđ]+)*)_/);
  if (numP1) {
    documentNumber = `${numP1[1]}/${numP1[2]}`;
  } else {
    // Pattern 2: Số liên tiếp ở đầu (sau date)
    const numP2 = fileName.match(/^\d{4}-\d{2}-\d{2}_(\d{2,6})_/);
    if (numP2) {
      const orgMatch = fileName.match(new RegExp(`${numP2[1]}_([A-ZĐÀ-Ỹa-zđà-ỹ\\-\\.]+)_`));
      if (orgMatch) {
        documentNumber = `${numP2[1]}/${orgMatch[1]}`;
      } else {
        documentNumber = numP2[1];
      }
    } else {
      // Pattern 3: Số có trong tên file (VD: 20696-Phụ lục)
      const numP3 = fileName.match(/^(\d{3,6})-/);
      if (numP3) {
        documentNumber = numP3[1];
      } else {
        // Pattern 4: PTr (phiếu trình - không có số)
        const ptrMatch = fileName.match(/_(PTr[^_]*)/);
        if (ptrMatch) {
          documentNumber = ptrMatch[1];
        }
      }
    }
  }

  // ── Phân tích cơ quan ban hành — ƯU TIÊN dựa vào thư mục cha ──
  let issuer = "Ban Quản lý Đường sắt Đô thị TP.HCM";
  
  const folderIssuerMap = {
    'Sở NNMT': 'Sở Nông nghiệp & Phát triển Nông thôn TP.HCM',
    'Văn phòng ĐKĐĐ TP': 'Văn phòng Đăng ký Đất đai TP.HCM',
    'Lữ đoàn 239 - Binh chủng Công binh': 'Lữ đoàn Công binh 239 - Binh chủng Công binh',
    'Tổng Công ty Xây dựng Lũng Lô': 'Tổng Công ty Xây dựng Lũng Lô - Bộ Quốc phòng',
    'Tổng Công ty Thành An - Binh đoàn 11': 'Tổng Công ty Thành An - Binh đoàn 11',
    'Trung tâm xử lý bom mìn': 'Trung tâm Xử lý Bom mìn Quốc gia',
    'Lữ đoàn 299 -Quân đoàn 12': 'Lữ đoàn Công binh 299 - Quân đoàn 12',
    'Công ty TNHH Phát triển Phú Mỹ Hưng': 'Công ty TNHH Phát triển Phú Mỹ Hưng',
    'Xí nghiệp TDNS': 'Xí nghiệp Truyền dẫn Nước sạch',
  };

  if (folderIssuerMap[folder]) {
    issuer = folderIssuerMap[folder];
  } else {
    const upperName = fileName.toUpperCase();
    if (upperName.includes("VPĐK") || upperName.includes("VĂN PHÒNG ĐĂNG KÝ")) {
      issuer = "Văn phòng Đăng ký Đất đai TP.HCM";
    } else if (upperName.includes("BQLĐSĐT")) {
      issuer = "Ban Quản lý Đường sắt Đô thị TP.HCM";
    } else if (upperName.includes("SNN") || upperName.includes("SỞ NN")) {
      issuer = "Sở Nông nghiệp & Phát triển Nông thôn TP.HCM";
    } else if (upperName.includes("PMH") || upperName.includes("PHÚ MỸ HƯNG")) {
      issuer = "Công ty TNHH Phát triển Phú Mỹ Hưng";
    } else if (upperName.includes("LŨNG LÔ") || upperName.includes("LUNGLO")) {
      issuer = "Tổng Công ty Xây dựng Lũng Lô - Bộ Quốc phòng";
    } else if (upperName.includes("THÀNH AN") || upperName.includes("THANHAN")) {
      issuer = "Tổng Công ty Thành An - Binh đoàn 11";
    } else if (upperName.includes("LỮ ĐOÀN 239") || upperName.includes("LD 239")) {
      issuer = "Lữ đoàn Công binh 239 - Binh chủng Công binh";
    } else if (upperName.includes("LỮ ĐOÀN 299") || upperName.includes("LD 299")) {
      issuer = "Lữ đoàn Công binh 299 - Quân đoàn 12";
    } else if (upperName.includes("UBND")) {
      if (upperName.includes("Q7") || upperName.includes("QUẬN 7")) {
        issuer = "UBND Quận 7, TP.HCM";
      } else {
        issuer = "UBND TP.HCM";
      }
    } else if (upperName.includes("TBMNT") || upperName.includes("TBMMT")) {
      issuer = "Trung tâm Xử lý Bom mìn Quốc gia";
    } else if (upperName.includes("TCT-KTKT")) {
      issuer = "Tổng Công ty - Phòng Kỹ thuật Kinh tế";
    } else if (upperName.includes("CN1")) {
      issuer = "Chi nhánh Văn phòng Đăng ký Đất đai - CN1";
    } else if (upperName.includes("TDNS")) {
      issuer = "Xí nghiệp Truyền dẫn Nước sạch";
    }
  }

  // ── Trích yếu / Ghi chú (cải tiến) ──
  let notes = fileName;
  const cleanName = fileName
    .replace(/^\d{4}-\d{2}-\d{2}_/, '')
    .replace(/\.[^/.]+$/, "")
    .replace(/\.signed/g, '');
    
  const parts = cleanName.split('_');
  if (parts.length > 2) {
    notes = parts.slice(2).join(' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  } else if (parts.length > 1) {
    notes = parts.slice(1).join(' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    notes = cleanName.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
  notes = notes.charAt(0).toUpperCase() + notes.slice(1);

  // Tạo drive URL tượng trưng
  const driveUrl = `https://drive.google.com/open?id=1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2`;

  return {
    documentNumber,
    issuedDate,
    issuer,
    notes,
    driveUrl
  };
}

// Đọc cấu trúc từ folder_structure_report.txt (fallback)
function parseReportFile() {
  const filePath = path.join(process.cwd(), 'folder_structure_report.txt');
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const filesList = [];
  let currentFolder = "Gốc";

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('├── 📂') || line.startsWith('└── 📂') || line.includes('📂')) {
      const match = line.match(/📂\s*([^(]+)/);
      if (match) {
        currentFolder = match[1].trim();
      }
    } else if (line.startsWith('├── 📄') || line.startsWith('└── 📄') || line.includes('📄')) {
      const match = line.match(/📄\s*(.+)$/);
      if (match) {
        const fileName = match[1].trim();
        let category = "Khác";
        if (currentFolder.includes("Quy hoạch")) category = "Quy hoạch";
        else if (currentFolder.includes("Sở NNMT") || currentFolder.includes("Sở NN")) category = "Sở ngành";
        else if (currentFolder.includes("ĐKĐĐ") || currentFolder.includes("Địa chính")) category = "Đất đai";
        else if (currentFolder.includes("bom mìn") || currentFolder.includes("RPBM") || currentFolder.includes("Lũng Lô") || currentFolder.includes("Thành An") || currentFolder.includes("Lữ đoàn")) category = "Rà phá bom mìn";
        else if (currentFolder.includes("Phú Mỹ Hưng") || currentFolder.includes("PMH")) category = "Phú Mỹ Hưng";

        const details = parseDocDetails(fileName, currentFolder, category);

        filesList.push({
          id: `doc-${filesList.length + 1}`,
          name: fileName,
          folder: currentFolder,
          category: category,
          updatedAt: "2026-04-20T10:00:00Z",
          size: "1.5 MB",
          status: "effective", // effective, pending, expired, draft
          plots: [], // Sẽ được điền sau dựa trên liên kết thửa đất
          ...details
        });
      }
    }
  }

  return filesList;
}

export async function GET() {
  try {
    const data = readDb();
    
    // Nếu trong db.json đã có danh sách documents, trả về trực tiếp
    if (data.documents && data.documents.length > 0) {
      return NextResponse.json({ source: 'database', documents: data.documents });
    }

    // Nếu chưa có, tiến hành seeding dữ liệu ban đầu
    let initialDocs = [];
    let source = 'local_report_file';

    const tokenPath = path.join(process.cwd(), 'token.json');
    const credentialsPath = path.join(process.cwd(), 'credentials.json');

    // Thử kết nối Google Drive API trước
    if (fs.existsSync(tokenPath) && fs.existsSync(credentialsPath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris ? redirect_uris[0] : "http://localhost");
        oAuth2Client.setCredentials(token);

        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        
        const response = await drive.files.list({
          q: `'${FOLDER_ID}' in parents or (mimeType = 'application/vnd.google-apps.folder' and trashed = false)`,
          fields: 'files(id, name, mimeType, modifiedTime, size, parents)',
          pageSize: 200,
        });

        const items = response.data.files || [];
        const foldersMap = {};
        
        items.forEach(item => {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            foldersMap[item.id] = item.name;
          }
        });

        initialDocs = items
          .filter(item => item.mimeType !== 'application/vnd.google-apps.folder')
          .map((item, index) => {
            const parentId = item.parents ? item.parents[0] : null;
            const parentName = foldersMap[parentId] || "Bồi thường BT-CG";
            
            let category = "Khác";
            if (parentName.includes("Quy hoạch")) category = "Quy hoạch";
            else if (parentName.includes("Sở NNMT") || parentName.includes("Sở NN")) category = "Sở ngành";
            else if (parentName.includes("ĐKĐĐ") || parentName.includes("Địa chính")) category = "Đất đai";
            else if (parentName.includes("bom mìn") || parentName.includes("RPBM") || parentName.includes("Lũng Lô") || parentName.includes("Thành An") || parentName.includes("Lữ đoàn")) category = "Rà phá bom mìn";
            else if (parentName.includes("Phú Mỹ Hưng") || parentName.includes("PMH")) category = "Phú Mỹ Hưng";

            const details = parseDocDetails(item.name, parentName, category);

            return {
              id: item.id,
              name: item.name,
              folder: parentName,
              category: category,
              updatedAt: item.modifiedTime,
              size: item.size ? `${(parseInt(item.size) / 1024 / 1024).toFixed(2)} MB` : "N/A",
              status: "effective",
              plots: [],
              ...details
            };
          });

        source = 'live_google_drive';
      } catch (driveError) {
        console.error("Lỗi Google Drive API, chuyển sang dùng báo cáo nội bộ:", driveError);
      }
    }

    // Nếu không kết nối được Google Drive hoặc không có file, dùng báo cáo nội bộ
    if (initialDocs.length === 0) {
      initialDocs = parseReportFile();
    }

    // Thực hiện liên kết hai chiều từ dữ liệu mẫu của thửa đất sang văn bản
    if (data.plots && data.plots.length > 0) {
      data.plots.forEach(plot => {
        if (plot.documents && plot.documents.length > 0) {
          plot.documents.forEach(plotDocName => {
            // Tìm văn bản tương ứng có tên gần giống hoặc chứa tên trong mảng documents của plot
            const matchedDoc = initialDocs.find(doc => 
              doc.name === plotDocName || 
              doc.name.includes(plotDocName) || 
              plotDocName.includes(doc.name)
            );
            if (matchedDoc) {
              if (!matchedDoc.plots.includes(plot.code)) {
                matchedDoc.plots.push(plot.code);
              }
            }
          });
        }
      });
    }

    // Ghi danh sách văn bản ban đầu vào db.json để lưu trữ lâu dài
    data.documents = initialDocs;
    writeDb(data);

    return NextResponse.json({ source, documents: initialDocs });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { action, document: docPayload } = payload;
    const data = readDb();
    
    if (!data.documents) {
      data.documents = [];
    }

    if (action === 'delete') {
      const docId = payload.id;
      const docIndex = data.documents.findIndex(d => d.id === docId);
      if (docIndex === -1) {
        return NextResponse.json({ error: "Không tìm thấy văn bản để xóa" }, { status: 404 });
      }

      const deletedDoc = data.documents[docIndex];
      
      // Xóa văn bản khỏi cơ sở dữ liệu
      data.documents.splice(docIndex, 1);

      // Gỡ liên kết văn bản này khỏi toàn bộ thửa đất (plots)
      if (data.plots) {
        data.plots = data.plots.map(plot => {
          if (plot.documents && plot.documents.includes(deletedDoc.name)) {
            return {
              ...plot,
              documents: plot.documents.filter(name => name !== deletedDoc.name)
            };
          }
          return plot;
        });
      }

      writeDb(data);
      return NextResponse.json({ success: true, message: "Đã xóa văn bản thành công" });
    }

    if (action === 'create') {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: docPayload.name,
        documentNumber: docPayload.documentNumber || "Đang cập nhật",
        issuedDate: docPayload.issuedDate || new Date().toISOString().split('T')[0],
        issuer: docPayload.issuer || "Ban Quản lý Đường sắt Đô thị",
        category: docPayload.category || "Khác",
        folder: docPayload.folder || "Bồi thường BT-CG",
        status: docPayload.status || "effective",
        updatedAt: new Date().toISOString(),
        size: docPayload.size || "1.0 MB",
        notes: docPayload.notes || "",
        plots: docPayload.plots || [],
        driveUrl: docPayload.driveUrl || "https://drive.google.com"
      };

      data.documents.push(newDoc);

      // Cập nhật liên kết hai chiều với thửa đất
      if (newDoc.plots && newDoc.plots.length > 0) {
        data.plots = data.plots.map(plot => {
          if (newDoc.plots.includes(plot.code)) {
            const docList = plot.documents ? [...plot.documents] : [];
            if (!docList.includes(newDoc.name)) {
              docList.push(newDoc.name);
            }
            return { ...plot, documents: docList };
          }
          return plot;
        });
      }

      writeDb(data);
      return NextResponse.json({ success: true, document: newDoc });
    }

    if (action === 'update') {
      const docIndex = data.documents.findIndex(d => d.id === docPayload.id);
      if (docIndex === -1) {
        return NextResponse.json({ error: "Không tìm thấy văn bản để cập nhật" }, { status: 404 });
      }

      const oldDoc = data.documents[docIndex];
      const updatedDoc = {
        ...oldDoc,
        ...docPayload,
        updatedAt: new Date().toISOString()
      };

      data.documents[docIndex] = updatedDoc;

      // Cập nhật liên kết thửa đất hai chiều
      // 1. Gỡ liên kết văn bản này khỏi các thửa đất cũ không còn nằm trong danh sách liên kết mới
      const oldPlots = oldDoc.plots || [];
      const newPlots = updatedDoc.plots || [];
      
      const removedPlots = oldPlots.filter(p => !newPlots.includes(p));
      const addedPlots = newPlots.filter(p => !oldPlots.includes(p));

      data.plots = data.plots.map(plot => {
        let docList = plot.documents ? [...plot.documents] : [];
        
        // Nếu thửa đất bị gỡ liên kết hoặc tên văn bản thay đổi
        if (removedPlots.includes(plot.code) || oldDoc.name !== updatedDoc.name) {
          docList = docList.filter(name => name !== oldDoc.name);
        }
        
        // Nếu thửa đất được thêm liên kết mới hoặc cập nhật tên văn bản
        if (addedPlots.includes(plot.code) || (newPlots.includes(plot.code) && oldDoc.name !== updatedDoc.name)) {
          if (!docList.includes(updatedDoc.name)) {
            docList.push(updatedDoc.name);
          }
        }

        return { ...plot, documents: docList };
      });

      writeDb(data);
      return NextResponse.json({ success: true, document: updatedDoc });
    }

    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

