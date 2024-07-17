import { ConnectionString } from 'connection-string';
import { CONCURRENCY } from './consts';
import { Pool }  from 'pg';

const cs = new ConnectionString(process.env.ANALYTICS_DB_CONN_URL);

export const client = new Pool({
  host: cs.hostname,
  database: process.env.ANALYTICS_DB_NAME,
  user: process.env.ANALYTICS_DB_USER,
  password: process.env.ANALYTICS_DB_PWD,
  port: cs.port,
  max: CONCURRENCY,
});

// TODO move this to db file as well