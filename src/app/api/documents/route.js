import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;


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
    // 1. Thử kết nối Supabase và đọc trực tiếp từ bảng drive_file_metadata
    if (pool) {
      try {
        const client = await pool.connect();
        const { rows } = await client.query(`
          SELECT 
            dfm.file_id AS id,
            dfm.file_name AS name,
            NULL AS path,
            dfm.file_id AS "driveFileId",
            dfm.web_view_link AS "driveWebLink",
            dfm.folder_name AS folder,
            'Khác' AS category,
            dfm.loai_vb AS "documentType",
            dfm.so_vb AS "documentNumber",
            dfm.ngay_phat_hanh AS "documentDate",
            dfm.noi_phat_hanh AS "issuingAgency",
            dfm.noi_gui AS "receivingAgency",
            dfm.trich_yeu AS summary,
            dfm.nguoi_xu_ly AS "assignedStaff",
            dfm.is_outgoing AS "is_outgoing",
            dfm.content_md AS "content_md",
            dfm.is_md_generated AS "is_md_generated",
            dfm.md_char_count AS "md_char_count",
            dfm.md_generated_at AS "md_generated_at",
            NULL AS size,
            dfm.modified_time AS "updatedAt",
            p.id AS project_id,
            COALESCE(p.basic_info->>'shortName', p.name, 'Chưa phân loại dự án') AS project_name
          FROM drive_file_metadata dfm
          LEFT JOIN drive_folders_flat dff ON dfm.folder_id = dff.folder_id
          LEFT JOIN projects p ON dff.project_id = p.id
          ORDER BY p.name ASC, dfm.file_name ASC
        `);
        client.release();

        // Định dạng lại ngày tháng để hiển thị đúng ở Frontend
        const formattedDocs = rows.map(doc => {
          const fmtDate = (d) => {
            if (!d) return null;
            const s = String(d).trim();
            if (s.includes('/')) {
              const parts = s.split('/');
              if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
            if (s.includes('-')) {
              return s.split('T')[0];
            }
            return s;
          };
          
          let updatedIso = null;
          if (doc.updatedAt) {
            const upDateObj = new Date(doc.updatedAt);
            if (!isNaN(upDateObj.getTime())) {
              updatedIso = upDateObj.toISOString();
            }
          }

          return {
            ...doc,
            documentDate: fmtDate(doc.documentDate),
            ngay_phat_hanh: doc.documentDate || fmtDate(doc.documentDate),
            updatedAt: updatedIso
          };
        });

        console.log(`Lấy thành công ${formattedDocs.length} tài liệu từ Supabase.`);
        return NextResponse.json({ source: 'live_supabase_db', documents: formattedDocs });
      } catch (dbError) {
        console.error("Lỗi truy vấn bảng drive_file_metadata trên Supabase, chuyển sang dùng dữ liệu cục bộ:", dbError.message);
      }
    }

    // 2. Fallback: Đọc từ db.json cục bộ
    const data = readDb();
    if (data.documents && data.documents.length > 0) {
      const formattedDocs = data.documents.map(doc => ({
        ...doc,
        path: doc.path || doc.filePath || `H:/My Drive/Bồi thường BT-CG/${doc.folder}/${doc.name}`
      }));
      return NextResponse.json({ source: 'local_db_file', documents: formattedDocs });
    }

    // 3. Fallback 2: Đọc từ folder_structure_report.txt
    const reportDocs = parseReportFile();
    return NextResponse.json({ source: 'local_report_file', documents: reportDocs });

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
        driveUrl: docPayload.driveUrl || "https://drive.google.com",
        assignedStaff: docPayload.assignedStaff || ""
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

