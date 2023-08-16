import { AthenaMetricsEntity, 
  AnalyticMetricsEntity,  
  TableName } from '../types';
import { EntryDurationType, JobType } from 'api-contract';
import { queryToGetPrevDateData } from './jobs';
import {  RefreshDailyBase, RollUpBase } from './base';
import { getMetricsData } from './athena_queries';
import { insertMetrics, 
  queryToFetchDataForTourIdAndDate, 
  updateMetricsTypeToDaily, 
  updateViewsForMetrics } from './refresh_queries';
  
export const refreshDailyMetricsData = async () => {
  const metricsJob = new MetricsJob(JobType.REFRESH_TOUR_METRICS);
  await metricsJob.executeJob();
};

export const rollupCurrentToDailyForMetricsData = async () => {
  const rollupMetrics = new RollupMetricsJob(JobType.ROLLUP_METRICS_CURRENT_TO_DAILY);
  await rollupMetrics.executeRollupJob();
};

type Metrics = AthenaMetricsEntity | AnalyticMetricsEntity

export class MetricsJob extends RefreshDailyBase<Metrics> {
 
  protected async getAthenaQuery (): Promise<string> {
    let query;
    const successData: any = await this.getJobSuccessData();
    if (successData) {
      query = getMetricsData(successData.timestamp.jobRunTime, this.baseValues.jobInfo.jobDataScanningTime);
    } else {
      query = getMetricsData('2023010100', this.baseValues.jobInfo.jobDataScanningTime);
    }
    return query;
  }

  protected async getDataFromAnalytics (queryResult: AthenaMetricsEntity): Promise<AnalyticMetricsEntity[]> {
    const queryYmd = parseInt(queryResult.ymd);
    const metricsData: AnalyticMetricsEntity[] = await queryToFetchDataForTourIdAndDate(queryResult.payload_tour_id, queryYmd);
    return metricsData;
  
  }

  protected async updateExistingData (
    queryResult: AthenaMetricsEntity, 
    annTourClickData: AnalyticMetricsEntity, 
    currentAndUpdatedAt: string,
  ): Promise<void> {
    const addedViewsAll = parseInt(queryResult.views_all) + parseInt(annTourClickData.views_all);
    const addedViewsUnique = parseInt(queryResult.views_unique) + parseInt(annTourClickData.views_unique);
    const queryYmd = parseInt(queryResult.ymd);
    updateViewsForMetrics(
      queryResult.payload_tour_id, 
      addedViewsAll, 
      addedViewsUnique, 
      queryYmd, 
      currentAndUpdatedAt);
  }

  protected async insertNewRow (queryResult: AthenaMetricsEntity, currentAndUpdatedAt: string): Promise<void> {
    await insertMetrics(queryResult, EntryDurationType.CURRENT, currentAndUpdatedAt);
  }
}

export class RollupMetricsJob extends RollUpBase<AnalyticMetricsEntity> {

  protected async updateToDaily (annClickData: AnalyticMetricsEntity): Promise<void> {
    await updateMetricsTypeToDaily(annClickData);
  }

  protected async getPrevDateData (prevYmd: string): Promise<AnalyticMetricsEntity[]> {
    const annTourClickData: AnalyticMetricsEntity[] = await queryToGetPrevDateData(prevYmd, TableName.AnalyticsTourMetrics);
    return annTourClickData;
  }
}