import Anthropic from '@anthropic-ai/sdk';

// Key is in the format of accname|key;accname|key
const keys = process.env.ANTHORIPC_KEY as string;
const keyAccPairs = keys.split(';');


export const accounts: string[] = [];
export const clients: Anthropic[] = [];
for (const keyAndAcc of keyAccPairs) {
  const [acc, apiKey] = keyAndAcc.split('|');
  accounts.push(acc);
  clients.push(
    new Anthropic({
      apiKey,
    }),
  );
}

