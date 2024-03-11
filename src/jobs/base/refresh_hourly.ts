import { processAthenaCsvDataToLocal, processDataFromRaw, runAthenaQuery } from '../athena';
import { JobBase } from './job';
import { getCreatedAtAndUpdateAt, getYmd } from '../../utils';
import { sqlQueryToSelectLastSuccessData } from '../common_queries/jobs_queries';
import { Job } from '../../types';
import { captureException } from '@sentry/node';
import { JobType } from '../../api-contract';
import * as log from '../../log';
import fs from 'fs';

export abstract class RefreshHourlyBase<T> extends JobBase {

  public async executeJob() {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      const currentYmd = getYmd(this.baseValues.jobInfo.jobDataScanningTime);
      if (this.getJobType() === JobType.REFRESH_USERS_LEVEL_ANALYTICS) {
        console.log('Current ymd', currentYmd);
        const tourUsers: T[] = await this.getDataFromAnalyticsDb(currentYmd as unknown as T);
        console.log('tourUsers', tourUsers);
        await this.processTourUsersToS3(tourUsers);
      } else {
        const query = await this.getAthenaQuery();
        this.baseValues.jobInfo.queryExecutionId = await runAthenaQuery(query);
        if (this.getJobType() === JobType.REFRESH_USER_AID_MAPPING 
          || this.getJobType() === JobType.REFRESH_AID_SID_MAPPING) {
          await this.processCsvDataToDB(this.baseValues.jobInfo.queryExecutionId);
        } else {
          const athenaResult: T[] = await processDataFromRaw(this.baseValues.jobInfo.queryExecutionId);
          const createdAtAndUpdatedAt: string = getCreatedAtAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
          const parts = createdAtAndUpdatedAt.split(' ');
          const timePart = parts[1];
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
      }
      await success();
    } catch (error) {
      await failure((error as Error).stack);
      captureException(error as Error);
    }
  }

  protected async processCsvDataToDB(queryExecutionId: string): Promise<void> {
    const tempFilepath = await processAthenaCsvDataToLocal(queryExecutionId);
    try {
      console.log('Job type', this.getJobType());
      await this.insertNewRow([] as T, tempFilepath);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    } finally {
      log.info(`CleanUp: Deleting the file ${tempFilepath}`);
      try {
        fs.unlinkSync(tempFilepath);
        log.info(`CleanUp: Deleted the file ${tempFilepath}`);
      } catch (err) {
        log.warn('Something went wrong while deleting the file', (err as Error).stack);
      }
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

  protected abstract processTourUsersToS3(tourUsers: T[]): Promise<void>;
}