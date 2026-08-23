require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- NẠP CHỨNG TỪ GIẢI NGÂN MẪU THỰC TẾ (GIAI ĐOẠN 3) ---');
    const projectId = '1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2';

    // Lấy ID của các khoản mục chi phí và QĐ giao vốn
    const itemsRes = await client.query('SELECT id, item_code, contract_no, name FROM investment_items WHERE project_id = $1', [projectId]);
    const allocRes = await client.query('SELECT id, decision_no FROM capital_allocations WHERE project_id = $1 ORDER BY decision_date ASC', [projectId]);

    const itemMap = {};
    itemsRes.rows.forEach(r => {
      if (r.item_code) itemMap[r.item_code] = r.id;
    });

    const alloc1 = allocRes.rows[0]?.id || null; // QĐ 450
    const alloc2 = allocRes.rows[1]?.id || alloc1; // QĐ 1120

    // Xóa giải ngân cũ nếu có để nạp bộ mới đồng bộ
    await client.query('DELETE FROM disbursements WHERE project_id = $1', [projectId]);

    const sampleDisb = [
      {
        itemCode: '1', // Tư vấn lập dự toán chuẩn bị
        nameMatch: 'Tư vấn lập dự toán',
        allocId: alloc1,
        voucherNo: 'UNC-1299/2026',
        date: '2026-03-10',
        amount: 40000000,
        type: 'thanh_toan_kl',
        recipient: 'Công ty CP Tư vấn Đầu tư Xây dựng A',
        contractNo: 'HĐ số 1299/2026/HĐTV-BQLĐSĐT',
        desc: 'Thanh toán 100% giá trị hợp đồng tư vấn lập dự toán công tác chuẩn bị dự án'
      },
      {
        itemCode: '3', // TV3 lập BCNCKT
        nameMatch: 'lập BCNCKT',
        allocId: alloc1,
        voucherNo: 'UNC-1353/2026-01',
        date: '2026-04-15',
        amount: 500000000,
        type: 'tam_ung',
        recipient: 'Liên danh TV3 Metro',
        contractNo: 'HĐ số 1353/2026/HĐTV-BQLĐSĐT',
        desc: 'Tạm ứng 25% giá trị hợp đồng tư vấn lập Báo cáo nghiên cứu khả thi'
      },
      {
        itemCode: '5', // TV5 Đo vẽ GPMB
        nameMatch: 'đo vẽ, lập bản đồ',
        allocId: alloc1,
        voucherNo: 'UNC-1395/2026',
        date: '2026-05-20',
        amount: 5574573235,
        type: 'thanh_toan_kl',
        recipient: 'Trung tâm Đo đạc Bản đồ TP.HCM',
        contractNo: 'HĐ số 1395/2026/HĐTV-BQLĐSĐT',
        desc: 'Thanh toán nghiệm thu hoàn thành công tác đo vẽ, lập bản đồ ranh thu hồi đất và cắm mốc GPMB'
      },
      {
        itemCode: '1', // GPMB bồi thường
        nameMatch: 'GPMB, bồi thường',
        allocId: alloc1,
        voucherNo: 'UNC-BT-01/2026',
        date: '2026-06-05',
        amount: 2500000000000,
        type: 'tam_ung',
        recipient: 'Ban Bồi thường Giải phóng mặt bằng Quận 7 & Nhà Bè',
        contractNo: 'Phương án bồi thường số 01/PABT',
        desc: 'Tạm ứng kinh phí chi trả tiền bồi thường đợt 1 cho các hộ dân bị ảnh hưởng'
      },
      {
        itemCode: '1', // GPMB bồi thường
        nameMatch: 'GPMB, bồi thường',
        allocId: alloc1,
        voucherNo: 'UNC-BT-02/2026',
        date: '2026-07-18',
        amount: 1200000000000,
        type: 'thanh_toan_kl',
        recipient: 'Ban Bồi thường Giải phóng mặt bằng Quận 7 & Nhà Bè',
        contractNo: 'Quyết định duyệt phương án chi trả bồi thường',
        desc: 'Thanh toán khối lượng hoàn thành công tác chi trả tiền bồi thường và bàn giao mặt bằng đợt 1'
      },
      {
        itemCode: '1', // GPMB bồi thường
        nameMatch: 'GPMB, bồi thường',
        allocId: alloc1,
        voucherNo: 'UNC-TH-01/2026',
        date: '2026-07-25',
        amount: 500000000000,
        type: 'thu_hoi_tam_ung',
        recipient: 'Kho bạc Nhà nước Khu vực',
        contractNo: 'Phương án bồi thường số 01/PABT',
        desc: 'Thu hồi tạm ứng bồi thường đợt 1 theo khối lượng nghiệm thu hoàn thành'
      },
      {
        itemCode: '2', // Di dời HTKT
        nameMatch: 'Di dời, đền bù hạ tầng',
        allocId: alloc2,
        voucherNo: 'UNC-HTKT-01/2026',
        date: '2026-08-10',
        amount: 350000000000,
        type: 'tam_ung',
        recipient: 'Tổng Công ty Điện lực TP.HCM & Sawaco',
        contractNo: 'Hợp đồng di dời hạ tầng điện nước số 88/HĐ-DD',
        desc: 'Tạm ứng hợp đồng di dời hệ thống lưới điện cao thế và tuyến ống cấp nước D600'
      }
    ];

    for (const d of sampleDisb) {
      // Tìm đúng item ID
      const matched = itemsRes.rows.find(i => i.name.includes(d.nameMatch) || (d.contractNo && i.contract_no === d.contractNo));
      const itemId = matched ? matched.id : null;

      await client.query(
        `INSERT INTO disbursements (
          project_id, investment_item_id, capital_allocation_id, voucher_no,
          disbursement_date, amount, disbursement_type, recipient, contract_no, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectId, itemId, d.allocId, d.voucherNo,
          d.date, d.amount, d.type, d.recipient, d.contractNo, d.desc
        ]
      );
    }

    console.log(' Đã nạp 7 chứng từ giải ngân thực tế chuẩn mẫu nghiệp vụ!');
  } catch (err) {
    console.error(' Lỗi:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
