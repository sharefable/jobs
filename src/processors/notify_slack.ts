import fetch from 'node-fetch';
import { TMsgAttrs } from '../types';
import * as log from '../log';
import { NfEvents, ReqNfHook } from 'api-contract';


// mailchimp.setConfig({
//   apiKey: "YOUR_API_KEY",
//   server: "YOUR_SERVER_PREFIX",
// });


const slackWebhookUrl = 'https://hooks.slack.com/services/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';

const PAYLOAD_PREFIX = 'payload_';
function getPayloadProps(props: Record<string, string>): string {
  // const maps: Record<string, string> = {};
  let payloadAsText = '';
  for (const [key, value] of Object.entries(props)) {
    if (key.toLowerCase().startsWith(PAYLOAD_PREFIX)) {
      const newKey = key.substring(PAYLOAD_PREFIX.length, key.length);
      payloadAsText += '\n'+`${newKey}: ${value}`;
    }
  }
  return payloadAsText;
}

type IProps = ReqNfHook & TMsgAttrs;
export const processEventsToNotify = async (utProps: TMsgAttrs) => {
  const props = utProps as IProps;
  try {
    const payloadVarStr = getPayloadProps(props as Record<string,string>);
    let text = '';
    switch (props.eventName) {
      case NfEvents.NEW_USER_SIGNUP: {
        text = `\`\`\`\nevent_name: ${props.eventName}${payloadVarStr}\nenv: ${process.env.APP_ENV}\n\`\`\``;
        await notifySlack(slackWebhookUrl, text);
        await addMailChimpContact(props as Record<string,string>);
        break;
      } 

      case NfEvents.EBOOK_DOWNLOAD: {
        text = `\`\`\`\nevent_name: ${props.eventName}${payloadVarStr}\nenv: ${process.env.APP_ENV}\n\`\`\``;
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

async function addMailChimpContact(payload: Record<string,string>) {

};
  
