import { DeleteMessageCommandOutput, MessageAttributeValue, SQS } from '@aws-sdk/client-sqs';
import {TMsgAttrs} from './types';
import processVideoFile from './process_video_file';
import * as log from './log';

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

export default function mainMsgLoop() {
  let timer = setTimeout(async () => {
    if (!url) {
      url = (await qUrlResp).QueueUrl;
      if (!url) throw new Error('Queue url could not be retrieved');
    }
    const msgs = await sqsClient.receiveMessage({
      QueueUrl: url,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['*'],
    });
    log.info('Checking for new messages');

    if (msgs.Messages && msgs.Messages.length) {
      const msg = msgs.Messages[0];
      switch (msg.Body) {
        case  'START_PROCESSING_VIDEO_FILE':
          processVideoFile(getMsgAttrMaps(msg.MessageAttributes), deleteMsgPrep(url, msg.ReceiptHandle));
          break;
        default:
          log.err('No handler found for msg', msg.Body);
          break;
      }
    }


    clearTimeout(timer);
    timer = mainMsgLoop();
  }, 40 /* 5 */ * 1000);
  return timer;
}
