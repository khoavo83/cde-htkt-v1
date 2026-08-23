require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- KHỞI TẠO BẢNG & NẠP DỮ LIỆU GÓI THẦU - HỢP ĐỒNG ---');
    
    // 1. Chạy migration
    const sqlPath = path.join(__dirname, '../supabase/migrations/procurement_contracts.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sqlContent);
    console.log(' Đã khởi tạo 3 bảng: packages, contracts, contract_appendices thành công.');

    const projectId = '1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2';

    // 2. Lấy danh sách investment items để liên kết
    const itemsRes = await client.query('SELECT id, item_code, name FROM investment_items WHERE project_id = $1', [projectId]);
    const itemRows = itemsRes.rows;

    const findItemId = (code, namePart) => {
      const found = itemRows.find(i => (code && i.item_code === code) || (namePart && i.name.includes(namePart)));
      return found ? found.id : null;
    };

    // 3. Xóa dữ liệu cũ của dự án này
    await client.query('DELETE FROM packages WHERE project_id = $1', [projectId]);

    // 4. Danh mục Gói thầu mẫu thực tế
    const packageData = [
      {
        code: 'TV1',
        name: 'Tư vấn lập dự toán công tác chuẩn bị dự án',
        type: 'Tư vấn',
        itemCode: '1',
        itemName: 'Tư vấn lập dự toán công tác chuẩn bị',
        khlcntNo: '560/QĐ-BQLĐSĐT',
        khlcntDate: '2026-01-15',
        estimatedPrice: 40000000,
        procMethod: 'Chỉ định thầu rút gọn',
        contractType: 'Trọn gói',
        quarter: 'Quý I/2026',
        duration: '15 ngày',
        status: 'da_ky_hop_dong',
        contract: {
          contractNo: '1299/2026/HĐTV-BQLĐSĐT',
          contractName: 'Hợp đồng tư vấn lập dự toán công tác chuẩn bị dự án',
          contractor: 'Công ty CP Tư vấn Đầu tư Xây dựng A',
          taxCode: '0301234567',
          leader: 'Nguyễn Văn An',
          signDate: '2026-01-20',
          effectiveDate: '2026-01-20',
          endDate: '2026-02-05',
          value: 40000000,
          advanceExpiry: null,
          performanceExpiry: '2026-04-05',
          documentPath: 'HO_SO_THAU/TV1/HD_1299_2026.pdf',
          status: 'da_thanh_ly',
          notes: 'Đã hoàn thành nghiệm thu thanh toán 100%'
        }
      },
      {
        code: 'TV2',
        name: 'Tư vấn thẩm tra dự toán công tác chuẩn bị dự án',
        type: 'Tư vấn',
        itemCode: '2',
        itemName: 'Tư vấn thẩm tra dự toán công tác chuẩn bị',
        khlcntNo: '560/QĐ-BQLĐSĐT',
        khlcntDate: '2026-01-15',
        estimatedPrice: 2000000,
        procMethod: 'Chỉ định thầu rút gọn',
        contractType: 'Trọn gói',
        quarter: 'Quý I/2026',
        duration: '10 ngày',
        status: 'da_ky_hop_dong',
        contract: {
          contractNo: '1300/2026/HĐTV-BQLĐSĐT',
          contractName: 'Hợp đồng tư vấn thẩm tra dự toán công tác chuẩn bị',
          contractor: 'Công ty CP Tư vấn Xây dựng Tam Kiệt',
          taxCode: '0309876543',
          leader: 'Trần Minh Tâm',
          signDate: '2026-01-22',
          effectiveDate: '2026-01-22',
          endDate: '2026-02-02',
          value: 2000000,
          advanceExpiry: null,
          performanceExpiry: '2026-03-02',
          documentPath: 'HO_SO_THAU/TV2/HD_1300_2026.pdf',
          status: 'da_thanh_ly',
          notes: 'Đã hoàn thành và có Báo cáo thẩm tra'
        }
      },
      {
        code: 'TV3',
        name: 'Tư vấn lập Báo cáo nghiên cứu khả thi (BCNCKT) và ĐTM',
        type: 'Tư vấn',
        itemCode: '3',
        itemName: 'lập BCNCKT',
        khlcntNo: '560/QĐ-BQLĐSĐT',
        khlcntDate: '2026-01-15',
        estimatedPrice: 2500000000,
        procMethod: 'Đấu thầu rộng rãi qua mạng',
        contractType: 'Trọn gói',
        quarter: 'Quý I/2026',
        duration: '180 ngày',
        status: 'dang_thuc_hien',
        contract: {
          contractNo: '1353/2026/HĐTV-BQLĐSĐT',
          contractName: 'Hợp đồng tư vấn lập Báo cáo nghiên cứu khả thi',
          contractor: 'Liên danh Tư vấn Metro Bến Thành - Cần Giờ',
          taxCode: '0315567890',
          leader: 'Lê Hoàng Nam',
          signDate: '2026-03-15',
          effectiveDate: '2026-03-15',
          endDate: '2026-09-15',
          value: 2420000000, // Tiết kiệm 80 triệu
          advanceExpiry: '2026-10-15',
          performanceExpiry: '2026-12-31',
          documentPath: 'HO_SO_THAU/TV3/HD_1353_2026.pdf',
          status: 'dang_thuc_hien',
          notes: 'Đã tạm ứng 500 triệu đợt 1',
          appendices: [
            {
              no: 'PLHĐ số 01/2026',
              type: 'GIA_HAN_TIEN_DO',
              signDate: '2026-06-15',
              deltaAmount: 0,
              newEndDate: '2026-10-30',
              notes: 'Gia hạn tiến độ thêm 45 ngày do bổ sung khảo sát địa chất chuyên sâu các ga trên cao'
            }
          ]
        }
      },
      {
        code: 'TV4',
        name: 'Tư vấn thẩm tra Báo cáo nghiên cứu khả thi',
        type: 'Tư vấn',
        itemCode: '4',
        itemName: 'thẩm tra BCNCKT',
        khlcntNo: '560/QĐ-BQLĐSĐT',
        khlcntDate: '2026-01-15',
        estimatedPrice: 670138495,
        procMethod: 'Chỉ định thầu',
        contractType: 'Trọn gói',
        quarter: 'Quý I/2026',
        duration: '45 ngày',
        status: 'dang_thuc_hien',
        contract: {
          contractNo: '1354/2026/HĐTV-BQLĐSĐT',
          contractName: 'Hợp đồng tư vấn thẩm tra BCNCKT',
          contractor: 'Công ty Cổ phần Tư vấn VTCO',
          taxCode: '0308899112',
          leader: 'Phạm Đức Dũng',
          signDate: '2026-03-20',
          effectiveDate: '2026-03-20',
          endDate: '2026-05-05',
          value: 650000000, // Tiết kiệm 20 triệu
          advanceExpiry: '2026-06-05',
          performanceExpiry: '2026-08-05',
          documentPath: 'HO_SO_THAU/TV4/HD_1354_2026.pdf',
          status: 'dang_thuc_hien',
          notes: 'Đang phối hợp với đơn vị TV3 lập BCNCKT'
        }
      },
      {
        code: 'TV5',
        name: 'Tư vấn đo vẽ, lập bản đồ ranh thu hồi đất và cắm mốc GPMB',
        type: 'Tư vấn',
        itemCode: '5',
        itemName: 'đo vẽ, lập bản đồ',
        khlcntNo: '560/QĐ-BQLĐSĐT',
        khlcntDate: '2026-01-15',
        estimatedPrice: 5574573235,
        procMethod: 'Chỉ định thầu',
        contractType: 'Trọn gói',
        quarter: 'Quý I/2026',
        duration: '90 ngày',
        status: 'dang_thuc_hien',
        contract: {
          contractNo: '1395/2026/HĐTV-BQLĐSĐT',
          contractName: 'Hợp đồng tư vấn đo vẽ lập bản đồ phục vụ thu hồi đất',
          contractor: 'Trung tâm Đo đạc Bản đồ TP. Hồ Chí Minh',
          taxCode: '0302244668',
          leader: 'Võ Minh Trí',
          signDate: '2026-04-10',
          effectiveDate: '2026-04-10',
          endDate: '2026-07-10',
          value: 5574573235,
          advanceExpiry: '2026-08-10',
          performanceExpiry: '2026-10-10',
          documentPath: 'HO_SO_THAU/TV5/HD_1395_2026.pdf',
          status: 'dang_thuc_hien',
          notes: 'Đã hoàn thành đo vẽ ranh đợt 1',
          appendices: [
            {
              no: 'PLHĐ số 01/2026',
              type: 'BO_SUNG_KHOI_LUONG',
              signDate: '2026-07-05',
              deltaAmount: 150000000,
              newEndDate: '2026-08-25',
              notes: 'Bổ sung đo vẽ chi tiết khu vực ranh kết nối nút giao Cần Giờ (+150 triệu đ)'
            }
          ]
        }
      },
      {
        code: 'XL-HTKT',
        name: 'Gói thầu Di dời, đền bù công trình hạ tầng kỹ thuật (Điện, Nước, Viễn thông)',
        type: 'Xây lắp',
        itemCode: '2',
        itemName: 'Di dời, đền bù hạ tầng kỹ thuật',
        khlcntNo: '890/QĐ-UBND',
        khlcntDate: '2026-04-20',
        estimatedPrice: 1359000000000,
        procMethod: 'Đấu thầu rộng rãi qua mạng',
        contractType: 'Đơn giá điều chỉnh',
        quarter: 'Quý II/2026',
        duration: '360 ngày',
        status: 'dang_thuc_hien',
        contract: {
          contractNo: '88/2026/HĐ-DDHTKT',
          contractName: 'Hợp đồng thi công di dời hạ tầng kỹ thuật điện nước tuyến Metro BT-CG',
          contractor: 'Liên danh Tổng Công ty Điện lực TP.HCM & Tổng Công ty Cấp nước Sài Gòn (Sawaco)',
          taxCode: '0300112233',
          leader: 'Đặng Quốc Huy',
          signDate: '2026-06-01',
          effectiveDate: '2026-06-01',
          endDate: '2027-05-31',
          value: 1350000000000, // Tiết kiệm 9 tỷ
          advanceExpiry: '2026-12-31',
          performanceExpiry: '2027-08-31',
          documentPath: 'HO_SO_THAU/HTKT/HD_88_2026.pdf',
          status: 'dang_thuc_hien',
          notes: 'Đã tạm ứng 350 tỷ đồng đợt 1 để mua sắm vật tư thiết bị cao thế'
        }
      }
    ];

    for (const pkg of packageData) {
      const itemId = findItemId(pkg.itemCode, pkg.itemName);

      const pkgRes = await client.query(
        `INSERT INTO packages (
          project_id, investment_item_id, khlcnt_decision_no, khlcnt_decision_date,
          package_code, package_name, package_type, estimated_price,
          procurement_method, contract_type, bidding_quarter, execution_duration,
          status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          projectId, itemId, pkg.khlcntNo, pkg.khlcntDate,
          pkg.code, pkg.name, pkg.type, pkg.estimatedPrice,
          pkg.procMethod, pkg.contractType, pkg.quarter, pkg.duration,
          pkg.status, `Gói thầu theo KHLCNT ${pkg.khlcntNo}`
        ]
      );

      const packageId = pkgRes.rows[0].id;

      if (pkg.contract) {
        const c = pkg.contract;
        let adjustedValue = c.value;
        if (c.appendices && c.appendices.length > 0) {
          c.appendices.forEach(app => {
            adjustedValue += Number(app.deltaAmount || 0);
          });
        }

        const contractRes = await client.query(
          `INSERT INTO contracts (
            project_id, package_id, contract_no, contract_name,
            contractor_name, contractor_tax_code, contractor_leader,
            sign_date, effective_date, end_date, contract_value, adjusted_contract_value,
            advance_guarantee_expiry, performance_guarantee_expiry,
            document_path, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id`,
          [
            projectId, packageId, c.contractNo, c.contractName,
            c.contractor, c.taxCode, c.leader,
            c.signDate, c.effectiveDate, c.endDate, c.value, adjustedValue,
            c.advanceExpiry, c.performanceExpiry,
            c.documentPath, c.status, c.notes
          ]
        );

        const contractId = contractRes.rows[0].id;

        // Thêm Phụ lục hợp đồng nếu có
        if (c.appendices && c.appendices.length > 0) {
          for (const app of c.appendices) {
            await client.query(
              `INSERT INTO contract_appendices (
                contract_id, appendix_no, appendix_type, sign_date, delta_amount, new_end_date, notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                contractId, app.no, app.type, app.signDate, app.deltaAmount, app.newEndDate, app.notes
              ]
            );
          }
        }
      }
    }

    console.log(' Nạp thành công 6 Gói thầu, 6 Hợp đồng kinh tế và các Phụ lục hợp đồng thực tế!');
  } catch (err) {
    console.error(' Lỗi:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
