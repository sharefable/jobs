import Cobalt from '@cobaltio/cobalt';
import { TMsgAttrs } from '../types';
import { captureException } from '@sentry/node';

const COBALT_PROD_API_KEY = process.env.COBALT_PROD_API_KEY as string;

const Client: Cobalt = new Cobalt({
  apiKey: COBALT_PROD_API_KEY,
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
    await Client.createLinkedAccount({
      linked_account_id: payload.userEmail,
    });
  } catch(error){
    captureException(error as Error);
  }
};