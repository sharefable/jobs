import { JobType } from '../../api-contract';
import { getUserAidMappingData } from '../common_queries/athena_queries';
import { RefreshHourlyBase } from '../base/refresh_hourly';
import { JobInfo,  AthenaUserAidMappingEntity, AnalyticsUserAidMappingEntity } from '../../types';
import { insertToUserAidMapping } from './queries';
import { executeQuery } from '../../jobs/mysql';
import * as log from '../../log';

export const refreshHourlyUserAidMapping = async () => {
  const userAidMappingJob = new UserAidMappingJob();
  await userAidMappingJob.executeJob();
};

type UserAidMapping = AthenaUserAidMappingEntity | AnalyticsUserAidMappingEntity;

export class UserAidMappingJob extends RefreshHourlyBase<UserAidMapping> {
  
  protected getJobType(): JobType {
    return JobType.REFRESH_USER_AID_MAPPING;
  }
 
  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    if (!successData) {
      return getUserAidMappingData('2023010100', this.baseValues.jobInfo.jobRunTime);
    }
    return getUserAidMappingData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime);
  }
  
  protected async insertNewRow(queryResult: AthenaUserAidMappingEntity, tempFilepath: string): Promise<void> {
    try {
      const query = insertToUserAidMapping(tempFilepath);
      await executeQuery(query);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    } 
  }

  protected async getDataFromAnalyticsDb (
    queryResult: AthenaUserAidMappingEntity,
  ): Promise<AnalyticsUserAidMappingEntity[]> {
    return Promise.resolve([]);
  }

  protected updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt: string, currentYmd: string): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }

  protected updateExistingData(
    queryResult: AthenaUserAidMappingEntity, 
    data: AthenaUserAidMappingEntity, 
    createdAtAndUpdatedAt: string,
  ): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }
}