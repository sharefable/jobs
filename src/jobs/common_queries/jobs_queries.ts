import { TableName } from 'types';
import { EntryDurationType, JobProcessingStatus, JobType } from '../../api-contract';
import { executeQueryToFetchData } from '../mysql';

export const sqlQueryToSelectLastSuccessData = async<Job> (jobType: JobType): Promise<Job[]> => {
  const sqlQuery = `SELECT * FROM jobs WHERE processing_status=${JobProcessingStatus.Processed} AND 
                    job_type ='${jobType}' ORDER BY updated_at DESC LIMIT 1;`;
  return await executeQueryToFetchData(sqlQuery);
};

export const queryToGetPrevDateData = async<T> (ymd: string, tableName: TableName): Promise<T[]>=> {
  const query = `SELECT * FROM ${tableName} WHERE date_ymd = ${ymd}
                 AND entry_duration_type = '${EntryDurationType.CURRENT}'`;
  return await executeQueryToFetchData(query);
};