import {DeleteMessageCommandOutput, MessageAttributeValue, SQS} from '@aws-sdk/client-sqs';
import {TMsgAttrs} from './types';
import transcodeVideo from './processors/video_transcoder';
import resizeImg from './processors/image_resizer';
import * as log from './log';
import {getConnection} from './db';
import {JobProcessingStatus} from './api-contract';
import {MysqlError} from 'mysql';
import NonRunnableErr from './irrecoverable_err';

const sqsClient = new SQS({ region: process.env.SQS_Q_REGION });
const qUrlResp = sqsClient.getQueueUrl({ QueueName: process.env.SQS_Q_NAME });

let url: string | undefined;

function deleteMsgPrep(qUrl: string, id: string | undefined): () => Promise<DeleteMessageCommandOutput> {
  return () => {
    return sqsClient.deleteMessage({
      QueueUrl: url,
      ReceiptHandle: id,
    });
  };
}

function getMsgAttrMaps(attrs?: Record<string, MessageAttributeValue>): TMsgAttrs {
  attrs = attrs || {};
  const flatAttrs: Record<string, string | undefined | null> = {};
  for (const [key, val] of Object.entries(attrs)) {
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
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['*'],
    });

    if (msgs.Messages && msgs.Messages.length) {
      const msg = msgs.Messages[0];
      const msgAttrs = getMsgAttrMaps(msg.MessageAttributes);
      const deleteMsg = deleteMsgPrep(url, msg.ReceiptHandle);
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

          case 'RESIZE_IMG': {
            jobInfo = await resizeImg(msgAttrs);
            break;
          }

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


    clearTimeout(timer);
    timer = mainMsgLoop();
  }, /* 40 */ 5 * 1000);
  return timer;
}
