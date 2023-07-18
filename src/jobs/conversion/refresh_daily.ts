import { JobType } from '../../api-contract';
import { getConversionData } from '../common_queries/athena_queries';
import { RefreshDailyBase } from '../base/refresh_daily';
import { JobInfo, AthenaConversionEntity, AnalyticConversionEntity } from '../../types';
import { queryToFetchDataForTourIdDateAndBtnId, updateClicks, insertConversion } from './queries';

export const refreshDailyConversionData = async () => {
  const conversionJob = new ConversionJob();
  await conversionJob.executeJob();
};

type Conversion = AthenaConversionEntity | AnalyticConversionEntity

export class ConversionJob extends RefreshDailyBase<Conversion> {
  
  protected getJobType(): JobType {
    return JobType.REFRESH_TOUR_CONVERSION;
  }
 
  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    return successData ? 
      getConversionData(successData.jobRunTime, this.baseValues.jobInfo.jobDataScanningTime):
      getConversionData('2023010100', this.baseValues.jobInfo.jobDataScanningTime);
  }
  
  protected async getDataFromAnalyticsDb (
    queryResult: AthenaConversionEntity,
  ): Promise<AnalyticConversionEntity[]> {
    return await queryToFetchDataForTourIdDateAndBtnId(queryResult);
  }

  protected async updateExistingData (
    queryResult: AthenaConversionEntity, 
    conversionData: AnalyticConversionEntity, 
    createdAtAndUpdatedAt: string,
  ): Promise<void> {
    const addedClicks = parseInt(queryResult.clicks) + parseInt(conversionData.clicks);
    await updateClicks(addedClicks, queryResult, createdAtAndUpdatedAt);
  }

  protected async insertNewRow (
    queryResult: AthenaConversionEntity, 
    createdAtAndUpdatedAt: string,
  ): Promise<void> {
    await insertConversion(queryResult, createdAtAndUpdatedAt);
  }
}
