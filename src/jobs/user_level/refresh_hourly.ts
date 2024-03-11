import { JobType } from '../../api-contract';
import { getTourDataForAnUser } from '../common_queries/athena_queries';
import { RefreshHourlyBase } from '../base/refresh_hourly';
import { AnalyticsUserAidMappingEntity, AthenaTourUserEntity } from '../../types';
import { getTourUsersForCurrentYmd } from './queries';
import * as log from '../../log';
import { processDataFromRaw, runAthenaQuery } from '../athena';

export const refreshHourlyUserLevelAnalytics = async () => {
  const tourUsersJob = new TourUsersJob();
  await tourUsersJob.executeJob();
};

type TourUsers = AnalyticsUserAidMappingEntity | AthenaTourUserEntity | string;

export class TourUsersJob extends RefreshHourlyBase<TourUsers> {
  
  protected getJobType(): JobType {
    return JobType.REFRESH_USERS_LEVEL_ANALYTICS;
  }
 
  protected async getAthenaQuery (): Promise<string> {
    return Promise.resolve('');
  }

  protected async getDataFromAnalyticsDb (currentYmd: string): Promise<AnalyticsUserAidMappingEntity[]> {
    return await getTourUsersForCurrentYmd(currentYmd);
  }

  protected async processTourUsersToS3(tourUsers: AnalyticsUserAidMappingEntity[]): Promise<void> {
    tourUsers = this.removeDuplicateAids(tourUsers);
    for (const tourUser of tourUsers) {
      const query = getTourDataForAnUser(tourUser.aid, tourUser.tour_id);
      const queryExecutionId = await runAthenaQuery(query);
      const queryResult: AthenaTourUserEntity = await processDataFromRaw(queryExecutionId) as unknown as AthenaTourUserEntity;
      if (Object.keys(queryResult).length === 0) {
        log.info(`Response is empty for the queryExecutionId ${queryExecutionId}. So continuing`);
        continue;
      }
      const resp = await fetch(`${process.env.API_SERVER_ENDPOINT}/v1/updusranalytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tourId: tourUser.tour_id, aid: tourUser.aid, data: JSON.stringify(queryResult)}),
      });
      if (!(resp.status >= 200 && resp.status < 300)) {
        throw new Error('Something went wrong while sending data to s3');
      } 
      log.info(`User level analytics is uploaded to s3 successfully for aid ${tourUser.aid}`);
    }
  }

  protected removeDuplicateAids(tourUsers: AnalyticsUserAidMappingEntity[]): AnalyticsUserAidMappingEntity[] {
    const uniqueAids = new Set();
    const uniqueArray: AnalyticsUserAidMappingEntity[] = []; 
    log.info('Removing duplicates');
    for (const tourUser of tourUsers) {
      if (!uniqueAids.has(tourUser.aid)) {
        uniqueArray.push(tourUser);
        uniqueAids.add(tourUser.aid);
      }
    }
    log.info('Removed duplicates');
    return uniqueArray;
  }

  protected async insertNewRow(queryResult: AthenaTourUserEntity, tempFilepath: string): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }

  protected updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt: string, currentYmd: string): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }

  protected updateExistingData(
    queryResult: AthenaTourUserEntity, 
    data: AnalyticsUserAidMappingEntity, 
    createdAtAndUpdatedAt: string,
  ): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }
}