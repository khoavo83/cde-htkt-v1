import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM document_types ORDER BY name ASC');
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, display_name, notes } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

    const res = await pool.query(
      'INSERT INTO document_types (name, display_name, notes) VALUES ($1, $2, $3) RETURNING *',
      [name, display_name || '', notes || '']
    );
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error('Error adding document type:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, name, display_name, notes } = await req.json();
    if (!id || !name) return NextResponse.json({ success: false, error: 'ID and Name are required' }, { status: 400 });

    const res = await pool.query(
      'UPDATE document_types SET name = $1, display_name = $2, notes = $3 WHERE id = $4 RETURNING *',
      [name, display_name || '', notes || '', id]
    );
    
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error('Error updating document type:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const res = await pool.query('DELETE FROM document_types WHERE id = $1 RETURNING *', [id]);
    
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error('Error deleting document type:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
