import fetch from 'node-fetch';
import { TMsgAttrs } from '../types';
import { NotifySlackJobInfo } from '../api-contract';
import { deepcopy } from '../utils';

const slackWebhookUrl = 'https://hooks.slack.com/services/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';

type IProps = NotifySlackJobInfo & TMsgAttrs;
export const newUserNotify = async (utProps: TMsgAttrs) => {
  const props = utProps as IProps;
  switch (props.eventName) {
    case 'NEW_USER_SIGNUP': {
      const resp = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formatProps(props)),
      });
      if (resp.status === 200) {
        break;
      }
      throw new Error('NF failed');
    } 
    
    default:
      break;
  } 
  const updatedInfo: NotifySlackJobInfo = deepcopy<NotifySlackJobInfo>(props);
  return updatedInfo;
};

const formatProps = (props: IProps) => {
  return {
    blocks: [
      {
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': `\`\`\`\nevent_name: ${props.eventName}\nemail_id: ${props.emailId}\norg_status: ${props.orgStatus}\n\`\`\``,
        },
      },
    ],
  };
};
  