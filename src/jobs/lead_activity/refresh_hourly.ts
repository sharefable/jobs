import { JobType } from '../../api-contract';
import { getLeadActivity } from '../common_queries/athena_queries';
import { AnalyticsUserAidMappingEntity, AthenaTourLeadEntity } from '../../types';
import { getTourLeadsForYmd } from './queries';
import * as log from '../../log';
import { downloadRawData, runAthenaQuery } from '../athena';
import { JobBase } from '../../jobs/base/job';
import { getYmd } from '../../utils';
import { qUrlResp, sqsClient } from '../../main_msg_loop';

export const refreshHourlyLeadActivity = async () => {
  const tourLeadJob = new TourLeadJob();
  await tourLeadJob.executeJob();
};

export class TourLeadJob extends JobBase {

  protected getJobType(): JobType {
    return JobType.REFRESH_LEAD_ACTIVITY;
  }

  protected async execute(): Promise<void> {
    let url: string | undefined;
    if (!url) {
      url = (await qUrlResp).QueueUrl;
      if (!url) throw new Error('Queue url could not be retrieved');
    }
    const currentYmd = getYmd(this.baseValues.jobInfo.jobDataScanningTime);
    const tourLeads: AnalyticsUserAidMappingEntity[] = await getTourLeadsForYmd(currentYmd);
    const sendMessageRequest = {
      QueueUrl: url, 
      MessageBody: 'CBE',
      MessageAttributes: {
        demoLeads: {
          DataType: 'String',
          StringValue: JSON.stringify(tourLeads),
        },
      },
    };
    await Promise.all([
      sqsClient.sendMessage(sendMessageRequest),
      await this.sendLeadActivityToS3(tourLeads),
    ]);
  }

  protected async sendLeadActivityToS3(tourLeads: AnalyticsUserAidMappingEntity[]): Promise<void>  {
    for (const tourLead of tourLeads) {
      const query = getLeadActivity(tourLead.aid, tourLead.tour_id);
      const queryExecutionId = await runAthenaQuery(query);
      const queryResult: AthenaTourLeadEntity[] = await downloadRawData(queryExecutionId) as AthenaTourLeadEntity[];
      if (queryResult.length === 0) {
        log.info(`Response is empty for the queryExecutionId ${queryExecutionId}. So continuing`);
        continue;
      }
      try {
        const resp = await fetch(`${process.env.API_SERVER_ENDPOINT}/v1/updleadanalytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tourId: tourLead.tour_id, aid: tourLead.aid, data: JSON.stringify(queryResult)}),
        });
        if (!(resp.status >= 200 && resp.status < 300)) {
          log.err('Something went wrong while sending data to s3', resp.status);
          throw new Error('Something went wrong while sending data to s3');
        } 
      } catch(err) {
        log.err('Something went wrong while sending data server', err);
        throw new Error('Something went wrong while sending data server');
      }
      log.info(`User level analytics is uploaded to s3 successfully for aid ${tourLead.aid}`);
    }
  }
}