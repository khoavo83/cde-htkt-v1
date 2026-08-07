const { Pool } = require('pg');

const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'ca-central-1',
  'sa-east-1'
];

async function testRegions() {
  for (const region of regions) {
    const connStr = `postgresql://postgres.yeoerybkosutceirmaxp:%3Fmz9ui%2AK6H8%24kz7@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    console.log(`Testing region ${region}...`);
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
    try {
      const res = await pool.query('SELECT 1 as val');
      console.log(`SUCCESS in region ${region}:`, res.rows);
      pool.end();
      return region;
    } catch (e) {
      console.log(`Failed in ${region}: ${e.message}`);
    }
    pool.end();
  }
  console.log('All regions failed');
}

testRegions();
