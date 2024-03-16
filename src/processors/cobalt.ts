import Cobalt from '@cobaltio/cobalt';
import { TMsgAttrs } from '../types';
import { captureException } from '@sentry/node';
import * as logs from '../log';

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
