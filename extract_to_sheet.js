const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cron = require('node-cron');
require('dotenv').config({ path: '.env.local' });

// ================= CẤU HÌNH =================
const FOLDER_NAME = 'Bồi thường BT-CG';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const ENV_PATH = path.join(__dirname, '.env.local');

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

/**
 * Xác thực Google Auth
 */
async function authorize() {
    if (!fs.existsSync(CREDENTIALS_PATH)) throw new Error('Không tìm thấy credentials.json.');
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (!fs.existsSync(TOKEN_PATH)) throw new Error('Không tìm thấy token.json.');
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
}

/**
 * Trích xuất AI
 */
async function extractMetadata(text) {
    const prompt = `
Bạn là chuyên gia về thể thức văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP.
Hãy đọc nội dung văn bản thô sau đây và trích xuất các thông tin thành định dạng JSON.
Nếu không tìm thấy thông tin, hãy để chuỗi rỗng "". 
Không trả về bất kỳ văn bản nào khác ngoài đoạn JSON.
Yêu cầu JSON có cấu trúc như sau:
{
  "LoaiVB": "Loại văn bản (Quyết định, Thông báo, Tờ trình...)",
  "SoVB": "Số, ký hiệu văn bản (Ví dụ: 123/QĐ-UBND)",
  "NgayPhatHanh": "Ngày tháng năm phát hành (định dạng DD/MM/YYYY)",
  "NoiPhatHanh": "Cơ quan, tổ chức ban hành văn bản",
  "TrichYeu": "Trích yếu nội dung văn bản",
  "NoiNhan": "Nơi nhận văn bản"
}

Nội dung văn bản:
---
${text.substring(0, 30000)}
---
    `;
    try {
        const result = await model.generateContent(prompt);
        let responseText = await result.response.text();
        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(responseText);
    } catch (error) {
        console.error('   -> Lỗi AI:', error.message);
        return { LoaiVB: '', SoVB: '', NgayPhatHanh: '', NoiPhatHanh: '', TrichYeu: '', NoiNhan: '' };
    }
}

/**
 * Quét đệ quy thư mục trên Google Drive
 */
async function findPdfsRecursively(drive, folderId, folderName, allPdfs = []) {
    let pageToken = null;
    do {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
            pageToken: pageToken
        });
        
        const folderPromises = [];
        for (const file of res.data.files) {
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                folderPromises.push(findPdfsRecursively(drive, file.id, folderName + '/' + file.name, allPdfs));
            } else if (file.mimeType === 'application/pdf') {
                allPdfs.push({
                    id: file.id,
                    name: file.name,
                    modifiedTime: file.modifiedTime,
                    folderId: folderId,
                    folderName: folderName
                });
            }
        }
        await Promise.all(folderPromises);
        pageToken = res.data.nextPageToken;
    } while (pageToken);
    
    return allPdfs;
}

/**
 * Lấy hoặc tạo Sheet ID
 */
