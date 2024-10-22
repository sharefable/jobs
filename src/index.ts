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
import addAudioOpsHttpListeners from './http/audio-ops';
import globalErrorHandler from './middlewares/global-err-handler';
import OpenAI from 'openai';
// import RealtimeRelay from './rt-relay';
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
  'AWS_ASSET_FILE_S3_BUCKET',
  'AWS_ASSET_FILE_S3_BUCKET_REGION',
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY as string,
});


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

app.get('/stream-audio', async (req, res) => {
  try {
    // Fetch streaming TTS audio from OpenAI
    const ttsStream = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: `
Second thing I noticed is that there's no throttling of the read stream when the callback invokes res.write. When the client connected, 50MB of data was near instantly pushed into the write stream. You can hack in a console.log statement to print out chunk.length on each data callback to see what I mean.

I suppose the browser pulled it all down quickly since I was on localhost. But if the client has limited buffer and is streaming at pace with the music, won't that put a lot of back pressure of bytes onto the node process? Consider hooking the drain event on the response object and write into the response stream at the pace it wants. I could be mistaken, but there's no free lunch for buffering if the client isn't doing much buffering itself.

Final thing. I don't know the files you are working with, but if any of the ID3 headers contain some sort of length hint, that might be confusing the browser client's player. Hence, the Content-Length header inserted above should fix that. (Disclaimer: I don't think ID3 headers actually contain a length hint. I could be mistaken).
      `.trim(),
    });

    // Set appropriate headers for streaming audio (e.g., for MP3)
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the audio stream from OpenAI to the client response
    (ttsStream.body as any).pipe(res);
  } catch (error) {
    console.error('Error streaming TTS:', error);
    res.status(500).send('Error streaming audio');
  }
});

addLlmOpsHttpListeners(app);
addSlackHttpListeners(app);
addAudioOpsHttpListeners(app);


const server = app.listen(PORT, async () => {
  log.info(`Server is running at http://localhost:${PORT}`);
});
let rtRelay: any;
(async () => {
  const RealtimeRelay = await import('./rt-relay');
  rtRelay = new (RealtimeRelay.default as any)(server);
})();

async function shutDown() {
  log.warn('Gracefully shutting down');
  log.warn('Closing db connection pool...');
  await promisify(apiConnectionPool.end).bind(apiConnectionPool)();
  await clientAnalytics.end();
  log.warn('Cloing server connection...');
  rtRelay && rtRelay.close();
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
