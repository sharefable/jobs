import { EntryDurationType, JobProcessingStatus } from '../api-contract';
import { JobTimestampInfo } from '../types';
import { executeQueryToInsertOrUpdateData } from './mysql';

export const createJob = async (jobName: string, jobKey: string, jobInfo: JobTimestampInfo) => {
  await executeQueryToInsertOrUpdateData(
    `INSERT INTO jobs (created_at, updated_at, job_type, job_key, 
            processing_status, failure_reason, info) VALUES 
           (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), '${jobName}', 
          '${jobKey}', ${JobProcessingStatus.Touched}, null, '${JSON.stringify(jobInfo)}');`);

  return async function() {
    await executeQueryToInsertOrUpdateData(
      `UPDATE jobs SET processing_status = ${JobProcessingStatus.InProcess} WHERE job_key = '${jobKey}';`);

    return [
      async function (data: string) {
        await executeQueryToInsertOrUpdateData(
          `UPDATE jobs SET processing_status = ${JobProcessingStatus.Processed}, 
           failure_reason = '${data}' WHERE job_key = '${jobKey}';`);
      },
      async function (data: string) {
        await executeQueryToInsertOrUpdateData(
          `UPDATE jobs SET processing_status = ${JobProcessingStatus.Failed}, 
          failure_reason = '${data}' WHERE job_key = '${jobKey}';`);
      },
    ];
  };
};

export const sqlQueryToSelectLastSuccessData = (jobType: string) => {
  const sqlQuery = `SELECT * FROM jobs WHERE processing_status=3 AND 
                    job_type ='${jobType}' ORDER BY updated_at DESC LIMIT 1;`;
  return sqlQuery;
};

export const queryToGetPrevDateData = (ymd: string, tableName: string) => {
  const query = `SELECT * FROM ${tableName} WHERE date_ymd = ${ymd}
                  AND entry_duration_type = '${EntryDurationType.CURRENT}'`;
  return query;
};