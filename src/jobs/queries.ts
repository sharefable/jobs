import { DateAndHour, SqlQueryValues } from 'types';
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
  const sqlQuery = 'SELECT * FROM jobs ORDER BY id DESC LIMIT 1 OFFSET 1';
  return sqlQuery;
};

export const sqlQueryToSelectLastData = () => {
  const sqlQuery = 'SELECT * FROM jobs ORDER BY id DESC LIMIT 1';
  return sqlQuery;
};

export const sqlQueryToSelectLastSuccessData = () => {
  const sqlQuery = 'SELECT * FROM jobs where processing_status = 3 ORDER BY id DESC LIMIT 1';
  return sqlQuery;
};

export const athenaQueryIfSecondLastDataInTableIsSuccess = (currentHour: DateAndHour) => {
  const date = 20230718;
  const h =12;
  const query = `SELECT payload_tour_id, ymd, COUNT(sid) AS view_unique FROM 
                 (SELECT DISTINCT payload_tour_id, sid FROM "ann_btn_clicked" 
                 where ymd=${date} and 
                 h=${h}) subquery GROUP BY payload_tour_id`;
  return query;
};

export const athenaQueryIfSecondLastDataInTableIsFailure = (lastSucessDataDateAndHour: DateAndHour, currentHour: string) => {
  const query = `SELECT payload_tour_id, ymd, COUNT(sid) AS view_unique FROM 
                 (SELECT DISTINCT payload_tour_id, sid FROM "ann_btn_clicked" 
                 where ymd=${lastSucessDataDateAndHour.date} and 
                 h BETWEEN ${lastSucessDataDateAndHour.hour} AND 
                 ${currentHour}) subquery GROUP BY payload_tour_id`;
  return query;
};

export const athenaQueryIfDatesAreNotEqual = (lastSucessDataDateAndHour: DateAndHour) => {
  const query = `SELECT payload_tour_id, COUNT(sid) AS view_unique FROM 
                   (SELECT DISTINCT payload_tour_id, sid FROM "ann_btn_clicked" 
                   where ymd=${lastSucessDataDateAndHour.date} and 
                   h=${lastSucessDataDateAndHour.hour}) subquery GROUP BY payload_tour_id`;
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
