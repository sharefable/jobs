import { JobType } from '../../api-contract';
import { getMetricsData } from '../common_queries/athena_queries';
import { insertToMetrics } from './queries';
import { UserWithIdMappingBase } from '../../jobs/base/user_with_id_mapping';
import * as log from '../../log';
import { getYmd } from '../../utils';

export const refreshHourlyMetricsData = async () => {
  const metricsJob = new MetricsJob();
  await metricsJob.executeJob();
};

export class MetricsJob extends UserWithIdMappingBase {

  protected getJobType(): JobType {
    return JobType.REFRESH_TOUR_METRICS;
  } 

  protected async getAthenaQuery(): Promise<string> {
    return getMetricsData();
  }
  
  protected async uploadAthenaCsvDataToDB(tempFilepath: string): Promise<void> {
    try {
      const dateYmd = getYmd(this.baseValues.jobInfo.jobDataScanningTime);
      await insertToMetrics(tempFilepath, dateYmd);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    } 
  }
}