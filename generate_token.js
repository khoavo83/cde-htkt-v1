const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Khai báo các quyền cần thiết (Drive đọc và Sheets ghi)
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
];

async function generateNewToken() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('Không tìm thấy credentials.json');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('Bạn cần cấp quyền mới để có thể ĐỔI TÊN file trên Google Drive.');
    console.log('1. Hãy mở đường link sau trong trình duyệt:\n', authUrl);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('2. Sau khi xác thực, hãy copy mã code và dán vào đây: ', async (code) => {
        rl.close();
        try {
            const { tokens } = await oAuth2Client.getToken(code);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            console.log('✅ Đã tạo token.json mới thành công! Bây giờ bạn có thể chạy lại lệnh node extract_to_sheet.js');
        } catch (err) {
            console.error('Lỗi khi lấy token:', err.message);
        }
    });
}

generateNewToken();
