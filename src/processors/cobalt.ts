import Cobalt from '@cobaltio/cobalt';
import { AnalyticsUserAidMappingEntity, AthenaTourLeadEntity, Demo, GroupedData, TMsgAttrs } from '../types';
import { captureException } from '@sentry/node';
import * as logs from '../log';
import { getLeadActivity } from '../jobs/common_queries/athena_queries';
import { downloadRawData, runAthenaQuery } from '../jobs/athena';
import { getTourDetails } from '../jobs/lead_activity/queries';
import * as log from '../log';

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

type EventIProps = AnalyticsUserAidMappingEntity[] & TMsgAttrs;

export async function sendEventToCobalt(props: TMsgAttrs) {
  const utProps = props as EventIProps;
  const demoLeads: AnalyticsUserAidMappingEntity[]  = JSON.parse(utProps.demoLeads as string) as  AnalyticsUserAidMappingEntity[];
  const filteredDemoLeads = filterDemoLeads(demoLeads);
  
  for (const demoLead of filteredDemoLeads) {
    try {
      const query = getLeadActivity(demoLead.aid, demoLead.tour_id);
      const queryExecutionId = await runAthenaQuery(query);
      const queryResult: AthenaTourLeadEntity[] = await downloadRawData(queryExecutionId) as AthenaTourLeadEntity[];
      if (queryResult.length === 0) {
        log.info(`No activity found for ${demoLead.email} on tour ${demoLead.tour_id}`);
        continue;
      }
      const demo: Demo[] = await getTourDetails(demoLead.tour_id);

      const groupedData = groupQueryResultBySid(queryResult);
      const timesLeadHasVisitedTheDemo = Object.keys(groupedData).length;
      const totalTimeSpentInDemoByLead = timeSpentInDemo(groupedData);

      if (demoLead.email) {
        const cobaltEventPayload = {
          event: 'Contact Property',
          payload: {
            demoLink: `https://app.sharefable.com/demo/${demo[0].rid}`,
            demoName: demo[0].display_name,
            email: demoLead.email,
            timesLeadHasVisitedTheDemo,
            totalTimeSpentInDemoByLead:`${totalTimeSpentInDemoByLead} sec`,
          },
        };

        const resp = await fetch('https://api.gocobalt.io/api/v1/webhook/651e859faa1edef92d87b200', {
          method: 'POST',
          headers: {
            'x-api-key': `${process.env.COBALT_PROD_API_KEY}`,
            'Content-Type': 'application/json',
            'linked_account_id':  demo[0].belongs_to_org.toString(),
          },
          body: JSON.stringify(cobaltEventPayload),
        });
      
        if (!(resp.status >= 200 && resp.status < 300)) {
          log.err('Something went wrong while sending the event to vendor', resp.status);
          throw new Error('Something went wrong while sending the event to vendor');
        } 
      }
    } catch(error) {
      log.err('Something went wrong while sending Contact Property to vendor', error);
      captureException(error as Error);
    }
  }
}

function groupQueryResultBySid(queryResult: AthenaTourLeadEntity[]): GroupedData {
  const groupedData: GroupedData = {};
  queryResult.forEach((item: AthenaTourLeadEntity) => {
    if (!groupedData[item.sid]) {
      groupedData[item.sid] = [];
    }
    groupedData[item.sid].push(item);
  });
  return groupedData;
}

function timeSpentInDemo(groupedData: GroupedData): number {
  let result = 0;
  for (const sid in groupedData) {
    const group: AthenaTourLeadEntity[] = groupedData[sid];
    group.sort((a, b) => parseInt(a.uts) - parseInt(b.uts));
    const firstUts = parseInt(group[0].uts);
    const lastUts = parseInt(group[group.length - 1].uts);
    const timeDifference = lastUts - firstUts;
    result += timeDifference + 5;
  }
  return result;
}

function filterDemoLeads(demoLeads: AnalyticsUserAidMappingEntity[]): AnalyticsUserAidMappingEntity[] {
  const emailMap: Record<string, AnalyticsUserAidMappingEntity> = {};

  demoLeads.forEach((obj: AnalyticsUserAidMappingEntity) => {
    if (obj.email && obj.email.trim() !== '') {
      if (!(obj.email in emailMap) || emailMap[obj.email].date_ymd < obj.date_ymd) {
        emailMap[obj.email] = obj;
      }
    }
  });
  return Object.values(emailMap);
}