import { processDataFromRaw, runAthenaQuery } from '../athena';
import { JobBase } from './job';
import { getCreatedAtAndUpdateAt } from '../../utils';
import { sqlQueryToSelectLastSuccessData } from '../common_queries/jobs_queries';
import { Job } from '../../types';
import { captureException } from '@sentry/node';

export abstract class RefreshDailyBase<T> extends JobBase {

  public async executeJob() {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      const query = await this.getAthenaQuery();
      this.baseValues.jobInfo.queryExecutionId = await runAthenaQuery(query);
      const athenaResult: T[] = await processDataFromRaw(this.baseValues.jobInfo.queryExecutionId);
      const createdAtAndUpdatedAt: string = getCreatedAtAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
      for (const queryResult of athenaResult) {
        const data: T[] = await this.getDataFromAnalyticsDb(queryResult);
        if (data.length === 1) {
          await this.updateExistingData(queryResult, data.at(0) as T, createdAtAndUpdatedAt); 
        } else {
          await this.insertNewRow(queryResult, createdAtAndUpdatedAt);
        }
      }
      await success();
    } catch (err: any) {
      await failure(err.message);
      captureException(err);
    }
  }
    
  protected abstract getAthenaQuery (): Promise<string>;
  
  protected abstract getDataFromAnalyticsDb (queryResult: T): Promise<T[]>;
  
  protected async getJobSuccessData (): Promise<any> {
    const jobData: Job[] = await sqlQueryToSelectLastSuccessData(this.getJobType());
    return jobData.length !== 0 ?  JSON.parse(jobData.at(0)!.info) : null;
  }
  
  protected abstract updateExistingData(queryResult: T, data: T, createdAtAndUpdatedAt: string): Promise<void>;
    
  protected abstract insertNewRow(queryResult: T, createdAtAndUpdatedAt: string): Promise<void>;
}