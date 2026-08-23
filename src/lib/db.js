import { Pool } from 'pg';

let pool;

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool = global._pgPool;

export const query = (text, params) => pool.query(text, params);
export { pool };
export default pool;
