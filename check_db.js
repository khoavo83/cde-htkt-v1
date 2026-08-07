const { Pool } = require('pg');
const parse = require('pg-connection-string').parse;

async function testConnection(url, name) {
  console.log(`\nTesting ${name}...`);
  const config = parse(url);
  // Force rejectUnauthorized to false regardless of what the connection string says
  if (config.ssl === true || typeof config.ssl === 'object' || typeof config.ssl === 'string') {
    config.ssl = { rejectUnauthorized: false };
  } else {
    config.ssl = { rejectUnauthorized: false };
  }
  
  const pool = new Pool(config);
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    console.log('✅ Success:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  const url1 = "postgresql://postgres.yeoerybkosutceirmaxp:%3Fmz9ui*K6H8%24kz7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=disable";
  await testConnection(url1, 'Env var string');
}

run();
