import { createPool } from 'mysql';
import { promisify } from 'util';

export const pool  = createPool({
  connectionLimit : 3,
  host : process.env.DB_HOST,
  user : process.env.DB_USER,
  password : process.env.DB_PWD,
  database : process.env.DB_DB,
});

export const getConnection = promisify(pool.getConnection).bind(pool);
