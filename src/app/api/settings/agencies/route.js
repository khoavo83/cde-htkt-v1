import { NextResponse } from 'next/server';

// We'll use the pg pool since this project uses `pg` directly in many places.
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM issuing_agencies ORDER BY name ASC');
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error) {
    console.error('Error fetching issuing agencies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, abbreviation, notes } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

    const res = await pool.query(
      'INSERT INTO issuing_agencies (name, abbreviation, notes) VALUES ($1, $2, $3) RETURNING *',
      [name, abbreviation || '', notes || '']
    );
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error('Error adding issuing agency:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, name, abbreviation, notes } = await req.json();
    if (!id || !name) return NextResponse.json({ success: false, error: 'ID and Name are required' }, { status: 400 });

    const res = await pool.query(
      'UPDATE issuing_agencies SET name = $1, abbreviation = $2, notes = $3 WHERE id = $4 RETURNING *',
      [name, abbreviation || '', notes || '', id]
    );
    
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error('Error updating issuing agency:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const res = await pool.query('DELETE FROM issuing_agencies WHERE id = $1 RETURNING *', [id]);
    
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error('Error deleting issuing agency:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
