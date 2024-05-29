import fetch from 'node-fetch';
import { Campaign, Lead, TMsgAttrs } from '../types';
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
const SMART_LEAD_API_KEY = process.env.SMART_LEAD_API_KEY;

const SMART_LEAD_BASE_URL = 'https://server.smartlead.ai/api/v1';

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
        await runIntegration(utProps.payload_event, utProps.payload_eventPayload, utProps.payload_integrationId);
        break;
      }

      case NfEvents.NEW_USER_SIGNUP_WITH_SUBS: {
        addContactToSmartLeads(props as Record<string,string>);
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


const availableCampaigns: Record<number, string[]> = {
  381576 : ['LIFETIME_TIER1'],
  381741 : ['LIFETIME_TIER2'],
  381747 : ['LIFETIME_TIER3'],
  381455 : ['SOLO'],
  381761 : ['STARTUP', 'BUSINESS'],
};

export async function addContactToSmartLeads(payload: Record<string,string>): Promise<void> {
  
  const email: string = payload.payload_email;
  const firstName: string = payload.payload_firstName ?? undefined;
  const lastName: string = payload.payload_lastName ?? undefined;
  const subs: string = payload.payload_subs;

  log.info(`email=[${email}] firstName=[${firstName}] lastName=[${lastName}]`);

  if (!(email && firstName)) {
    log.warn('Either email or firstName is empty. Expecting upstream to retry...');
    return;
  }

  const leadList: Lead[] = [{
    email,
    first_name: firstName,
    last_name: lastName,
  }];
  try {
    const campaignId: number | undefined = findCampaignId(subs);
    if (campaignId === undefined) {
      throw new Error(`Campaign not found for the plan ${subs}`);
    }
  
    const campaigns: Campaign[] = await listAllCampaigns();
    const isCampaignExists = findCampaignIdInCampaignList(campaigns, campaignId);
    
    if (!isCampaignExists) {
      throw new Error(`Campaign id ${campaignId} doesn't exist in listed campaign`);
    }
    
    await addLeads(leadList, campaignId);
  } catch (err) {
    log.err((err as Error).message);
    captureException(err as Error);
  }
}

export async function addLeads(leadList: Lead[], campaignId: number): Promise<void> {

  const resp = await fetch(`${SMART_LEAD_BASE_URL}/campaigns/${campaignId}/leads?api_key=${SMART_LEAD_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:JSON.stringify({lead_list: leadList}),

  });
  if (!resp.ok) {
    throw new Error(`Adding lead to a campaing is failed ${resp}`);
  } 
  log.info(`Successfully added lead [ ${leadList[0].email} ] to a campaing`);
}

export async function listAllCampaigns(): Promise<Campaign[]> {
  const resp = await fetch(`${SMART_LEAD_BASE_URL}/campaigns?api_key=${SMART_LEAD_API_KEY}`, {
    method: 'GET',
  });
  if (!resp.ok) {
    throw new Error(`Listing of campaigns failed ${resp}`);
  } 
  return await resp.json();
}

function findCampaignId (subs: string ): number | undefined {

  for (const [key, value] of  Object.entries<string[]>(availableCampaigns)) {
    if (value.includes(subs)) {
      return parseInt(key);
    }
  }
  return undefined;
}

function findCampaignIdInCampaignList(campaignList: Campaign[], campaignId: number | undefined): boolean {
  
  for (const campaign of campaignList) {
    if (campaign.id === campaignId) {
      return true;
    }
  }
  return false;
}