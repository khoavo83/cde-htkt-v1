const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.yeoerybkosutceirmaxp:%3Fmz9ui*K6H8%24kz7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=disable",
});

async function setup() {
  try {
    await client.connect();
    console.log("Connected to Supabase.");

    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.staffs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name TEXT NOT NULL,
        position TEXT,
        phone TEXT,
        dob TEXT,
        email TEXT,
        avatar_url TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.staff_departments (
        staff_id UUID REFERENCES public.staffs(id) ON DELETE CASCADE,
        department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'Thành viên',
        PRIMARY KEY (staff_id, department_id)
      );
    `);

    await client.query(`TRUNCATE TABLE public.staff_departments CASCADE;`);
    await client.query(`TRUNCATE TABLE public.staffs CASCADE;`);
    await client.query(`TRUNCATE TABLE public.departments CASCADE;`);

    // --- SEED DEPARTMENTS ---
    const depsData = [
      { id: 'd0000000-0000-0000-0000-000000000001', name: 'Ban Giám đốc', type: 'Lãnh đạo' },
      { id: 'd0000000-0000-0000-0000-000000000002', name: 'Tổ Dự án 1', type: 'Tổ' },
      { id: 'd0000000-0000-0000-0000-000000000003', name: 'Tổ Dự án 2', type: 'Tổ' },
      { id: 'd0000000-0000-0000-0000-000000000004', name: 'Tổ Kế hoạch - Hợp đồng', type: 'Tổ' },
      { id: 'd0000000-0000-0000-0000-000000000005', name: 'Nhóm Bồi thường - Hỗ trợ - Tái định cư', type: 'Nhóm' },
      { id: 'd0000000-0000-0000-0000-000000000006', name: 'Nhóm Hạ tầng kỹ thuật', type: 'Nhóm' }
    ];
    for (const d of depsData) {
      await client.query(`INSERT INTO public.departments (id, name, type) VALUES ($1, $2, $3)`, [d.id, d.name, d.type]);
    }

    // --- SEED STAFFS ---
    const staffs = [
      { id: '50000000-0000-0000-0000-000000000001', name: 'Vũ Minh Huyền', pos: 'Giám đốc', phone: '0903116884', dob: '01/10/1976' },
      { id: '50000000-0000-0000-0000-000000000002', name: 'Hồ Dương Bình', pos: 'Phó Giám đốc', phone: '0902793663', dob: '03/02/1991' },
      { id: '50000000-0000-0000-0000-000000000003', name: 'Thái Hạ Hòa', pos: 'Phó Giám đốc', phone: '', dob: '' },
      { id: '50000000-0000-0000-0000-000000000004', name: 'Lê Ngọc Mỹ Duyên', pos: 'Chuyên viên', phone: '0938019616', dob: '20/12/1992' },
      { id: '50000000-0000-0000-0000-000000000005', name: 'Nguyễn Văn Hiếu', pos: 'Chuyên viên', phone: '0918289732', dob: '06/11/1977' },
      { id: '50000000-0000-0000-0000-000000000006', name: 'Phạm Thanh Hùng', pos: 'Chuyên viên', phone: '0909483399', dob: '05/09/1965' },
      { id: '50000000-0000-0000-0000-000000000007', name: 'Vũ Quang Huy', pos: 'Chuyên viên', phone: '0928700039', dob: '11/06/1997' },
      { id: '50000000-0000-0000-0000-000000000008', name: 'Võ Đăng Khoa', pos: 'Chuyên viên', phone: '0902040020', dob: '30/09/1983' },
      { id: '50000000-0000-0000-0000-000000000009', name: 'Lê Thị Bích Liễu', pos: 'Chuyên viên', phone: '0909799090', dob: '24/01/1973' },
      { id: '50000000-0000-0000-0000-000000000010', name: 'Ngô Thoại Long', pos: 'Chuyên viên', phone: '0903825222', dob: '21/02/1973' },
      { id: '50000000-0000-0000-0000-000000000011', name: 'Nguyễn Nam Phương', pos: 'Chuyên viên', phone: '0938526497', dob: '15/12/1997' },
      { id: '50000000-0000-0000-0000-000000000012', name: 'Phạm Ngọc Quang', pos: 'Chuyên viên', phone: '0934005571', dob: '05/05/1971' },
      { id: '50000000-0000-0000-0000-000000000013', name: 'Đào Duy Quang', pos: 'Chuyên viên', phone: '0913771248', dob: '06/12/1975' },
      { id: '50000000-0000-0000-0000-000000000014', name: 'Nguyễn Hoàng Sang', pos: 'Chuyên viên', phone: '0909249290', dob: '09/09/1992' },
      { id: '50000000-0000-0000-0000-000000000015', name: 'Nguyễn Thị Thủy', pos: 'Chuyên viên', phone: '0909907307', dob: '15/04/1985' },
      { id: '50000000-0000-0000-0000-000000000016', name: 'Trương Anh Tuấn', pos: 'Chuyên viên', phone: '0903960101', dob: '12/07/1967' },
      { id: '50000000-0000-0000-0000-000000000017', name: 'Nguyễn Hoàng Vũ', pos: 'Chuyên viên', phone: '0931285948', dob: '30/05/1986' },
      { id: '50000000-0000-0000-0000-000000000018', name: 'Võ Trung Trực', pos: 'Chuyên gia', phone: '', dob: '' },
      { id: '50000000-0000-0000-0000-000000000019', name: 'Phạm Thị Trà Giang', pos: 'Chuyên viên', phone: '', dob: '' },
      { id: '50000000-0000-0000-0000-000000000020', name: 'Ngô Xuân Phúc', pos: 'Chuyên viên', phone: '', dob: '' },
    ];
    
    for (const s of staffs) {
      await client.query(
        `INSERT INTO public.staffs (id, full_name, position, phone, dob) VALUES ($1, $2, $3, $4, $5)`,
        [s.id, s.name, s.pos, s.phone, s.dob]
      );
    }

    // --- SEED MATRIX ---
    const matrix = [
      { s: '50000000-0000-0000-0000-000000000001', d: 'd0000000-0000-0000-0000-000000000001', role: 'Giám đốc' },
      
      { s: '50000000-0000-0000-0000-000000000002', d: 'd0000000-0000-0000-0000-000000000001', role: 'Phó Giám đốc' },
      { s: '50000000-0000-0000-0000-000000000002', d: 'd0000000-0000-0000-0000-000000000002', role: 'Tổ trưởng' }, 
      
      { s: '50000000-0000-0000-0000-000000000003', d: 'd0000000-0000-0000-0000-000000000001', role: 'Phó Giám đốc' },
      { s: '50000000-0000-0000-0000-000000000003', d: 'd0000000-0000-0000-0000-000000000003', role: 'Tổ trưởng' }, 
      
      { s: '50000000-0000-0000-0000-000000000018', d: 'd0000000-0000-0000-0000-000000000001', role: 'Chuyên gia' }, 

      // Tổ DA1
      { s: '50000000-0000-0000-0000-000000000010', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000013', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000006', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000005', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000014', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000015', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000004', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000019', d: 'd0000000-0000-0000-0000-000000000002', role: 'Thành viên' },

      // Tổ DA2
      { s: '50000000-0000-0000-0000-000000000012', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000016', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000007', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000008', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000011', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000017', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000020', d: 'd0000000-0000-0000-0000-000000000003', role: 'Thành viên' },

      // Tổ KH-HĐ
      { s: '50000000-0000-0000-0000-000000000011', d: 'd0000000-0000-0000-0000-000000000004', role: 'Tổ trưởng' },
      { s: '50000000-0000-0000-0000-000000000009', d: 'd0000000-0000-0000-0000-000000000004', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000015', d: 'd0000000-0000-0000-0000-000000000004', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000004', d: 'd0000000-0000-0000-0000-000000000004', role: 'Thành viên' },

      // Nhóm Bồi thường
      { s: '50000000-0000-0000-0000-000000000006', d: 'd0000000-0000-0000-0000-000000000005', role: 'Nhóm trưởng' },
      { s: '50000000-0000-0000-0000-000000000012', d: 'd0000000-0000-0000-0000-000000000005', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000016', d: 'd0000000-0000-0000-0000-000000000005', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000011', d: 'd0000000-0000-0000-0000-000000000005', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000015', d: 'd0000000-0000-0000-0000-000000000005', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000004', d: 'd0000000-0000-0000-0000-000000000005', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000019', d: 'd0000000-0000-0000-0000-000000000005', role: 'Thành viên' },

      // Nhóm HTKT
      { s: '50000000-0000-0000-0000-000000000005', d: 'd0000000-0000-0000-0000-000000000006', role: 'Nhóm trưởng' },
      { s: '50000000-0000-0000-0000-000000000010', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000008', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000013', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000017', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000007', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000014', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' },
      { s: '50000000-0000-0000-0000-000000000020', d: 'd0000000-0000-0000-0000-000000000006', role: 'Thành viên' }
    ];

    for (const m of matrix) {
      await client.query(
        `INSERT INTO public.staff_departments (staff_id, department_id, role) VALUES ($1, $2, $3)`,
        [m.s, m.d, m.role]
      );
    }

    await client.query('COMMIT');
    console.log("Database initialized and data seeded successfully.");

    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Reloaded PostgREST schema cache.");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

setup();
