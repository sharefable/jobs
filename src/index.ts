import express, {Express, NextFunction, Request, Response} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mainMsgLoop from './main_msg_loop';
import * as log from './log';
import {promisify} from 'util';
import {apiConnectionPool, clientAnalytics} from './db';
import { sentryInitialize } from './sentry';
import addSlackHttpListeners from './http/slack';
import pino from 'pino-http';
import resolveUserIfAny, {
  verifyAuthToken,
  normalizeTokenForAuthOrigin,
  restoreRawToken,
  resolveFableUser,
} from './middlewares/resolve-principal';
import addLlmOpsHttpListeners from './http/llm-ops';
import globalErrorHandler from './middlewares/global-err-handler';
import RealtimeRelay from './rt-relay';
import { addContactToSmartLeads } from './processors/mics';

// const RealtimeRelay = require('./rt-relay.js');

const PORT = 8081;

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
  'ANALYTICS_DB_CONN_URL',
  'ANALYTICS_DB_NAME',
  'ANALYTICS_DB_USER',
  'ANALYTICS_DB_PWD',
  'API_SERVER_ENDPOINT',
  'COBALT_API_KEY',
  'SLACK_FABLE_BOT_BOT_USER_TOKEN',
  'SMART_LEAD_API_KEY',
  'AUTH0_AUDIENCES',
  'AUTH0_ISSUER_URL',
  'ANTHORIPC_KEY',
  'OPENAI_KEY',
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

const app: Express = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(pino({
  redact: ['req.headers', 'res.headers'],
  level: 'warn',
}));
app.use('/v1/f/*', [
  verifyAuthToken,
  normalizeTokenForAuthOrigin,
  resolveUserIfAny,
  restoreRawToken,
  resolveFableUser,
]);
app.use(globalErrorHandler);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'up' });
});

addLlmOpsHttpListeners(app);
addSlackHttpListeners(app);


const server = app.listen(PORT, async () => {
  log.info(`Server is running at http://localhost:${PORT}`);
});
const rtRelay = new RealtimeRelay(server);

async function shutDown() {
  log.warn('Gracefully shutting down');
  log.warn('Closing db connection pool...');
  await promisify(apiConnectionPool.end).bind(apiConnectionPool)();
  await clientAnalytics.end();
  log.warn('Closing server connection...');
  rtRelay.close();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    log.err('Couldn\'t close server in time. Force killing...');
    process.exit(1);
  }, 10000);
}

// Expand types
declare global {
  namespace Express {
    interface Request {
      house: {
        iam: {
          id: string;
          orgId: number;
        }
      },
      relay: {
        rawToken: string;
        orgId: number;
      }
    }
  }
}
