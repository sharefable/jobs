import { downloadRawData, runAthenaQuery } from '../athena';
import { getCreatedAtAndUpdateAt, getYmd } from '../../utils';
import { CommonAthenaBase } from './common_athena_base';

export abstract class RefreshHourlyBase<T> extends CommonAthenaBase {

  public async execute() {

    const query = await this.getAthenaQuery();
    this.baseValues.jobInfo.queryExecutionId = await runAthenaQuery(query);
    const athenaResult: T[] = await downloadRawData(this.baseValues.jobInfo.queryExecutionId);
   
    const createdAtAndUpdatedAt: string = getCreatedAtAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
    const parts = createdAtAndUpdatedAt.split(' ');
    const timePart = parts[1];
    const currentYmd = getYmd(this.baseValues.jobInfo.jobDataScanningTime);
    
    for (const queryResult of athenaResult) {
      const data: T[] = await this.getDataFromAnalyticsDb(queryResult);
      
      if (data.length === 1) {
        if (this.baseValues.updateAnalyticsDataToLastHour) {
          await this.updateExistingData(queryResult, data.at(0) as T, createdAtAndUpdatedAt.replace(timePart, '23:59:59')); 
        } else {
          await this.updateExistingData(queryResult, data.at(0) as T, createdAtAndUpdatedAt); 
        }
      } else {
        if (this.baseValues.updateAnalyticsDataToLastHour) {
          await this.insertNewRow(queryResult, createdAtAndUpdatedAt.replace(timePart, '23:59:59'));
        } else {
          await this.insertNewRow(queryResult, createdAtAndUpdatedAt);
        }
      }
    }
    
    if (athenaResult.length === 0 ) {
      await this.updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt, currentYmd);
    }
  }
    
  protected abstract getDataFromAnalyticsDb (queryResult: T): Promise<T[]>;

  protected abstract updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt: string, currentYmd: string): Promise<void>;

  protected abstract updateExistingData(queryResult: T, data: T, createdAtAndUpdatedAt: string): Promise<void>;
    
  protected abstract insertNewRow(queryResult: T, createdAtAndUpdatedAt: string): Promise<void>;
}