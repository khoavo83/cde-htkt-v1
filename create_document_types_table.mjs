import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

// Load env
const envFile = fs.readFileSync('.env.local', 'utf8');
const envMatch = envFile.match(/DATABASE_URL="?([^"\s]+)"?/);
if (!envMatch) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}
const dbUrl = envMatch[1].trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Creating table document_types...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_types (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Seed some initial data if empty
    const countRes = await pool.query('SELECT count(*) FROM document_types');
    if (parseInt(countRes.rows[0].count) === 0) {
      console.log('Seeding initial data...');
      await pool.query(`
        INSERT INTO document_types (name, display_name) VALUES 
        ('Quyết định', 'Quyết định'),
        ('Thông báo', 'Thông báo'),
        ('Tờ trình', 'Tờ trình'),
        ('Báo cáo', 'Báo cáo'),
        ('Công văn', 'Công văn')
      `);
    }

    console.log('Table created/verified successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
