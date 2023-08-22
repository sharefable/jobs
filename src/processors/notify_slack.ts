import fetch from 'node-fetch';
import { TMsgAttrs } from '../types';
import * as log from '../log';

const slackWebhookUrl = 'https://hooks.slack.com/services/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';

export const processEventsToNotify = async (utProps: TMsgAttrs) => {
  try {
    let text = '';
    switch (utProps.eventName) {
      case 'NEW_USER_SIGNUP': {
        text = `\`\`\`\nevent_name: ${utProps.eventName}\nemail_id: ${utProps.emailId}\norg_status: ${utProps.orgStatus}\n\`\`\``;
        await notifySlack(slackWebhookUrl, text);
        break;
      } 

      case 'EBOOK_DOWNLOAD': {
        text = `\`\`\`\nevent_name: ${utProps.eventName}\nfirst_name: ${utProps.payload_firstName}\nemail_id: ${utProps.payload_email}\n\`\`\``;
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
  