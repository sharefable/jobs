import { JobType } from '../../api-contract';
import { getConversionData } from '../common_queries/athena_queries';
import { RefreshHourlyBase } from '../base/refresh_hourly';
import { JobInfo, AthenaConversionEntity, AnalyticConversionEntity, TableName } from '../../types';
import { queryToFetchDataForTourIdDateAndBtnId, updateClicks, insertConversion } from './queries';
import { updateUpdatedAt } from '../common_queries/analytics_queries';

export const refreshHourlyConversionData = async () => {
  const conversionJob = new ConversionJob();
  await conversionJob.executeJob();
};

type Conversion = AthenaConversionEntity | AnalyticConversionEntity

export class ConversionJob extends RefreshHourlyBase<Conversion> {
  
  protected getJobType(): JobType {
    return JobType.REFRESH_TOUR_CONVERSION;
  }
 
  protected async getAthenaQuery (): Promise<string> {
    const successData: JobInfo = await this.getJobSuccessData();
    if (!successData) {
      this.baseValues.updateAnalyticsDataToLastHour = true;
      this.baseValues.jobInfo.jobDataScanningTime = '2023010100';
      return getConversionData('2023010100', this.baseValues.jobInfo.jobRunTime);
    }
    return getConversionData(successData.jobRunTime, this.baseValues.jobInfo.jobRunTime);
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

  protected async updateUpdatedAtOfAnalyticsDb(updatedAt: string, currentYmd: string) : Promise<void> {
    await updateUpdatedAt(updatedAt, currentYmd, TableName.AnalyticsConversion);
  }
}
