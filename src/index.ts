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

if (!( process.env.APP_ENV
  && process.env.SQS_Q_REGION
  && process.env.SQS_Q_NAME
  && process.env.DB_CONN_URL
  && process.env.DB_USER
  && process.env.DB_PWD
  && process.env.ETS_REGION
  && process.env.TRANSCODER_PIPELINE_ID
  && process.env.AWS_S3_REGION
  && process.env.AWS_GLUE_REGION
  && process.env.AWS_GLUE_DB_NAME
  && process.env.AWS_GLUE_CRAWLER_NAME
  && process.env.AWS_ATHENA_OUTPUT_LOCATION
  && process.env.AWS_ATHENA_REGION)) {
  throw new Error('Environment vars are not loaded properly');
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
