import {createPool} from 'mysql';
import {promisify} from 'util';
import {CONCURRENCY} from './consts';
import { Pool }  from 'pg';
import {ConnectionString} from 'connection-string';

const csApi = new ConnectionString(process.env.DB_CONN_URL);
export const apiConnectionPool  = createPool({
  connectionLimit : CONCURRENCY,
  host : csApi.hostname,
  user : process.env.DB_USER,
  password : process.env.DB_PWD,
  database : process.env.DB_DB,
  port : csApi.port,
});

export const getApiConnection = promisify(apiConnectionPool.getConnection).bind(apiConnectionPool);


const csAnalytics = new ConnectionString(process.env.ANALYTICS_DB_CONN_URL);
export const clientAnalytics = new Pool({
  host: csAnalytics.hostname,
  database: process.env.ANALYTICS_DB_NAME,
  user: process.env.ANALYTICS_DB_USER,
  password: process.env.ANALYTICS_DB_PWD,
  port: csAnalytics.port,
  max: CONCURRENCY,
});
