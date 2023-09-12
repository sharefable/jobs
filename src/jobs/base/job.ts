import { getUTCTimesForJob } from '../../utils';
import { JobProcessingStatus, JobType } from '../../api-contract';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from '../mysql';
import { randomUUID } from 'crypto';
import { captureException } from '@sentry/node';

export abstract class JobBase {

  protected baseValues = {jobKey: randomUUID(), jobInfo: getUTCTimesForJob()};
  
  protected abstract getJobType(): JobType 
    
  public async createJob(jobType: JobType): Promise<any> {
    try {
      await executeQueryToInsertOrUpdateData(
        `INSERT INTO jobs (created_at, updated_at, job_type, job_key, 
        processing_status, failure_reason, info) VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), '${jobType}', 
        '${this.baseValues.jobKey}', ${JobProcessingStatus.Touched}, null, 
        '${JSON.stringify(this.baseValues.jobInfo, null, 2)}')`);
      const rowId: any = (await executeQueryToFetchData('SELECT LAST_INSERT_ID() as id from jobs')).at(0);
      return async () => {
        await executeQueryToInsertOrUpdateData(
          `UPDATE jobs SET processing_status = ${JobProcessingStatus.InProcess} WHERE id = ${rowId.id}`);
        
        return [
          async () => {
            await executeQueryToInsertOrUpdateData(
              `UPDATE jobs SET processing_status = ${JobProcessingStatus.Processed}, 
              info = '${JSON.stringify(this.baseValues.jobInfo, null, 2)}' 
              WHERE id = ${rowId.id}`);
          },
          async (failureReason?: string) => {
            await executeQueryToInsertOrUpdateData(
              `UPDATE jobs SET processing_status = ${JobProcessingStatus.Failed},
              failure_reason = '${JSON.stringify(failureReason).replace(/'/g, '\'\'')}', 
              info = '${JSON.stringify(this.baseValues.jobInfo, null, 2)}' WHERE id = ${rowId.id}`);
          },
        ];
      };
    } catch (error) {
      captureException(error as Error);
    }
  }
}