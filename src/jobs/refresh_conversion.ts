import { EntryDurationType, JobType } from '../api-contract';
import { AthenaConversionEntity, 
  AnalyticConversionEntity, 
  TableName } from '../types';
import { queryToGetPrevDateData } from './jobs';
import { RefreshDailyBase, RollUpBase } from './base';
import { getConversionData } from './athena_queries';
import { queryToFetchDataForTourIdDateAndBtnId, 
  updateClicks, 
  insertConversion, 
  updateConversionTypeToDaily } from './refresh_queries';

export const refreshDailyConversionData = async () => {
  const conversionJob = new ConversionJob(JobType.REFRESH_TOUR_CONVERSION);
  await conversionJob.executeJob();
};

export const rollupCurrentToDailyForConversionData = async () => {
  const rollupConversion = new RollupConversionJob(JobType.ROLLUP_CONVERSION_CURRENT_TO_DAILY);
  await rollupConversion.executeRollupJob();
};

type Conversion = AthenaConversionEntity | AnalyticConversionEntity

export class ConversionJob extends RefreshDailyBase<Conversion> {
 
  protected async getAthenaQuery (): Promise<string> {
    let query;
    const successData: any = await this.getJobSuccessData();
    if (successData.isPresent) {
      query = getConversionData(successData.timestamp.jobRunTime, this.baseValues.jobInfo.jobDataScanningTime);
    } else {
      query = getConversionData('2023010100', this.baseValues.jobInfo.jobDataScanningTime);
    }
    return query;
  }
  
  protected async getDataFromAnalytics (
    queryResult: AthenaConversionEntity,
  ): Promise<AnalyticConversionEntity[]> {
    const conversionData: AnalyticConversionEntity[] = await queryToFetchDataForTourIdDateAndBtnId(queryResult);
    return conversionData;
  }

  protected async updateExistingData (
    queryResult: AthenaConversionEntity, 
    conversionData: AnalyticConversionEntity, 
    currentAndUpdatedAt: string,
  ): Promise<void> {
    const addedClicks = parseInt(queryResult.clicks) + parseInt(conversionData.clicks);
    updateClicks(addedClicks, queryResult, currentAndUpdatedAt);
  }

  protected async insertNewRow (
    queryResult: AthenaConversionEntity, 
    currentAndUpdatedAt: string,
  ): Promise<void> {
    await insertConversion(queryResult, EntryDurationType.CURRENT, currentAndUpdatedAt);
  }
}


export class RollupConversionJob extends RollUpBase<AnalyticConversionEntity> {
 
  protected async updateToDaily (annClickData: AnalyticConversionEntity): Promise<void> {
    await updateConversionTypeToDaily(annClickData);
  }

  protected async getPrevDateData (prevYmd: string): Promise<AnalyticConversionEntity[]> {
    const annTourClickData: AnalyticConversionEntity[] = await queryToGetPrevDateData(prevYmd, TableName.AnalyticsConversion);
    return annTourClickData;
  }
}