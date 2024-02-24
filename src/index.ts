import express, {Express, Request, Response} from 'express';
import bodyParser from 'body-parser';
import mainMsgLoop from './main_msg_loop';
import mainScheduleLoop, {runHouerlyJob} from './main_schedule_loop';
import * as log from './log';
import {promisify} from 'util';
import {pool} from './db';
import { sentryInitialize } from './sentry';

const PORT = 8081;

const INFO = {
  timeInSecSinceLastPoll: 0,
};


let envLoadingHasErr = false;
const envLoadingStatus = [
  'APP_ENV',
  'SQS_Q_REGION',
  'SQS_Q_NAME',
  'MAILCHIMP_API_KEY',
  'MAILCHIP_SERVER_PREFIX',
  'DB_CONN_URL',
  'DB_USER',
  'DB_PWD',
  'DB_DB',
  'ETS_REGION',
  'TRANSCODER_PIPELINE_ID',
  'AWS_S3_REGION',
  'AWS_GLUE_REGION',
  'AWS_GLUE_DB_NAME',
  'AWS_GLUE_CRAWLER_NAME',
  'AWS_ATHENA_OUTPUT_LOCATION',
  'AWS_ATHENA_REGION',
].reduce(( status, name ) => {
  if (process.env[name]) status[name] = 'ok';
  else {
    status[name] = 'not-found';
    envLoadingHasErr = true;
  }
  return status;
}, {} as Record<string, 'ok' | 'not-found'>);

if (envLoadingHasErr) {
  log.warn(JSON.stringify(envLoadingStatus, null, 2));
  log.err('Required env variables are not found');
  process.exit(1);
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

if (process.env.APP_ENV === 'prod' || process.env.APP_ENV === 'staging') {
  sentryInitialize();
} 

mainMsgLoop();
mainScheduleLoop();

const app: Express = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'up' });
});

app.post('/triggerhourly', () => {
  runHouerlyJob();
  log.info('Triggered');
});

app.get('/info', (req: Request, res: Response) => {
  res.json({ ...INFO });
});

const server = app.listen(PORT, async () => {
  log.info(`Server is running at http://localhost:${PORT}`);
});

async function shutDown() {
  log.warn('Gracefully shutting down');
  log.warn('Closing db connection pool...');
  await promisify(pool.end).bind(pool)();
  log.warn('Closing server connection...');
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    log.err('Couldn\'t close server in time. Force killing...');
    process.exit(1);
  }, 10000);
}