async function getOrCreateSpreadsheet(sheets) {
    let spreadsheetId = process.env.SPREADSHEET_ID;
    let sheetName = 'Sheet1';
    
    // Nếu chưa có, tạo mới
    if (!spreadsheetId) {
        console.log('Chưa có SPREADSHEET_ID, đang tạo file Sheet mới...');
        const spreadsheet = await sheets.spreadsheets.create({
            resource: {
                properties: { title: `Dữ liệu Bồi thường BT-CG (Tự động cập nhật)` }
            }
        });
        spreadsheetId = spreadsheet.data.spreadsheetId;
        sheetName = spreadsheet.data.sheets[0].properties.title; // Lấy tên thật (có thể là Trang tính1)
        console.log(`Đã tạo Sheet mới: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
        
        // Ghi tiêu đề
        const headers = ['folderID', 'folderName', 'fileID', 'fileName', 'modifiedTime', 'Loại VB', 'Số VB', 'Ngày phát hành', 'Nơi phát hành', 'Trích yếu nội dung', 'Nơi nhận', 'Nội dung PDF (thô)'];
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: { values: [headers] }
        });
        
        // Ghi vào .env.local
        fs.appendFileSync(ENV_PATH, `\nSPREADSHEET_ID="${spreadsheetId}"\n`);
        process.env.SPREADSHEET_ID = spreadsheetId;
    } else {
        // Lấy tên sheet thật nếu đã tồn tại
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        sheetName = spreadsheet.data.sheets[0].properties.title;
    }
    return { spreadsheetId, sheetName };
}

/**
 * Hàm đồng bộ chính
 */
async function syncData() {
    console.log(`\n[${new Date().toLocaleString('vi-VN')}] BẮT ĐẦU CHU KỲ ĐỒNG BỘ...`);
    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Tìm thư mục gốc
        const rootFolderRes = await drive.files.list({
            q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });
        if (!rootFolderRes.data.files || rootFolderRes.data.files.length === 0) {
            console.log(`Không tìm thấy thư mục gốc "${FOLDER_NAME}".`);
            return;
        }
        const rootFolderId = rootFolderRes.data.files[0].id;
        console.log(`- Đã thấy thư mục gốc: ${FOLDER_NAME}`);

        // 2. Quét đệ quy lấy toàn bộ file PDF
        console.log('- Đang quét đệ quy các thư mục con...');
        const allDrivePdfs = await findPdfsRecursively(drive, rootFolderId, FOLDER_NAME);
        console.log(`- Đã tìm thấy ${allDrivePdfs.length} file PDF trên toàn bộ thư mục.`);

        if (allDrivePdfs.length === 0) return;

        // 3. Chuẩn bị Sheet
        const { spreadsheetId, sheetName } = await getOrCreateSpreadsheet(sheets);

        // 4. Lấy dữ liệu hiện tại từ Sheet để tạo Map tracking
        const sheetData = await sheets.spreadsheets.values.get({
            spreadsheetId, range: `${sheetName}!A:F` // Cột C: fileID, Cột E: modifiedTime, Cột F: Loại VB
        });
        const rows = sheetData.data.values || [];
        
        const existingFilesMap = {}; // fileId => { rowIndex, modifiedTime, loaiVb }
        // Dòng 0 là tiêu đề, data bắt đầu từ dòng 1 (tức là rowIndex = 2 trong A1 notation)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const fileId = row[2]; // cột C
            const modifiedTime = row[4]; // cột E
            const loaiVb = row[5] || ''; // cột F (nếu lỗi AI thì sẽ trống)
            if (fileId) {
                existingFilesMap[fileId] = { rowIndex: i + 1, modifiedTime, loaiVb };
            }
        }

        // 5. Phân tích file nào cần cập nhật / thêm mới
        console.log('- Bắt đầu đối chiếu và bóc tách dữ liệu (Lưu trực tiếp từng file vào Sheet để tránh mất dữ liệu)...');
        let processedCount = 0;

        for (const [index, pdf] of allDrivePdfs.entries()) {
            const existing = existingFilesMap[pdf.id];
            
            // So sánh thời gian và check thiếu dữ liệu AI
            const isNew = !existing;
            const isModified = existing && (new Date(pdf.modifiedTime).getTime() > new Date(existing.modifiedTime).getTime());
            const isMissingMetadata = existing && (existing.loaiVb.trim() === '' || existing.loaiVb === 'LỖI');

            if (!isNew && !isModified && !isMissingMetadata) {
                // Không thay đổi và đã có metadata đầy đủ
                continue;
            }

            let reason = isNew ? 'Mới' : (isModified ? 'Đã sửa đổi' : 'Lỗi AI lần trước cần chạy lại');
            console.log(`[${index+1}/${allDrivePdfs.length}] File cần xử lý: ${pdf.name} (Lý do: ${reason})`);
            
            try {
                // Tải PDF
                const response = await drive.files.get({ fileId: pdf.id, alt: 'media' }, { responseType: 'arraybuffer' });
                const pdfData = await pdfParse(response.data);
                const rawText = pdfData.text.trim();
                
                // Trích xuất AI
                const metadata = await extractMetadata(rawText);
                
                const rowData = [
                    pdf.folderId, pdf.folderName, pdf.id, pdf.name, pdf.modifiedTime,
                    metadata.LoaiVB || '', metadata.SoVB || '', metadata.NgayPhatHanh || '',
                    metadata.NoiPhatHanh || '', metadata.TrichYeu || '', metadata.NoiNhan || '',
                    rawText.substring(0, 45000)
                ];

                // GHI TRỰC TIẾP VÀO SHEET NGAY SAU KHI XỬ LÝ XONG 1 FILE
                if (isNew) {
                    await sheets.spreadsheets.values.append({
                        spreadsheetId,
                        range: `${sheetName}!A1`,
                        valueInputOption: 'RAW',
                        insertDataOption: 'INSERT_ROWS',
                        resource: { values: [rowData] }
                    });
                    console.log(`   -> [Thành công] Đã thêm mới vào Sheet.`);
                } else if (isModified || isMissingMetadata) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!A${existing.rowIndex}`,
                        valueInputOption: 'RAW',
                        resource: { values: [rowData] }
                    });
                    console.log(`   -> [Thành công] Đã cập nhật dòng ${existing.rowIndex} trên Sheet.`);
                }
                
                processedCount++;
                
                // Nghỉ 6 giây để không bị quá tải AI (Rate limit) cho phiên bản 3.1 Pro
                await new Promise(r => setTimeout(r, 6000));
                
            } catch (err) {
                console.error(`   -> Lỗi xử lý ${pdf.name}:`, err.message);
            }
        }

        if (processedCount === 0) {
            console.log('- Không có file PDF nào mới hoặc bị sửa đổi.');
        } else {
            console.log(`- Đã xử lý xong ${processedCount} file.`);
        }

        console.log(`✅ CHU KỲ ĐỒNG BỘ HOÀN TẤT! Đợi chu kỳ tiếp theo... (Sheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId})`);

    } catch (err) {
        console.error('LỖI CHU KỲ ĐỒNG BỘ:', err.message);
    }
}

// ================= ENTRY POINT =================
console.log('🚀 Khởi động Tiến trình Đồng bộ PDF (chạy mỗi 60 phút)...');

// Chạy ngay lập tức lần đầu tiên
syncData().then(() => {
    // Đặt lịch chạy định kỳ mỗi 60 phút
    cron.schedule('0 * * * *', () => {
        syncData();
    });
});
