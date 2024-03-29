import Cobalt from '@cobaltio/cobalt';
import { 
  ActivityTimeline,  
  CobaltEvents, 
  ContactPropertyPayload, 
  LeadAccessInfoOfTour, 
  TMsgAttrs, 
  Event } from '../types';
import { captureException } from '@sentry/node';
import * as logs from '../log';
import * as log from '../log';
import { randomUUID } from 'crypto';

const Client: Cobalt = new Cobalt({
  apiKey: process.env.COBALT_API_KEY as string,
});

interface NewOrgEvent {
  eventName: string;
}

const PAYLOAD_PREFIX = 'payload_';
function getPayloadProps(props: Record<string, string>): Record<string, string> {
  const maps: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.toLowerCase().startsWith(PAYLOAD_PREFIX)) {
      const newKey = key.substring(PAYLOAD_PREFIX.length, key.length);
      maps[newKey] = value;
    }
  }
  return maps;
}

type IProps = NewOrgEvent & TMsgAttrs; 
export const createLinkedAccountForNewUser = async (utProps: TMsgAttrs) => {
  const props = utProps as IProps;
  const payload = getPayloadProps(props as Record<string, string>);
  try{
    logs.info('[vendor] Creating link account in cobalt with id', payload.id);
    await Client.createLinkedAccount({
      linked_account_id: payload.id,
    });
  } catch(error){
    captureException(error as Error);
  }
};

export interface EventPayload {
  payload: string;
}

type CBEventIProps = EventPayload & TMsgAttrs;
export async function sendEventToCobalt(props: TMsgAttrs) {
  
  const utProps = props as CBEventIProps;
  try {
    await Promise.all([
      refreshContactProperty(JSON.parse(utProps.payload) as LeadAccessInfoOfTour),
      activityDemoEvent(JSON.parse(utProps.payload) as LeadAccessInfoOfTour),
    ]);
  } catch (err) {
    log.err('Something went wrong while sending refreshing contact property or tour activity timeline event to vendor', err);
    captureException(err as Error);
  }
}

async function refreshContactProperty (payload: LeadAccessInfoOfTour) {
  
  const contactPropertyPayload: ContactPropertyPayload = {
    email: payload.email,
    ctaClickRate: payload.ctaClickRate,
    demoCompletion: payload.demoCompletion,
    totalTimeSpent: payload.totalTimeSpent,
    demoUniqueViews: payload.demoUniqueViews,
    demoTotalViews: payload.demoTotalViews,
    lastActiveAt: new Date(payload.lastActiveAt).setUTCHours(0, 0, 0, 0),
  };
  
  const contactPropertyEvent: Event = {
    event: CobaltEvents.REFRESH_CONTACT_PROPERTIES,
    payload: contactPropertyPayload,
  };
  await cobaltEventApi(contactPropertyEvent, payload.orgId.toString());
}

async function activityDemoEvent (payload: LeadAccessInfoOfTour) {
 
  const timelinePayload: ActivityTimeline = {
    email: payload.email,
    activityUrl: payload.activityUrl,
    demoName: payload.demoName,
    totalTimeSpent: payload.totalTimeSpent,
    completionPercentage: payload.demoCompletion,
    ourEventId: randomUUID(),
  };

  const contactPropertyEvent: Event = {
    event: CobaltEvents.ACTIVITY_ON_DEMO,
    payload: timelinePayload,
  };
  await cobaltEventApi(contactPropertyEvent, payload.orgId.toString());
}

async function cobaltEventApi (eventPayload: Event, accountId: string): Promise<void>  {
  const resp = await fetch('https://api.gocobalt.io/api/v1/webhook/651e859faa1edef92d87b200', {
    method: 'POST',
    headers: {
      'x-api-key': `${process.env.COBALT_API_KEY}`,
      'Content-Type': 'application/json',
      'linked_account_id': accountId,
    },
    body: JSON.stringify(eventPayload),
  });

  if (!(resp.status >= 200 && resp.status < 300)) {
    log.err(`Something went wrong while sending the event [ ${eventPayload.event} ] to vendor`, resp.statusText);
    throw new Error(`Something went wrong while sending the event [ ${eventPayload.event} ] to vendor`);
  } 
} 