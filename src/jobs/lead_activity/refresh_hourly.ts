import { 
  JobType, 
  ReqHouseLeadInfoWithInfo360,
  ReqLead360,
  ReqLeadActivityDataPost,
  RespHouseLeadInfo } from '../../api-contract';
import { getLeadActivity } from '../common_queries/athena_queries';
import { 
  AnalyticsUserAidMappingEntity, 
  AthenaTourLeadEntity, 
  GroupedData, 
  JobInfo, 
  LeadAccessInfoOfTour, 
  Tour, 
  TourData } from '../../types';
import { getTourDetails, getTourLeadsForYmd } from './queries';
import * as log from '../../log';
import { downloadRawData, runAthenaQuery } from '../athena';
import { JobBase } from '../../jobs/base/job';
import { 
  getCtaClickedRate,
  getLowerBound,
  getMidnightTimestamp,
  groupQueryResultBySid,
  timeSpentInDemo,
  tourAnnoationsLength } from '../../utils';
import { qUrlResp, sqsClient } from '../../main_msg_loop';
import { 
  addOrUpdateLead360, 
  getHouseLeadInfo, 
  getTourAssetPath, 
  getTourDataFile, 
  uploadLeadactivityToS3 } from '../../api';

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

    const successData: JobInfo  = await this.getJobSuccessData();
    const timestampToCalculateBounds = successData ? successData.jobRunTime : '2023010100';
    const upperBound = getMidnightTimestamp(this.baseValues.jobInfo.jobRunTime);
    const lowerBound = getLowerBound(timestampToCalculateBounds);
    const tourLeads: AnalyticsUserAidMappingEntity[] = await getTourLeadsForYmd(lowerBound, upperBound);
    
    await this.sendLeadActivityToS3(tourLeads, url);
  }

  protected async sendLeadActivityToS3(tourLeads: AnalyticsUserAidMappingEntity[], url: string): Promise<void>  {
    for (const tourLead of tourLeads) {
      const query = getLeadActivity(tourLead.aid, tourLead.tour_id);
      const queryExecutionId = await runAthenaQuery(query);
      
      const queryResult: AthenaTourLeadEntity[] = await downloadRawData(queryExecutionId) as AthenaTourLeadEntity[];
      if (queryResult.length === 0) {
        log.info(`Response is empty for the queryExecutionId ${queryExecutionId}. So continuing`);
        continue;
      }

      try {
        const leadActivity: ReqLeadActivityDataPost = {
          tourId: tourLead.tour_id,
          aid: tourLead.aid,
          data: JSON.stringify(queryResult),
        };
        await Promise.all([
          this.populateLead360(tourLead, queryResult, url),
          uploadLeadactivityToS3(leadActivity),
        ]);

      } catch(err) {
        log.err('Something went wrong while sending data server', err);
        throw new Error('Something went wrong while sending data server');
      }
      log.info(`User level analytics is uploaded to s3 successfully for aid ${tourLead.aid}`);
    }
  }

  protected async populateLead360 (
    tourLead: AnalyticsUserAidMappingEntity,
    queryResult: AthenaTourLeadEntity[],
    sqlClientUrl: string ) : Promise<void> {
    try {
      const tour: Tour[] = await getTourDetails(tourLead.tour_id);
      if (tour.length <= 0) {
        log.info(`No tour found for ${tourLead.tour_id} in db`);
        return;
      }

      const houseLeadInfo: RespHouseLeadInfo | null = await getHouseLeadInfo(tour[0].belongs_to_org, tourLead.email);
      if (!houseLeadInfo) {
        log.warn(`House lead info not found for for tour ${tourLead.tour_id}, skipping`);
        return;
      }
      const reqListLead360: ReqHouseLeadInfoWithInfo360 = await this.preapreDataToPopulateLead360(tourLead, houseLeadInfo, queryResult);
      const aggregatedTourValue: ReqLead360 = reqListLead360.info360.filter(item => item.tourId === 0)[0];
      
      this.prepareAndSendSqsMessage(queryResult, tourLead, aggregatedTourValue, tour[0], sqlClientUrl);
      await addOrUpdateLead360(reqListLead360);
    } catch (err) {
      log.err('Something went wrong while populating lead 360 table', err);
      throw new Error(`Something went wrong while populating lead 360 table ${err}`);
    }
  }

  protected async preapreDataToPopulateLead360 (
    tourLead: AnalyticsUserAidMappingEntity,
    houseLeadInfo: RespHouseLeadInfo,
    queryResult: AthenaTourLeadEntity[] ): Promise<ReqHouseLeadInfoWithInfo360> {
    
    const updatedInfo360: ReqLead360[] = [];
    const reqListLead360: ReqHouseLeadInfoWithInfo360  = {
      orgId: houseLeadInfo.orgId,
      leadEmailId: houseLeadInfo.leadEmailId,
      info360: updatedInfo360,
    };

    const tourDataFile: string = await getTourAssetPath(tourLead.tour_id);
    const dataFileTourData: TourData = await getTourDataFile(tourDataFile);
    
    const tourAnnLength = tourAnnoationsLength(dataFileTourData);
    const uniquePayloadAnnIds = [...new Set(queryResult.map(item => item.payload_ann_id))].length;

    const groupedBySid: GroupedData = groupQueryResultBySid(queryResult);

    const lastInteractedAt: Date = new Date(Math.max(...queryResult.map(item => parseInt(item.uts))) * 1000);

    const lead360: ReqLead360 = {
      tourId: tourLead.tour_id,
      demoVisited: 1,
      sessionsCreated: Object.keys(groupedBySid).length,
      timeSpentSec:  timeSpentInDemo(groupedBySid),
      lastInteractedAt: lastInteractedAt,
      completionPercentage: Math.round((uniquePayloadAnnIds / tourAnnLength) * 100),
      ctaClickRate: getCtaClickedRate(queryResult, dataFileTourData),
    };
    updatedInfo360.push(lead360);
    const aggregation = { ...lead360, tourId: 0 };
    for (const row of houseLeadInfo.info360) {
      if (row.tourId === tourLead.tour_id || row.tourId === 0) {
        continue;
      }
      aggregation.demoVisited += row.demoVisited;
      aggregation.sessionsCreated += row.sessionsCreated;
      aggregation.timeSpentSec += row.timeSpentSec;
      aggregation.completionPercentage += row.completionPercentage;
      aggregation.ctaClickRate += row.ctaClickRate;
    }

    aggregation.completionPercentage = Math.round(aggregation.completionPercentage / (houseLeadInfo.info360.length - 1));
    aggregation.ctaClickRate = Math.round(aggregation.ctaClickRate / (houseLeadInfo.info360.length - 1));

    updatedInfo360.push(aggregation);
    return reqListLead360;
  }

  protected async prepareAndSendSqsMessage(
    queryResult: AthenaTourLeadEntity[],
    tourLead: AnalyticsUserAidMappingEntity,
    aggregatedTourValue: ReqLead360,
    tour: Tour,
    sqlClientUrl: string) {
    
    const demoUniqueViews = [...new Set(queryResult.map(item => item.aid))].length;

    const leadAccessInfoOfTour: LeadAccessInfoOfTour = {
      email: tourLead.email,
      ctaClickRate: aggregatedTourValue.ctaClickRate,
      demoCompletion: aggregatedTourValue.completionPercentage,
      totalTimeSpent: aggregatedTourValue.timeSpentSec,
      demoUniqueViews,
      demoTotalViews: aggregatedTourValue.sessionsCreated,
      lastActiveAt: +aggregatedTourValue.lastInteractedAt,
      activityUrl: `https://app.sharefable.com/a/demo/${tour.rid}/leads#${tourLead.aid}`,
      demoName: tour.display_name,
      orgId: tour.belongs_to_org,
    };
    
    const sendMessageRequest = {
      QueueUrl: sqlClientUrl, 
      MessageBody: 'CBE',
      MessageAttributes: {
        payload : {
          DataType: 'String',
          StringValue: JSON.stringify(leadAccessInfoOfTour),
        },
      },
    };
    sqsClient.sendMessage(sendMessageRequest);
  }
}