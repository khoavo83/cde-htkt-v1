const fs = require('fs');
const path = require('path');
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
    console.log('--- 1. BẮT ĐẦU CHẠY MIGRATION SQL ---');
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'investment_management.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log(' Migration bảng TMĐT thành công!');

    console.log('--- 2. NẠP SEED DATA CHO DỰ ÁN BẾN THÀNH - CẦN GIỜ ---');
    const projectId = '1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2';

    // Kiểm tra xem đã có version V0 chưa
    const existingVer = await client.query(
      'SELECT id FROM investment_versions WHERE project_id = $1 AND version_code = $2',
      [projectId, 'V0']
    );

    let versionId;
    if (existingVer.rows.length > 0) {
      versionId = existingVer.rows[0].id;
      console.log(`Đã có phiên bản V0 (ID: ${versionId}), làm mới dữ liệu khoản mục...`);
      await client.query('DELETE FROM investment_items WHERE version_id = $1', [versionId]);
      await client.query(
        `UPDATE investment_versions SET 
          total_before_tax = 9668482404616,
          total_vat = 144838298796,
          total_after_tax = 9813320703412,
          decision_no = '235/BCTT',
          decision_date = '2026-06-26',
          approved_by = 'Công ty CP TV XD Tam Kiệt',
          notes = 'Phê duyệt TMĐT theo Báo cáo thẩm tra số 235/BCTT'
        WHERE id = $1`,
        [versionId]
      );
    } else {
      const verRes = await client.query(
        `INSERT INTO investment_versions (
          project_id, version_code, version_name, decision_no, decision_date, approved_by,
          total_before_tax, total_vat, total_after_tax, is_active, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          projectId,
          'V0',
          'TMĐT phê duyệt lần đầu (Thẩm tra BCTT)',
          '235/BCTT',
          '2026-06-26',
          'Công ty CP TV XD Tam Kiệt (Thẩm tra) / VTCO (Lập)',
          9668482404616,
          144838298796,
          9813320703412,
          true,
          'Phê duyệt Tổng mức đầu tư Bồi thường Tuyến ĐS Bến Thành - Cần Giờ'
        ]
      );
      versionId = verRes.rows[0].id;
      console.log(`Đã tạo phiên bản V0 mới: ${versionId}`);
    }

    // Hàm helper chèn item
    async function insertItem({
      parentId = null,
      order,
      code,
      name,
      symbol = '',
      ref = '',
      rate = null,
      adjustRate = null,
      beforeTax = 0,
      vatRate = 0,
      vatCost = 0,
      afterTax = 0,
      contractNo = '',
      notes = ''
    }) {
      const res = await client.query(
        `INSERT INTO investment_items (
          version_id, project_id, parent_id, item_order, item_code, name, calc_symbol,
          calc_ref, calc_rate, calc_adjust_rate, cost_before_tax, vat_rate, vat_cost,
          cost_after_tax, contract_no, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          versionId, projectId, parentId, order, code, name, symbol,
          ref, rate, adjustRate, beforeTax, vatRate, vatCost,
          afterTax, contractNo, notes
        ]
      );
      return res.rows[0].id;
    }

    // I. CHI PHÍ BỒI THƯỜNG, HỖ TRỢ VÀ TÁI ĐỊNH CƯ
    const itemI = await insertItem({
      order: 1,
      code: 'I',
      name: 'CHI PHÍ BỒI THƯỜNG, HỖ TRỢ VÀ TÁI ĐỊNH CƯ',
      symbol: 'Ggpmb',
      beforeTax: 8574697501351,
      vatCost: 123593395245,
      afterTax: 8698290896596
    });

    await insertItem({
      parentId: itemI,
      order: 1,
      code: '1',
      name: 'GPMB, bồi thường, hỗ trợ TĐC',
      symbol: 'Gbt, ht',
      beforeTax: 7338763548897,
      vatCost: 0,
      afterTax: 7338763548897,
      notes: 'Bảng tính kèm theo'
    });

    await insertItem({
      parentId: itemI,
      order: 2,
      code: '2',
      name: 'Di dời, đền bù hạ tầng kỹ thuật',
      symbol: 'Ghtkt',
      beforeTax: 1235933952454,
      vatRate: 10,
      vatCost: 123593395245,
      afterTax: 1359527347699,
      notes: 'Bảng tính kèm theo'
    });

    // II. CHI PHÍ QUẢN LÝ DỰ ÁN
    await insertItem({
      order: 2,
      code: 'II',
      name: 'CHI PHÍ QUẢN LÝ DỰ ÁN',
      symbol: 'Gqlda',
      beforeTax: 21485890042,
      vatRate: 10,
      vatCost: 2148589004,
      afterTax: 23634479046,
      notes: 'Tính 2 năm'
    });

    // III. CHI PHÍ ĐẢM BẢO CHO VIỆC TỔ CHỨC THỰC HIỆN BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ
    const itemIII = await insertItem({
      order: 3,
      code: 'III',
      name: 'CHI PHÍ ĐẢM BẢO CHO VIỆC TỔ CHỨC THỰC HIỆN BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ',
      symbol: 'Gtc',
      beforeTax: 170076644655,
      vatCost: 17007664465,
      afterTax: 187084309120
    });

    await insertItem({
      parentId: itemIII,
      order: 1,
      code: 'III.1',
      name: 'Chi phí bảo đảm cho việc tổ chức thực hiện bồi thường, hỗ trợ, tái định cư',
      symbol: 'Gql',
      ref: 'Ggpmb = 8.574.697.501.351',
      rate: 0.02,
      beforeTax: 155903590934,
      vatRate: 10,
      vatCost: 15590359093,
      afterTax: 171493950027,
      notes: 'Đã gồm chi phí thuê đơn vị tư vấn xác định và thẩm định giá đất, di dời, hoàn trả...'
    });

    await insertItem({
      parentId: itemIII,
      order: 2,
      code: 'III.2',
      name: 'Chi phí cưỡng chế GPMB',
      symbol: 'Gech',
      ref: 'Gql = 155.903.590.934',
      rate: 0.10,
      beforeTax: 14173053721,
      vatRate: 10,
      vatCost: 1417305372,
      afterTax: 15590359093,
      notes: 'Tạm tính'
    });

    // IV. CHI PHÍ TƯ VẤN
    const itemIV = await insertItem({
      order: 4,
      code: 'IV',
      name: 'CHI PHÍ TƯ VẤN',
      symbol: 'Gtv',
      ref: '(TV1+ ... +TV6)',
      beforeTax: 8707880958,
      vatCost: 78830772,
      afterTax: 8786711730
    });

    const itemIVA = await insertItem({
      parentId: itemIV,
      order: 1,
      code: 'A',
      name: 'Chi phí chuẩn bị dự án',
      afterTax: 7919573235
    });

    await insertItem({
      parentId: itemIVA,
      order: 1,
      code: '1',
      name: 'Tư vấn lập dự toán công tác chuẩn bị dự án',
      symbol: 'TV1',
      afterTax: 40000000,
      contractNo: 'HĐ số 1299/2026/HĐTV-BQLĐSĐT'
    });

    await insertItem({
      parentId: itemIVA,
      order: 2,
      code: '2',
      name: 'Tư vấn thẩm tra, lựa chọn nhà thầu và giám sát trong giai đoạn chuẩn bị dự án',
      symbol: 'TV2',
      afterTax: 157000000,
      contractNo: 'HĐ số 1300/2026/HĐTV-BQLĐSĐT'
    });

    await insertItem({
      parentId: itemIVA,
      order: 3,
      code: '3',
      name: 'Tư vấn lập BCNCKT',
      symbol: 'TV3',
      afterTax: 1980000000,
      contractNo: 'HĐ số 1353/2026/HĐTV-BQLĐSĐT'
    });

    await insertItem({
      parentId: itemIVA,
      order: 4,
      code: '4',
      name: 'Tư vấn thẩm tra BCNCKT',
      symbol: 'TV4',
      afterTax: 168000000,
      contractNo: 'HĐ số 1354/2026/HĐTV-BQLĐSĐT'
    });

    await insertItem({
      parentId: itemIVA,
      order: 5,
      code: '5',
      name: 'Tư vấn đo vẽ, lập bản đồ vị trí phục vụ công tác thu hồi đất và giao ranh cắm mốc GPMB',
      symbol: 'TV5',
      afterTax: 5574573235,
      contractNo: 'HĐ số 1395/2026/HĐTV-BQLĐSĐT'
    });

    const itemIVB = await insertItem({
      parentId: itemIV,
      order: 2,
      code: 'B',
      name: 'Chi phí giai đoạn thực hiện dự án',
      beforeTax: 788307723,
      vatCost: 78830772,
      afterTax: 867138495
    });

    await insertItem({
      parentId: itemIVB,
      order: 1,
      code: '6',
      name: 'Điều tra xã hội học',
      symbol: 'TV6',
      beforeTax: 788307723,
      vatRate: 10,
      vatCost: 78830772,
      afterTax: 867138495,
      notes: 'Bảng tính kèm theo'
    });

    // V. CHI PHÍ KHÁC
    const itemV = await insertItem({
      order: 5,
      code: 'V',
      name: 'CHI PHÍ KHÁC',
      symbol: 'Gk',
      ref: '(K1+ ... +K3)',
      beforeTax: 5949634063,
      vatCost: 347061987,
      afterTax: 6296696050
    });

    await insertItem({
      parentId: itemV,
      order: 1,
      code: '1',
      name: 'Phí thẩm định dự án đầu tư (max= 150 triệu, min= 0,5 triệu)',
      symbol: 'K1',
      ref: 'V = 9.813.320.703.412',
      rate: 0.00001,
      beforeTax: 99160568,
      afterTax: 99160568,
      notes: 'TT 28/2023/TT-BTC ngày 12/5/2023'
    });

    await insertItem({
      parentId: itemV,
      order: 2,
      code: '2',
      name: 'Chi phí kiểm toán',
      symbol: 'K2',
      ref: 'V = 9.813.320.703.412',
      rate: 0.0007,
      adjustRate: 0.50,
      beforeTax: 3470619870,
      vatRate: 10,
      vatCost: 347061987,
      afterTax: 3817681857,
      notes: 'NĐ 254/2025/NĐ-CP ngày 26/09/2025'
    });

    await insertItem({
      parentId: itemV,
      order: 3,
      code: '3',
      name: 'Chi phí thẩm tra phê duyệt quyết toán',
      symbol: 'K3',
      ref: 'V = 9.813.320.703.412',
      rate: 0.00049,
      adjustRate: 0.50,
      beforeTax: 2379853625,
      afterTax: 2379853625,
      notes: 'NĐ 254/2025/NĐ-CP ngày 26/09/2025'
    });

    // VI. CHI PHÍ DỰ PHÒNG
    const itemVI = await insertItem({
      order: 6,
      code: 'VI',
      name: 'CHI PHÍ DỰ PHÒNG',
      symbol: 'Gdp',
      ref: '10%x(Ggpmb+Gtc)',
      afterTax: 889227610870
    });

    await insertItem({
      parentId: itemVI,
      order: 1,
      code: '1',
      name: 'Dự phòng phí cho khối lượng công việc phát sinh',
      symbol: 'DP1',
      ref: 'V-Gdp = 8.885.375.205.716',
      rate: 0.10,
      afterTax: 889227610870,
      notes: 'TT 11/2021/TT-BXD ngày 31/8/2021'
    });

    console.log(' Đã nạp thành công toàn bộ cây khoản mục TMĐT thực tế!');

    // 3. Nạp Kế hoạch vốn mẫu & Quyết định giao vốn
    const existingPlan = await client.query(
      'SELECT id FROM capital_plans WHERE project_id = $1',
      [projectId]
    );

    if (existingPlan.rows.length === 0) {
      const planRes = await client.query(
        `INSERT INTO capital_plans (
          project_id, plan_type, title, period_start_year, period_end_year, planned_amount, funding_source, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          projectId,
          'hang_nam',
          'Kế hoạch vốn năm 2026',
          2026,
          2026,
          6000000000000,
          'Ngân sách Thành phố Hồ Chí Minh',
          'Kế hoạch bố trí vốn giải phóng mặt bằng đợt 1 & 2'
        ]
      );
      const planId = planRes.rows[0].id;

      await client.query(
        `INSERT INTO capital_allocations (
          capital_plan_id, project_id, decision_no, decision_date, year, allocation_phase, amount, notes
        ) VALUES 
        ($1, $2, 'QĐ số 450/QĐ-UBND', '2026-01-15', 2026, 'Giao vốn đợt 1 (Đầu năm)', 4000000000000, 'Giao vốn đợt 1 phục vụ chi trả bồi thường'),
        ($1, $2, 'QĐ số 1120/QĐ-UBND', '2026-06-20', 2026, 'Bổ sung vốn đợt 2', 2000000000000, 'Bổ sung vốn thực hiện di dời HTKT')`,
        [planId, projectId]
      );
      console.log(' Đã nạp Kế hoạch vốn và QĐ giao vốn năm 2026!');
    }

    console.log('=== HOÀN TẤT TOÀN BỘ SEED DỮ LIỆU TMĐT ===');
  } catch (err) {
    console.error(' Lỗi khi chạy migration/seed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
