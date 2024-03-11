import { JobType } from '../../api-contract';
import { getAidSidMappingData } from '../common_queries/athena_queries';
import { RefreshHourlyBase } from '../base/refresh_hourly';
import { JobInfo, AthenaAidSidMappingEntity, AnalyticsAidSidMappingEntity } from '../../types';
import { insertToAidSidMapping } from './queries';
import { executeQuery } from '../../jobs/mysql';
import * as log from '../../log';

export const refreshHourlyAidSidMapping = async () => {
  const aidSidMapping = new AidSidMappingJob();
  await aidSidMapping.executeJob();
};

type AidSidMapping = AthenaAidSidMappingEntity | AnalyticsAidSidMappingEntity;

export class AidSidMappingJob extends RefreshHourlyBase<AidSidMapping> {
  
  protected getJobType(): JobType {
    return JobType.REFRESH_AID_SID_MAPPING;
  }
 
  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    if (!successData) {
      return getAidSidMappingData('2023010100', this.baseValues.jobInfo.jobRunTime);
    }
    return getAidSidMappingData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime);
  }

  protected async insertNewRow(queryResult: AthenaAidSidMappingEntity, tempFilepath: string): Promise<void> {
    try {
      const query = insertToAidSidMapping(tempFilepath);
      await executeQuery(query);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    }
  }
  
  protected async getDataFromAnalyticsDb (
    queryResult: AthenaAidSidMappingEntity,
  ): Promise<AnalyticsAidSidMappingEntity[]> {
    // No use of this function for this class
    return Promise.resolve([]);
  }

  protected updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt: string, currentYmd: string): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }

  protected updateExistingData(
    queryResult: AthenaAidSidMappingEntity, 
    data: AthenaAidSidMappingEntity, 
    createdAtAndUpdatedAt: string,
  ): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }

  protected processTourUsersToS3(aidSidEntity: AnalyticsAidSidMappingEntity[]): Promise<void> {
    // No use of this function for this class
    return Promise.resolve();
  }
}