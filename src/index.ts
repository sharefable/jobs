import express, { Request, Response, Express } from 'express';
import bodyParser from 'body-parser';
import mainMsgLoop from './main_msg_loop';
import * as log from './log';
import { promisify } from 'util';
import { pool } from './db';

const PORT = 8081;

const INFO = {
  timeInSecSinceLastPoll: 0,
};

if (!(process.env.SQS_Q_REGION
  && process.env.SQS_Q_NAME
  && process.env.AWS_PROFILE
  && process.env.AWS_DEFAULT_PROFILE
  && process.env.DB_HOST
  && process.env.DB_USER
  && process.env.DB_PWD
  && process.env.DB_DB
  && process.env.S3_REGION)) {
  throw new Error('Environment vars are not loaded properly');
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

mainMsgLoop();

const app: Express = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'up' });
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
