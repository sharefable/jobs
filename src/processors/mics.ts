import fetch from 'node-fetch';
import { TMsgAttrs } from '../types';
import * as log from '../log';
import { NfEvents, ReqNfHook } from 'api-contract';
import mailchimp from '@mailchimp/mailchimp_marketing';
import { captureException } from '@sentry/node';
import { createLinkedAccountForNewUser } from './cobalt';
import runIntegration from './integrations';
import RetryableErr from '../retryable-err';

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIP_SERVER_PREFIX,
});

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
export const processEventsForDestination = async (utProps: TMsgAttrs) => {
  const props = utProps as IProps;
  try {
    const payloadVarStr = getPayloadProps(props as Record<string,string>);
    let text = '';
    switch (props.eventName) {
      case NfEvents.NEW_USER_SIGNUP: {
        text = `\`\`\`\nevent_name: ${props.eventName}${payloadVarStr}\nenv: ${process.env.APP_ENV}\n\`\`\``;
        await Promise.all([
          notifySlack(slackWebhookUrl, text),
          addMailChimpContact(props as Record<string,string>),
        ]);
        break;
      } 

      case NfEvents.EBOOK_DOWNLOAD: {
        text = `\`\`\`\nevent_name: ${props.eventName}${payloadVarStr}\nenv: ${process.env.APP_ENV}\n\`\`\``;
        await notifySlack(slackWebhookUrl, text);
        break;
      }

      case NfEvents.NEW_ORG_CREATED : {
        createLinkedAccountForNewUser(utProps);
        break;
      }

      case NfEvents.RUN_INTEGRATION: {
        runIntegration(utProps.payload_event, utProps.payload_eventPayload, utProps.payload_integrationId);
        break;
      }
    
      default:
        break;
    } 
  } catch (error) {
    console.log((error as Error).stack);
    captureException(error as Error);
    if (error instanceof RetryableErr) {
      throw error;
    }
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
  const email: string = payload.payload_emailId;
  const firstName: string = payload.payload_firstName ?? undefined;
  const lastName: string = payload.payload_lastName ?? undefined;

  log.info(`email=[${email}] firstName=[${firstName}] lastName=[${lastName}]`);

  if (!(email && firstName)) {
    log.warn('Either email or firstName is empty. Expecting upstream to retry...');
    return;
  }

  // listId found in Audience > all contact > settings > audience name and defaults tab
  const response = await mailchimp.lists.addListMember('4309a88a36', {
    email_address: email,
    status: 'subscribed',
    merge_fields: {
      FNAME: firstName,
      LNAME: lastName,
    },
    tags: ['Free Trial Signup'],
  });
  const data = (response as any).id ? { id: (response as any).id } : response;
  log.info(
    `mailchip contact addition response ${JSON.stringify(data, null, 2)}.`,
  );
}
  
