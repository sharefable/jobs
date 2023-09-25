import { processDataFromRaw, runAthenaQuery } from '../athena';
import { JobBase } from './job';
import { getCreatedAtAndUpdateAt, getYmd } from '../../utils';
import { sqlQueryToSelectLastSuccessData } from '../common_queries/jobs_queries';
import { Job } from '../../types';
import { captureException } from '@sentry/node';

export abstract class RefreshHourlyBase<T> extends JobBase {

  public async executeJob() {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      const query = await this.getAthenaQuery();
      this.baseValues.jobInfo.queryExecutionId = await runAthenaQuery(query);
      const athenaResult: T[] = await processDataFromRaw(this.baseValues.jobInfo.queryExecutionId);
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
      if (athenaResult.length === 0) {
        await this.updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt, currentYmd);
      }
      await success();
    } catch (error) {
      await failure((error as Error).message);
      captureException(error as Error);
    }
  }
    
  protected abstract getAthenaQuery (): Promise<string>;
  
  protected abstract getDataFromAnalyticsDb (queryResult: T): Promise<T[]>;
  
  protected async getJobSuccessData (): Promise<any> {
    const jobData: Job[] = await sqlQueryToSelectLastSuccessData(this.getJobType());
    return jobData.length !== 0 ?  JSON.parse(jobData.at(0)!.info) : null;
  }

  protected abstract updateUpdatedAtOfAnalyticsDb(createdAtAndUpdatedAt: string, currentYmd: string): Promise<void>;

  protected abstract updateExistingData(queryResult: T, data: T, createdAtAndUpdatedAt: string): Promise<void>;
    
  protected abstract insertNewRow(queryResult: T, createdAtAndUpdatedAt: string): Promise<void>;
}