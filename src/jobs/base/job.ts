import { getUTCTimesForJob } from '../../utils';
import { JobProcessingStatus, JobType } from '../../api-contract';
import { executeQuery } from '../mysql';
import { randomUUID } from 'crypto';
import { captureException } from '@sentry/node';

export abstract class JobBase {

  protected baseValues = {jobKey: randomUUID(), jobInfo: getUTCTimesForJob(), updateAnalyticsDataToLastHour: false};
  
  protected abstract getJobType(): JobType 

  protected abstract execute(): Promise<void>;

  public async executeJob() {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      await this.execute();
      await success();
    } catch (error) {
      await failure((error as Error).stack);
      captureException(error as Error);
    }
  }
    
  public async createJob(jobType: JobType): Promise<any> {
    const row: any = await executeQuery(
      `INSERT INTO jobs (created_at, updated_at, job_type, job_key, 
        processing_status, failure_reason, info) VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), '${jobType}', 
        '${this.baseValues.jobKey}', ${JobProcessingStatus.Touched}, null, 
        '${JSON.stringify(this.baseValues.jobInfo, null, 2)}')`);
    const rowId: number = row.insertId;
    return async () => {
      await executeQuery(
        `UPDATE jobs SET processing_status = ${JobProcessingStatus.InProcess} WHERE id = ${rowId}`);
      return [
        async () => {
          await executeQuery(
            `UPDATE jobs SET processing_status = ${JobProcessingStatus.Processed}, 
              info = '${JSON.stringify(this.baseValues.jobInfo, null, 2)}' 
              WHERE id = ${rowId}`);
        },
        async (failureReason?: string) => {
          await executeQuery(
            `UPDATE jobs SET processing_status = ${JobProcessingStatus.Failed},
              failure_reason = '${JSON.stringify(failureReason).replace(/'/g, '\'\'')}', 
              info = '${JSON.stringify(this.baseValues.jobInfo, null, 2)}' WHERE id = ${rowId}`);
        },
      ];
    };
  }
}
