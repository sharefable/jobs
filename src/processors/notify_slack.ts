import fetch from 'node-fetch';
import { TMsgAttrs } from '../types';
import * as log from '../log';
import { NfEvents, ReqNfHook } from 'api-contract';

const slackWebhookUrl = 'https://hooks.slack.com/services/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';

type IProps = ReqNfHook & TMsgAttrs;
export const processEventsToNotify = async (utProps: TMsgAttrs) => {
  const props = utProps as IProps;
  try {
    let text = '';
    switch (props.eventName) {
      case NfEvents.NEW_USER_SIGNUP: {
        text = `\`\`\`\nevent_name: ${props.eventName}\nemail_id: ${props.payload_emailId}\norg_status: ${props.payload_orgStatus}\nenv: ${process.env.APP_ENV}\n\`\`\``;
        await notifySlack(slackWebhookUrl, text);
        break;
      } 

      case NfEvents.EBOOK_DOWNLOAD: {
        text = `\`\`\`\nevent_name: ${props.eventName}\nfirst_name: ${props.payload_firstName}\nemail_id: ${props.payload_email}\nenv: ${process.env.APP_ENV}\n\`\`\``;
        await notifySlack(slackWebhookUrl, text);
        break;
      }
    
      default:
        break;
    } 
  } catch (error) {
    console.log(error);
    // TODO: Raise sentry error
  }
};

const formatProps = (text: string) => {
  return {
    blocks: [
      {
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': text,
        },
      },
    ],
  };
};

const notifySlack = async (url: string, text: string) => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formatProps(text)),
  });
  if (resp.ok) {
    log.info('Notification sent');
    return;
  } 
  log.info('Notification failed');
};
  