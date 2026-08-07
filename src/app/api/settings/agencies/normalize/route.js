import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET: Phân tích dữ liệu, trả về preview các issuer cần chuẩn hóa
export async function GET() {
  try {
    const issuerRes = await pool.query(`
      SELECT DISTINCT TRIM(noi_phat_hanh) as value, COUNT(*) as count
      FROM drive_file_metadata 
      WHERE noi_phat_hanh IS NOT NULL AND noi_phat_hanh != ''
      GROUP BY TRIM(noi_phat_hanh)
      ORDER BY count DESC
    `);

    const receiverRes = await pool.query(`
      SELECT DISTINCT TRIM(noi_gui) as value, COUNT(*) as count
      FROM drive_file_metadata 
      WHERE noi_gui IS NOT NULL AND noi_gui != ''
      GROUP BY TRIM(noi_gui)
      ORDER BY count DESC
    `);

    const agenciesRes = await pool.query('SELECT * FROM issuing_agencies ORDER BY name ASC');
    const agencies = agenciesRes.rows;

    const findMatch = (value) => {
      let match = agencies.find(a => a.name.trim().toLowerCase() === value.trim().toLowerCase());
      if (match) return { agency: match, confidence: 'exact' };

      match = agencies.find(a => a.abbreviation && a.abbreviation.trim().toLowerCase() === value.trim().toLowerCase());
      if (match) return { agency: match, confidence: 'abbreviation' };

      match = agencies.find(a => 
        value.toLowerCase().includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(value.toLowerCase())
      );
      if (match) return { agency: match, confidence: 'contains' };

      match = agencies.find(a => 
        a.abbreviation && (
          value.toLowerCase().includes(a.abbreviation.toLowerCase()) ||
          a.abbreviation.toLowerCase().includes(value.toLowerCase())
        )
      );
      if (match) return { agency: match, confidence: 'abbr_contains' };

      return null;
    };

    const analyzeValues = (rows, field) => rows.map(row => {
      const result = findMatch(row.value);
      return {
        field,
        original: row.value,
        count: parseInt(row.count),
        matched_agency: result ? result.agency : null,
        confidence: result ? result.confidence : 'no_match',
        is_already_normalized: result ? result.confidence === 'exact' : false
      };
    });

    const totalRes = await pool.query('SELECT COUNT(*) as c FROM drive_file_metadata');

    return NextResponse.json({ 
      success: true, 
      data: {
        issuers: analyzeValues(issuerRes.rows, 'issuer'),
        receivers: analyzeValues(receiverRes.rows, 'receiver'),
        total_files: totalRes.rows[0].c
      }
    });
  } catch (error) {
    console.error('Error analyzing:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Áp dụng chuẩn hóa
export async function POST(req) {
  try {
    const { mappings } = await req.json();

    let totalUpdated = 0;
    for (const m of mappings) {
      if (!m.original || !m.target_name || m.original === m.target_name) continue;
      const field = m.field === 'receiver' ? 'noi_gui' : 'noi_phat_hanh';
      const res = await pool.query(
        `UPDATE drive_file_metadata SET ${field} = $1 WHERE TRIM(${field}) = $2`,
        [m.target_name, m.original.trim()]
      );
      totalUpdated += res.rowCount;
    }

    return NextResponse.json({ success: true, updated: totalUpdated });
  } catch (error) {
    console.error('Error normalizing:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
