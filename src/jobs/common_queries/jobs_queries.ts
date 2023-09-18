import { TableName } from 'types';
import { EntryDurationType, JobProcessingStatus, JobType } from '../../api-contract';
import { executeQuery } from '../mysql';

export const sqlQueryToSelectLastSuccessData = async<Job> (jobType: JobType): Promise<Job[]> => {
  const sqlQuery = `SELECT * FROM jobs WHERE processing_status=${JobProcessingStatus.Processed} AND 
                    job_type ='${jobType}' ORDER BY updated_at DESC LIMIT 1;`;
  return await executeQuery(sqlQuery);
};

export const queryToGetPrevDateData = async<T> (lastSuccessYmd: string, currentYmd: string, tableName: TableName): Promise<T[]>=> {
  const query = `SELECT * FROM ${tableName} WHERE date_ymd >= ${lastSuccessYmd} AND date_ymd < ${currentYmd}
                 AND entry_duration_type = '${EntryDurationType.CURRENT}'`;
  return await executeQuery(query);
};