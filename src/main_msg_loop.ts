import {DeleteMessageCommandOutput, MessageAttributeValue, SQS} from '@aws-sdk/client-sqs';
import {TMsgAttrs} from './types';
import transcodeVideo from './processors/media/video_transcoder';
import transcodeAudio from './processors/media/audio_transcoder';
// import resizeImg from './processors/image_resizer';
import * as log from './log';
import {getConnection} from './db';
import {JobProcessingStatus} from './api-contract';
import NonRunnableErr from './irrecoverable_err';
import {CONCURRENCY} from './consts';
import { processEventsForDestination } from './processors/mics';
import { sendEventToCobalt } from './processors/cobalt';
import RetryableErr from './retryable-err';
import createDemoGif from './processors/demo_gif';
import * as Sentry from '@sentry/node';
import { MysqlError } from 'mysql';
import { onReceiveMessageFromSqs } from './main_schedule_loop';

export const sqsClient = new SQS({ region: process.env.SQS_Q_REGION });
export const qUrlResp = sqsClient.getQueueUrl({ QueueName: process.env.SQS_Q_NAME });

let url: string | undefined;

function deleteMsgPrep(qUrl: string, id: string | undefined): () => Promise<DeleteMessageCommandOutput> {
  return () => {
    return sqsClient.deleteMessage({
      QueueUrl: url,
      ReceiptHandle: id,
    });
  };
}

const INTERNAL_MESSAGE_PREFIX = '__fable_internal__';

function getMsgAttrMaps(attrs?: Record<string, MessageAttributeValue>): TMsgAttrs {
  attrs = attrs || {};
  const flatAttrs: Record<string, string | undefined | null> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (key.startsWith(INTERNAL_MESSAGE_PREFIX)) continue;
    flatAttrs[key] = val.StringValue;
  }
  return flatAttrs;
}

function throwDeferredErr(e: Error) {
  const timer = setTimeout(() => {
    clearTimeout(timer);
    throw e;
  }, 0);
}

export default function mainMsgLoop() {
  let timer = setTimeout(async () => {
    if (!url) {
      url = (await qUrlResp).QueueUrl;
      if (!url) throw new Error('Queue url could not be retrieved');
    }

    log.info('Checking for new messages');
    const msgs = await sqsClient.receiveMessage({
      QueueUrl: url,
      MaxNumberOfMessages: CONCURRENCY,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['*'],
    });

    if (msgs.Messages && msgs.Messages.length) {
      log.info(`Got ${msgs.Messages.length} msgs`);
      await Promise.all(msgs.Messages.map(async (msg) => {
        log.info(`Processing message ${msg.Body}`);
        const msgAttrs = getMsgAttrMaps(msg.MessageAttributes);
        const deleteMsg = deleteMsgPrep(url!, msg.ReceiptHandle);
        if (msg.Body === 'NF') {
          try {
            await processEventsForDestination(msgAttrs);
          } catch (e) {
            if (e instanceof RetryableErr) {
              if (!(e as RetryableErr).isRetryable) return;
              let retryCount = 0;
              if (`${INTERNAL_MESSAGE_PREFIX}retryCount` in (msg.MessageAttributes || {})) {
                retryCount = +(msg.MessageAttributes![`${INTERNAL_MESSAGE_PREFIX}retryCount`]?.StringValue || '0');
              }
              if (retryCount >= 2) {
                console.log('Retrying exhaused');
                return;
              }
              console.log(`[${retryCount + 1}/3] Retrying...`);
              sqsClient.sendMessage({
                QueueUrl: url,
                MessageBody: msg.Body,
                DelaySeconds: 60 * 15,
                MessageAttributes: {
                  ...msg.MessageAttributes,
                  [`${INTERNAL_MESSAGE_PREFIX}retryCount`]: {
                    'DataType': 'String',
                    'StringValue': String((retryCount + 1)),
                  },
                },
              });
            } else {
              console.warn('Not retryable error');
              console.error((e as Error).stack);
            }
          } finally {
            await deleteMsg();
          }
        } else if (msg.Body === 'CBE') {
          await sendEventToCobalt(msgAttrs);
          await deleteMsg();
        } else if (msg.Body === 'TRIGGER_JOB') {
          await onReceiveMessageFromSqs(msgAttrs);
        } else {
          if (!msgAttrs.key) throwDeferredErr(new Error('key is required for job processing but not found'));

          const conn = await getConnection();
          let jobInfo: object = {};

          // Marking in db that the process is starting
          await new Promise((res, rej) => {
            conn!.query(
              'UPDATE jobs SET processing_status = ? WHERE job_key = ?',
              [JobProcessingStatus.InProcess, msgAttrs.key],
              (err: MysqlError | null) => {
                if (err) rej(err);
                else res(1);
              });
          });

          try {
            switch (msg.Body) {
              case  'TRANSCODE_VIDEO': {
                jobInfo = await transcodeVideo(msgAttrs);
                break;
              }

              // WARN we stoped resizing for the timebeing due to compatibility issue of ffmpeg with node build version
              //      right now resizing is not done for any kind of assets
              // case 'RESIZE_IMG': {
              //   jobInfo = await resizeImg(msgAttrs);
              //   break;
              // }

              case 'CREATE_DEMO_GIF': {
                jobInfo = await createDemoGif(msgAttrs);
                break;
              }

              case  'TRANSCODE_AUDIO': {
                jobInfo = await transcodeAudio(msgAttrs);
                break;
              }
            
              // case 'DELETE_ASSET': {
              //   jobInfo = await deleteAsset(msgAttrs);
              //   break;
              // }

              default: {
                const errMsg =`No handler found for msg ${msg.Body}`;
                log.err(errMsg);
                throw new NonRunnableErr(errMsg);
              }
            }
            await new Promise((res, rej) => {
              conn!.query(
                'UPDATE jobs SET processing_status = ?, info = ? WHERE job_key = ?',
                [JobProcessingStatus.Processed, JSON.stringify(jobInfo), msgAttrs.key],
                (err: MysqlError | null) => {
                  if (err) rej(err);
                  else res(1);
                });
            });
            await deleteMsg();
          } catch (e) {
            Sentry.captureException(e);
            await new Promise((res, rej) => {
              conn!.query(
                'UPDATE jobs SET processing_status = ?, failure_reason = ? WHERE job_key = ?',
                [JobProcessingStatus.Failed, (e as Error).message, msgAttrs.key],
                (err: MysqlError | null) => {
                  if (err) rej(err);
                  else res(1);
                });
            });
            log.err((e as Error).message);
            if (e instanceof NonRunnableErr) await deleteMsg();
          } finally {
            conn.release();
          }
        }
      }));
    }

    clearTimeout(timer);
    timer = mainMsgLoop();
  }, 15 * 1000 /* TODO implement something like exponential backoff to reduce msg polling to save cost */);
  return timer;
}
