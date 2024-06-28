import { JobType } from '../../api-contract';
import { getAnnTourClicksData } from '../common_queries/athena_queries';
import { JobInfo, AnalyticsAnnClickEntity, AthenaAnnClickEntity, TableName } from '../../types';
import { calculateAverage } from '../../utils';
import { getCurrentTypeForTourIdAnnIdAndYmd, updateViewsForAnnClickTour, insertAnnClick } from './queries';
import { RefreshHourlyBase } from '../base/refresh_hourly';
import { updateUpdatedAt } from '../common_queries/analytics_queries';

/* TODO: we need to handle in case of hourly job gets failed at one point 
   and not able to change the entry type to CURRENT to DAILY */

export const refreshHourlyAnnClickData = async () => {
  const annClickJob = new AnnClickJob();
  await annClickJob.executeJob();
};

type AnnTourClick = AthenaAnnClickEntity | AnalyticsAnnClickEntity;

export class AnnClickJob extends RefreshHourlyBase<AnnTourClick> {

  protected getJobType(): JobType {
    return JobType.REFRESH_TOUR_ANN_CLICK;
  }
  
  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData(this.getJobType());
    if (!successData) {
      this.baseValues.updateAnalyticsDataToLastHour = true;
      this.baseValues.jobInfo.jobDataScanningTime = '2023010100';
      return getAnnTourClicksData('2023010100', this.baseValues.jobInfo.jobRunTime);
    } 
    return getAnnTourClicksData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime);
  }
  
  protected async getDataFromAnalyticsDb (
    queryResult: AthenaAnnClickEntity,
  ): Promise<AnalyticsAnnClickEntity[]> {
    return await getCurrentTypeForTourIdAnnIdAndYmd(queryResult);
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
  
  private findAverage (queryTimeSpent: string, dbTimeSpent: string) {
    const average = JSON.stringify(calculateAverage(JSON.parse(queryTimeSpent), JSON.parse(dbTimeSpent)));
    return average;
  }

  protected async insertNewRow (queryResult: AthenaAnnClickEntity, currentAndUpdatedAt: string): Promise<void> {
    await insertAnnClick(queryResult, currentAndUpdatedAt);
  }

  protected async updateUpdatedAtOfAnalyticsDb(updatedAt: string, currentYmd: string) : Promise<void> {
    await updateUpdatedAt(updatedAt, currentYmd, TableName.AnalyticTourAnnClicks);
  }
}