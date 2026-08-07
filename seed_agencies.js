const {Pool} = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable',
  ssl: false
});

const defaultAgencies = [
  { name: 'Sở Nông nghiệp & PTNT', abbr: 'Sở NN&PTNT', notes: 'Sở Nông nghiệp và Phát triển Nông thôn TP.HCM' },
  { name: 'Văn phòng Đăng ký Đất đai', abbr: 'VPĐKĐĐ', notes: 'Văn phòng Đăng ký Đất đai TP.HCM' },
  { name: 'Ban Quản lý Đường sắt Đô thị', abbr: 'BQLĐSĐT', notes: 'Ban Quản lý Đường sắt Đô thị TP.HCM' },
  { name: 'Công ty TNHH Phát triển Phú Mỹ Hưng', abbr: 'Phú Mỹ Hưng', notes: 'Công ty TNHH Phát triển Phú Mỹ Hưng' },
  { name: 'UBND TP.HCM', abbr: 'UBND TP.HCM', notes: 'Ủy ban Nhân dân TP.HCM' },
  { name: 'UBND Quận 7', abbr: 'UBND Quận 7', notes: 'Ủy ban Nhân dân Quận 7' },
  { name: 'Tổng Công ty Lũng Lô', abbr: 'Lũng Lô', notes: 'Tổng Công ty Xây dựng Lũng Lô - Bộ Quốc phòng' },
  { name: 'Tổng Công ty Thành An', abbr: 'Thành An', notes: 'Tổng Công ty Thành An - Binh đoàn 11' },
  { name: 'Lữ đoàn 239', abbr: 'LĐ239', notes: 'Lữ đoàn Công binh 239' },
  { name: 'Lữ đoàn 299', abbr: 'LĐ299', notes: 'Lữ đoàn Công binh 299' },
  { name: 'Trung tâm Xử lý Bom mìn', abbr: 'TT XLBM', notes: 'Trung tâm Xử lý Bom mìn Quốc gia' },
  { name: 'Xí nghiệp Truyền dẫn Nước sạch', abbr: 'XN TDNS', notes: 'Xí nghiệp Truyền dẫn Nước sạch' }
];

async function seed() {
  try {
    for (const a of defaultAgencies) {
      const exists = await pool.query('SELECT id FROM issuing_agencies WHERE name = $1', [a.name]);
      if (exists.rowCount === 0) {
        await pool.query('INSERT INTO issuing_agencies (name, abbreviation, notes) VALUES ($1, $2, $3)', [a.name, a.abbr, a.notes]);
        console.log('Inserted:', a.name);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
seed();
