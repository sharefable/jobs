import { Job } from '../types';
import { getCurrentAndUpdateAt, getPreviousDate, getTimeFromUpdatedAt, getUTCTimesForJob } from '../utils';
import { processDataFromRaw } from './athena';
import { JobProcessingStatus, JobType } from '../api-contract';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from './mysql';
import { sqlQueryToSelectLastSuccessData } from './jobs';
import { randomUUID } from 'crypto';

export abstract class JobBase {
  constructor(
    protected jobType: JobType,
  ) {}
  
  protected baseValues = {jobKey: randomUUID(), jobInfo: getUTCTimesForJob()};
  
  async createJob(jobName: string) {
    await executeQueryToFetchData(
      `INSERT INTO jobs (created_at, updated_at, job_type, job_key, 
                  processing_status, failure_reason, info) VALUES 
                 (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), '${jobName}', 
                '${this.baseValues.jobKey}', ${JobProcessingStatus.Touched}, null, 
                '${JSON.stringify(this.baseValues.jobInfo, null, 2)}')`);
    const rowId: any = (await executeQueryToFetchData('SELECT LAST_INSERT_ID() as id from jobs')).at(0);
    const result = async (query: string) => {
      this.baseValues.jobInfo.query = query;
      await executeQueryToInsertOrUpdateData(
        `UPDATE jobs SET processing_status = ${JobProcessingStatus.InProcess}, 
        info = '${JSON.stringify(this.baseValues.jobInfo, null, 2).replace(/'/g, '\'\'').replace(/\\/g, '\\\\')}'
         WHERE id = ${rowId.id}`);
      
      return [
        async (data: string) => {
          await executeQueryToInsertOrUpdateData(
            `UPDATE jobs SET processing_status = ${JobProcessingStatus.Processed}, 
                 failure_reason = '${data}' WHERE id = ${rowId.id}`);
        },
        async (data: string) => {
          await executeQueryToInsertOrUpdateData(
            `UPDATE jobs SET processing_status = ${JobProcessingStatus.Failed}, 
                failure_reason = '${data}' WHERE id = ${rowId.id}`);
        },
      ];
    };
    return result;
  }
}
  
export abstract class RefreshDailyBase<T> extends JobBase {

  public async executeJob() {
    const markAsInProgress = await this.createJob(this.jobType);
    const query = await this.getAthenaQuery();
    const [success, failure] = await markAsInProgress(query);
    try {
      const athenaResult: T[] = await processDataFromRaw(query);
      const currentAndUpdatedAt: string = getCurrentAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
      for (const queryResult of athenaResult) {
        const data: T[] = await this.getDataFromAnalytics(queryResult);
        if (data.length === 1) {
          await this.updateExistingData(queryResult, data.at(0) as T, currentAndUpdatedAt);
        } else {
          await this.insertNewRow(queryResult, currentAndUpdatedAt);
        }
      }
      await success(`${this.jobType} Job is successful`);
    } catch (err: any) {
      await failure(err.message);
    // TODO: raise an error in sentry 
    }
  }

  protected abstract getAthenaQuery (): Promise<string>;

  protected abstract getDataFromAnalytics(queryResult: T): Promise<T[]>;

  protected async getJobSuccessData (): Promise<any> {
    try {
      const jobData: Job[] = await sqlQueryToSelectLastSuccessData(JobType.REFRESH_TOUR_METRICS);
      if (jobData.length !== 0) {
        return JSON.parse(jobData.at(0)!.info);
      } else {
        return null;
      }
    } catch (error: any) {
      throw new Error(error.message);
      // TODO: raise an error in sentry
    }
  }

  protected abstract updateExistingData(queryResult: T, data: T, currentAndUpdatedAt: string): Promise<void>;
  
  protected abstract insertNewRow(queryResult: T, currentAndUpdatedAt: string): Promise<void>;
}

export abstract class RollUpBase<T extends { updated_at: string }> extends JobBase {
    
  public async executeRollupJob() {
    const markAsInProgress = await this.createJob(this.jobType);
    const [success, failure] = await markAsInProgress('');
    try {
      const prevYmd: string = getPreviousDate(this.baseValues.jobInfo.jobRunTime);
      const annClicks: T[] = await this.getPrevDateData(prevYmd);
      for (const annClick of annClicks) {
        const timePortion = getTimeFromUpdatedAt(annClick.updated_at);
        if (timePortion === '23:59:59') {
          await this.updateToDaily(annClick);
          await success('Rollup for Ann Click Successful');
        } else {
          await failure('Rollup for Ann Click Failed, Time did not match with 23:59:59');
        }
      }
      await success(`${this.jobType} Job is successful`);
    } catch (err: any) {
      await failure(err.message);
      // TODO: raise an error in sentry 
    }
  }
  
  protected abstract getPrevDateData(prevYmd: string): Promise<T[]>;
    
  protected abstract updateToDaily(queryResult: T): Promise<void>;
}