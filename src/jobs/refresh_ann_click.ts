import {
  AnalyticsAnnClickEntity,
  AthenaAnnClickEntity,
  TableName } from '../types';
import { calculateAverage } from '../utils';
import { EntryDurationType, JobType } from '../api-contract';
import { RefreshDailyBase, RollUpBase } from './base';
import { queryToGetPrevDateData } from './jobs';
import { getAnnTourClicksData } from './athena_queries';
import { getCurrentTypeForTourIdAnnIdAndYmd, 
  insertAnnClick, 
  updateAnnTourTypeToDaily, 
  updateViewsForAnnClickTour } from './refresh_queries';

/* TODO: we need to handle in case of hourly job gets failed at one point 
   and not able to change the entry type to CURRENT to DAILY */

export const refreshDailyAnnClickData = async () => {
  const annClickJob = new AnnClickJob(JobType.REFRESH_TOUR_ANN_CLICK);
  await annClickJob.executeJob();
};

export const rollupCurrentToDailyForAnnClickData = async () => {
  const rollupAnnClick = new RollupAnnClickJob(JobType.ROLLUP_CONVERSION_CURRENT_TO_DAILY);
  await rollupAnnClick.executeRollupJob();
};

type AnnTourClick = AthenaAnnClickEntity | AnalyticsAnnClickEntity;

export class AnnClickJob extends RefreshDailyBase<AnnTourClick> {
  
  protected async getAthenaQuery (): Promise<string> {
    let query;
    const successData: any = await this.getJobSuccessData();
    if (successData) {
      query = getAnnTourClicksData(successData.timestamp.jobRunTime, this.baseValues.jobInfo.jobDataScanningTime);
    } else {
      query = getAnnTourClicksData('2023010100', this.baseValues.jobInfo.jobDataScanningTime);
    }
    return query;
  }
  
  protected async getDataFromAnalytics (
    queryResult: AthenaAnnClickEntity,
  ): Promise<AnalyticsAnnClickEntity[]> {
    const annTourClickData: AnalyticsAnnClickEntity[] = await getCurrentTypeForTourIdAnnIdAndYmd(queryResult);
    return annTourClickData;
  }

  protected async updateExistingData (
    queryResult: AthenaAnnClickEntity, 
    annTourClickData: AnalyticsAnnClickEntity, 
    currentAndUpdatedAt: string,
  ): Promise<void> {
    const addedViewsAll = parseInt(queryResult.views_all) + annTourClickData.views_all;
    const addedUniqueViews = parseInt(queryResult.views_unique) + annTourClickData.views_unique;
    const averageTimeSpent = this.findAverage(queryResult.time_spent_dist,annTourClickData.time_spent_dist);
    const queryYmd = parseInt(queryResult.ymd);
    await updateViewsForAnnClickTour(
      queryResult.payload_tour_id, 
      queryResult.payload_ann_id,
      addedViewsAll,  
      addedUniqueViews,
      averageTimeSpent,
      queryYmd, 
      currentAndUpdatedAt,
    );
  }
  
  protected findAverage (queryTimeSpent: string, dbTimeSpent: string) {
    const average = JSON.stringify(calculateAverage(JSON.parse(queryTimeSpent), JSON.parse(dbTimeSpent)));
    return average;
  }

  protected async insertNewRow (queryResult: AthenaAnnClickEntity, currentAndUpdatedAt: string): Promise<void> {
    await insertAnnClick(queryResult, EntryDurationType.CURRENT, currentAndUpdatedAt);
  }
}

export class RollupAnnClickJob extends RollUpBase<AnalyticsAnnClickEntity> {

  protected async updateToDaily (annClickData: AnalyticsAnnClickEntity): Promise<void> {
    await updateAnnTourTypeToDaily(annClickData);
  }

  protected async getPrevDateData (prevYmd: string): Promise<AnalyticsAnnClickEntity[]> {
    const annTourClickData: AnalyticsAnnClickEntity[] = 
    await queryToGetPrevDateData(prevYmd, TableName.AnalyticTourAnnClicks);
    return annTourClickData;
  }
}