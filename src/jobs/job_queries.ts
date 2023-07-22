import { JobTimestampInfo, SqlQueryValues } from 'types';
import { getConnection } from '../db';
import { executeQuery } from '../utils';
import { MysqlError } from 'mysql';

export const executeAppropriateSqlQueryFoFetchData = async (query: string) => { 
  const conn = await getConnection();
  try {
    const rows: any = await executeQuery(conn, query);
    return rows[0];
  } catch (err: any) {
    console.log(err.message);
  } finally {
    conn.release();
  }
};

export const executeAppropriateSqlQueryToInsertOrUpdateData = async (query: string) => {
  const conn = await getConnection();
  await new Promise((res, rej) => {
    conn!.query(
      query,
      (err: MysqlError | null) => {
        if (err) rej(err);
        else res(1);
      });
  });
};

export const sqlQueryToSelectSecondLastData = () => {
  const sqlQuery = 'SELECT * FROM jobs WHERE job_type = ATHENA_QUERY ORDER BY id DESC LIMIT 1 OFFSET 1';
  return sqlQuery;
};

export const sqlQueryToFetchLastAthenaJob = () => {
  const sqlQuery = 'SELECT * FROM jobs WHERE job_type = ATHENA_QUERY ORDER BY id DESC LIMIT 1';
  return sqlQuery;
};

export const sqlQueryToSelectLastSuccessData = () => {
  const sqlQuery = 'SELECT * FROM jobs where processing_status = 3 and job_type = ATHENA_QUERY ORDER BY id DESC LIMIT 1';
  return sqlQuery;
};

export const athenaQueryToFetchEventsForCurrentTimestamp = (dateAndHour: JobTimestampInfo) => {
  const query = `SELECT payload_tour_id, ymd, COUNT(sid) AS views_all FROM 
                 (SELECT payload_tour_id, sid,  ymd FROM "ann_btn_clicked" 
                 where ymd=${dateAndHour.date} and 
                 h=${dateAndHour.jobRanForPrevHour}) subquery GROUP BY payload_tour_id, ymd`;
  return query;
};

export const athenaQueryToFetchAllEventsFromLastSuccessToCurrentTimestamp = (lastSucessDataDateAndHour: JobTimestampInfo) =>{
  const query = `SELECT payload_tour_id, ymd, COUNT(sid) AS views_all FROM 
                 (SELECT payload_tour_id, sid, cast(concat(cast(ymd as varchar), 
                 lpad(cast(h as varchar(2)), 2, '0') ) as bigint) as test FROM 
                 "ann_btn_clicked" where test>=${lastSucessDataDateAndHour.date + 
                  lastSucessDataDateAndHour.jobRanForPrevHour.toString().padStart(2, '0')}
                  ) subquery GROUP BY payload_tour_id, ymd`;
  return query;
};

export const sqlQueryToInsertDataIfJobInProcess = (queryValues: SqlQueryValues) => {
  const query =  `INSERT INTO jobs (created_at, updated_at, job_type, job_key, 
                  processing_status, failure_reason, info) VALUES 
                 (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), '${queryValues.jobType}', 
                '${queryValues.jobKey}', '${queryValues.processing_status}', 
                 ${queryValues.failureReason}, '${JSON.stringify(queryValues.jobInfo)}')`;
  return query;
};

export const sqlQueryToInsertDataIfJobFailed = (queryValues: SqlQueryValues) => {
  const query =  `INSERT INTO jobs (created_at, updated_at, job_type, job_key, 
                  processing_status, failure_reason, info) VALUES (CURRENT_TIMESTAMP(), 
                  CURRENT_TIMESTAMP(), '${queryValues.jobType}', '${queryValues.jobKey}', 
                  '${queryValues.processing_status}', ${queryValues.failureReason}, 
                  '${JSON.stringify(queryValues.jobInfo)}')`;
  return query;
};

export const sqlQueryToUpdateData = (queryValues: SqlQueryValues) => {
  const query =  `UPDATE jobs SET processing_status = '${queryValues.processing_status}'
                  WHERE job_key = '${queryValues.jobKey}'`;
  return query;
};