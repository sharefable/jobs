import {createPool} from 'mysql';
import {promisify} from 'util';
import {CONCURRENCY} from './consts';
import {ConnectionString} from 'connection-string';

const cs = new ConnectionString(process.env.DB_CONN_URL);
export const pool  = createPool({
  connectionLimit : CONCURRENCY,
  host : cs.hostname,
  user : process.env.DB_USER,
  password : process.env.DB_PWD,
  database : process.env.DB_DB,
  port : cs.port,
});

export const getConnection = promisify(pool.getConnection).bind(pool);
