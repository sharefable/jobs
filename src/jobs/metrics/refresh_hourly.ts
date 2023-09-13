import { JobType } from '../../api-contract';
import { getMetricsData } from '../common_queries/athena_queries';
import { RefreshHourlyBase } from '../base/refresh_hourly';
import { AthenaMetricsEntity, AnalyticMetricsEntity, JobInfo } from '../../types';
import { insertMetrics, queryToFetchDataForTourIdAndDate, updateViewsForMetrics } from './queries';

export const refreshHourlyMetricsData = async () => {
  const metricsJob = new MetricsJob();
  await metricsJob.executeJob();
};
  
type Metrics = AthenaMetricsEntity | AnalyticMetricsEntity

export class MetricsJob extends RefreshHourlyBase<Metrics> {
 
  protected getJobType(): JobType {
    return JobType.REFRESH_TOUR_METRICS;
  } 

  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    return successData ? 
      getMetricsData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime):
      getMetricsData('2023010100', this.baseValues.jobInfo.jobRunTime);
  }

  protected async getDataFromAnalyticsDb (queryResult: AthenaMetricsEntity): Promise<AnalyticMetricsEntity[]> {
    const queryYmd = parseInt(queryResult.ymd);
    return  await queryToFetchDataForTourIdAndDate(queryResult.payload_tour_id, queryYmd);
  }

  protected async updateExistingData (
    queryResult: AthenaMetricsEntity, 
    metricsEntity: AnalyticMetricsEntity, 
    createdAtAndUpdatedAt: string,
  ): Promise<void> {
    const addedViewsAll = parseInt(queryResult.views_all) + parseInt(metricsEntity.views_all);
    const addedViewsUnique = parseInt(queryResult.views_unique) + parseInt(metricsEntity.views_unique);
    const queryYmd = parseInt(queryResult.ymd);
    await updateViewsForMetrics(
      queryResult.payload_tour_id, 
      addedViewsAll, 
      addedViewsUnique, 
      queryYmd, 
      createdAtAndUpdatedAt);
  }

  protected async insertNewRow (
    queryResult: AthenaMetricsEntity, 
    createdAtAndUpdatedAt: string, 
  ): Promise<void> {
    await insertMetrics(queryResult, createdAtAndUpdatedAt);
  }
}