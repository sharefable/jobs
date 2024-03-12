import { JobType } from '../../api-contract';
import { getUserAidMappingData } from '../common_queries/athena_queries';
import { JobInfo } from '../../types';
import { insertToUserAidMapping } from './queries';
import { executeQuery } from '../../jobs/mysql';
import * as log from '../../log';
import { UserWithIdMappingBase } from '../../jobs/base/user_with_id_mapping';

export const refreshHourlyUserAidMapping = async () => {
  const userAidMappingJob = new UserAidMappingJob();
  await userAidMappingJob.executeJob();
};

export class UserAidMappingJob extends UserWithIdMappingBase {

  protected getJobType(): JobType {
    return JobType.REFRESH_USER_AID_MAPPING;
  }

  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    if (!successData) {
      this.baseValues.jobInfo.jobDataScanningTime = '2023010100';
      return getUserAidMappingData('2023010100', this.baseValues.jobInfo.jobRunTime);
    }
    return getUserAidMappingData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime);
  }

  protected async uploadAthenaCsvDataToDB(tempFilepath: string): Promise<void> {
    try {
      const query = insertToUserAidMapping(tempFilepath);
      await executeQuery(query);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    } 
  }
}