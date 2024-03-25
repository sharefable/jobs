import { JobType, Lead360, ReqLead360, ReqListLead360, RespHouseLeadInfo } from '../../api-contract';
import { getLeadActivity } from '../common_queries/athena_queries';
import { AnalyticsUserAidMappingEntity, AthenaTourLeadEntity, Demo, GroupedData, TourData } from '../../types';
import { getTourDetails, getTourLeadsForYmd } from './queries';
import * as log from '../../log';
import { downloadRawData, runAthenaQuery } from '../athena';
import { JobBase } from '../../jobs/base/job';
import { 
  getCreatedAtAndUpdateAt,
  getMidnightTimestamp,
  getYmd,
  groupQueryResultBySid,
  timeSpentInDemo,
  tourAnnoationsLength } from '../../utils';
import { qUrlResp, sqsClient } from '../../main_msg_loop';
import { getHouseLeadInfo, getTourAssetPath, getTourDataFile, saveLead360 } from '../../api';

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
    const upperBound = getMidnightTimestamp(currentYmd);
    const lowerBound = getCreatedAtAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
    const tourLeads: AnalyticsUserAidMappingEntity[] = await getTourLeadsForYmd(lowerBound, upperBound);
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
      this.sendLeadActivityToS3(tourLeads),
      this.populateLead360(tourLeads),
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

  protected async populateLead360 (tourLeads: AnalyticsUserAidMappingEntity[]) : Promise<void> {
    try {
      for (const tourLead of tourLeads) {
        const tour: Demo[] = await getTourDetails(tourLead.tour_id);
  
        const houseLeadInfo: RespHouseLeadInfo | null = await getHouseLeadInfo(tour[0].belongs_to_org, tourLead.email);
        if (!houseLeadInfo) {
          log.warn(`House lead info not found for for tour ${tourLead.tour_id}, skipping`);
          continue;
        }
  
        const query = getLeadActivity(tourLead.aid, tourLead.tour_id);
        const queryExecutionId = await runAthenaQuery(query);
        const queryResult: AthenaTourLeadEntity[] = await downloadRawData(queryExecutionId) as AthenaTourLeadEntity[];
        
        if (queryResult.length === 0) {
          log.info(`Athena query response is empty for the queryExecutionId ${queryExecutionId}. So continuing`);
          continue;
        }
        const reqListLead360: ReqListLead360 = await this.preapreDataToPopulateLead360(tourLead, houseLeadInfo, queryResult);
        await saveLead360(reqListLead360);
      }
    } catch (err) {
      log.err('Something went wrong while populating lead 360 table', err);
      throw new Error(`Something went wrong while populating lead 360 table ${err}`);
    }
   
  }

  protected async preapreDataToPopulateLead360 (
    tourLead: AnalyticsUserAidMappingEntity,
    houseLeadInfo: RespHouseLeadInfo,
    queryResult: AthenaTourLeadEntity[] ): Promise<ReqListLead360> {

    const tourDataFile: string = await getTourAssetPath(tourLead.tour_id);
    const dataFileTourData = (await getTourDataFile(tourDataFile)) as TourData;
   
    const tourAnnLength = tourAnnoationsLength(dataFileTourData);
    const uniquePayloadAnnIds = [...new Set(queryResult.map(item => item.payload_ann_id))].length;

    const groupedBySid: GroupedData = groupQueryResultBySid(queryResult);
    const sessionsCreated: number = Object.keys(groupedBySid).length;
    const timeSpentInATour: number = timeSpentInDemo(groupedBySid);
    const lastInteractedAt: Date = new Date(Math.max(...queryResult.map(item => parseInt(item.uts))) * 1000);

    const matchedLead360WithTourId: Lead360[] = houseLeadInfo!.info360.filter(item => item.tourId === tourLead.tour_id);
    const aggregationRow: Lead360 = houseLeadInfo!.info360.filter(item => item.tourId === 0)[0];
    
    const reqListLead360: ReqListLead360  = {
      reqLead360: [],
    };
    const updatedLead360: ReqLead360[] = [];
    
    const lead360: ReqLead360 = {
      ...(matchedLead360WithTourId.length <= 0 ? {} : {id: matchedLead360WithTourId[0].id}),
      houseLeadId: houseLeadInfo!.id,
      tourId: tourLead.tour_id,
      demoVisited: matchedLead360WithTourId.length <= 0 ?  1 : matchedLead360WithTourId[0].demoVisited + 1,
      sessionsCreated: sessionsCreated,
      timeSpentSec: timeSpentInATour,
      lastInteractedAt: lastInteractedAt,
      completionPercentage: Math.round((uniquePayloadAnnIds/tourAnnLength) * 100),
      ctaClickRate:  matchedLead360WithTourId.length <= 0 ? 1 : matchedLead360WithTourId[0].ctaClickRate + 1,
    };
    updatedLead360.push(lead360);
    
    const aggregation: ReqLead360 = {
      id: aggregationRow.id,
      houseLeadId: houseLeadInfo!.id,
      tourId: aggregationRow.tourId,
      demoVisited: aggregationRow.demoVisited + lead360.demoVisited,
      sessionsCreated: aggregationRow.sessionsCreated + lead360.sessionsCreated,
      timeSpentSec: aggregationRow.timeSpentSec + lead360.timeSpentSec,
      lastInteractedAt: lastInteractedAt,
      completionPercentage: aggregationRow.completionPercentage === 0 
        ? lead360.completionPercentage 
        :  Math.round((lead360.completionPercentage + aggregationRow.completionPercentage) / 2),
      ctaClickRate: aggregationRow.completionPercentage === 0 
        ? lead360.ctaClickRate 
        : Math.round((lead360.ctaClickRate + aggregationRow.ctaClickRate) / 2),
    };
    updatedLead360.push(aggregation);
    reqListLead360.reqLead360 = updatedLead360;
    return reqListLead360;
  }
}