import { JobTimestampInfo, RespectiveQuery, SqlQueryValues, TableName } from '../types';
import { JobType } from '../api-contract';
import { athenaQueryToGetAnnClicksFromLastSuccessToCurrentTimestamp, 
  athenaQueryToGetAnnTourClicksForLastSucessfulJobRun, 
  athenaQueryToGetConversionForLastSucessfulJobRun, 
  athenaQueryToGetConversionFromLastSuccessToCurrentTimestamp, 
  athenaQueryToGetMetricsForLastSucessfulJobRun, 
  athenaQueryToGetMetricsFromLastSuccessToCurrentTimestamp} from './athena_queries';

export const sqlQueryToSelectSecondLastData = () => {
  const sqlQuery = `SELECT * FROM jobs WHERE job_type='${JobType.REFRESH_TOUR_ANALYTICS}' 
                    ORDER BY updated_at DESC LIMIT 1 OFFSET 1`;
  return sqlQuery;
};

export const sqlQueryToSelectLastSuccessData = () => {
  const sqlQuery = `SELECT * FROM jobs WHERE processing_status=3 AND 
                    job_type='${JobType.REFRESH_TOUR_ANALYTICS}' ORDER BY updated_at DESC LIMIT 1`;
  return sqlQuery;
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
  const query =  `UPDATE jobs SET processing_status='${queryValues.processing_status}'
                  WHERE job_key='${queryValues.jobKey}'`;
  return query;
};

export const queriesForEachTableIfSuccess= (jobTimestampInfo: JobTimestampInfo) => {
  const queryArray: RespectiveQuery[] = [];
  
  const getSuccessQueryForMetricsTable =  athenaQueryToGetMetricsForLastSucessfulJobRun(jobTimestampInfo);
  const metricsQuery: RespectiveQuery = {query: getSuccessQueryForMetricsTable, tableName: TableName.AnalyticsTourMetrics};
  
  const getSuccessQueryForCoversionTable = athenaQueryToGetConversionForLastSucessfulJobRun(jobTimestampInfo);
  const conversionQuery: RespectiveQuery = {query: getSuccessQueryForCoversionTable, tableName: TableName.AnalyticsConversion};
  
  const getSuccessQueryForAnnClickTable = athenaQueryToGetAnnTourClicksForLastSucessfulJobRun(jobTimestampInfo);
  const annClickQuery: RespectiveQuery = {query: getSuccessQueryForAnnClickTable, tableName: TableName.AnalyticTourAnnClicks};
  
  queryArray.push(metricsQuery);
  queryArray.push(conversionQuery);
  queryArray.push(annClickQuery);
  return queryArray;
};

export const queriesForEachTableIfFailed = (jobTimestampInfo: JobTimestampInfo) => {
  const queryArray: RespectiveQuery[] = [];
  
  const getSuccessQueryForMetricsTable = athenaQueryToGetMetricsFromLastSuccessToCurrentTimestamp(jobTimestampInfo);
  const metricsQuery: RespectiveQuery = {query: getSuccessQueryForMetricsTable,  tableName: TableName.AnalyticsTourMetrics};
  
  const getSuccessQueryForCoversionTable = athenaQueryToGetConversionFromLastSuccessToCurrentTimestamp(jobTimestampInfo);
  const conversionQuery: RespectiveQuery = {query: getSuccessQueryForCoversionTable, tableName: TableName.AnalyticsConversion};
  
  const getSuccessQueryForAnnClickTable = athenaQueryToGetAnnClicksFromLastSuccessToCurrentTimestamp(jobTimestampInfo);
  const annClickQuery: RespectiveQuery = {query: getSuccessQueryForAnnClickTable, tableName: TableName.AnalyticTourAnnClicks};

  queryArray.push(metricsQuery);
  queryArray.push(conversionQuery);
  queryArray.push(annClickQuery);
  return queryArray;
};