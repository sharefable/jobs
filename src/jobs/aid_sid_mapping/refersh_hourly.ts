import { JobType } from '../../api-contract';
import { getAidSidMappingData } from '../common_queries/athena_queries';
import { JobInfo } from '../../types';
import { insertToAidSidMapping } from './queries';
import { executeQuery } from '../../jobs/mysql';
import * as log from '../../log';
import { UserWithIdMappingBase } from '../../jobs/base/user_with_id_mapping';

export const refreshHourlyAidSidMapping = async () => {
  const aidSidMapping = new AidSidMappingJob();
  await aidSidMapping.executeJob();
};

export class AidSidMappingJob extends UserWithIdMappingBase {

  protected getJobType(): JobType {
    return JobType.REFRESH_AID_SID_MAPPING;
  }

  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    if (!successData) {
      this.baseValues.jobInfo.jobDataScanningTime = '2023010100';
      return getAidSidMappingData('2023010100', this.baseValues.jobInfo.jobRunTime);
    }
    return getAidSidMappingData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime);
  }

  protected async uploadAthenaCsvDataToDB(tempFilepath: string): Promise<void> {
    try {
      const query: string = insertToAidSidMapping(tempFilepath);
      await executeQuery(query);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    }
  }
}