import { AthenaClient, 
  GetQueryExecutionCommand,
  GetQueryResultsCommand, 
  GetQueryResultsCommandOutput,
  StartQueryExecutionCommand } from '@aws-sdk/client-athena';
import { GetCrawlerCommand, 
  GetCrawlerCommandOutput, 
  GlueClient, 
  StartCrawlerCommand, 
  StartCrawlerCommandOutput } from '@aws-sdk/client-glue';
import { sqlQueryToSelectLastSuccessData, 
  sqlQueryToInsertDataIfJobInProcess,
  sqlQueryToInsertDataIfJobFailed,
  sqlQueryToUpdateData,
  sqlQueryToSelectSecondLastData, 
  queriesForEachTableIfFailed,
  queriesForEachTableIfSuccess} from './job_queries';
import { JobProcessingStatus } from 'api-contract';
import { randomUUID } from 'crypto';
import { executeAppropriateSqlQueryFoFetchData, 
  executeAppropriateSqlQueryToInsertOrUpdateData,
  generateSqlValues, 
  getJobTimestampInfo } from '../utils';
import { AthenaEntityForAnnTourClick, AthenaQueryEntityForConversion, 
  AthenaQueryEntityForMetrics, 
  GenericAthenaResultType, 
  JobTimestampInfo, 
  RespectiveQuery } from '../types';
import { processAthenaQueryResultToDb } from './process_metrics';

export default async function refreshTourUsageData() {
  const jobKey: string = randomUUID();
  const jobTimestampInfo: JobTimestampInfo =  await startJob(jobKey);
  await runAthenaQuery(jobKey, jobTimestampInfo);
}

const startJob = async (jobKey: string) => {
  const jobStartedAt: number = Date.now(); 
  const jobTimestampInfo: JobTimestampInfo = getJobTimestampInfo(jobStartedAt);
  const glueClient: GlueClient = new GlueClient({ region: process.env.AWS_S3_REGION });
  const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
  try {
    const glueResult: StartCrawlerCommandOutput = await glueClient.send(command);
    if(glueResult.$metadata.httpStatusCode === 200) {
      await markJobInProcess(jobKey, jobTimestampInfo);
      await getCrawlerStatus(glueClient, jobKey, jobTimestampInfo);
    } else {
      await markJobFailed(jobKey, jobTimestampInfo, glueResult.$metadata.toString());
    }
  } catch (error) {
    await markJobFailed(jobKey, jobTimestampInfo, 'something went wrong');
    // TODO: raise an error in sentry 
  }
  return jobTimestampInfo;
};

const getCrawlerStatus = async (glueClient: GlueClient, jobKey: string, timestampInfo: JobTimestampInfo) => {
  let crawlerStatus;
  try {
    while (crawlerStatus !== 'READY') {
      if (crawlerStatus === 'FAILED' || crawlerStatus === 'ERROR' || crawlerStatus === 'TIMEOUT') {
        await markJobFailedUpdate(jobKey, timestampInfo, null);
        // TODO: raise an error in sentry
      } 
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
      crawlerStatus = getResult.Crawler?.State;
    }
  } catch (error) {
    await markJobFailedUpdate(jobKey, timestampInfo, null);
    // TODO: raise an error in sentry
  }
};

const runAthenaQuery = async (jobKey: string, timestampInfo: JobTimestampInfo) => {
  const queries: RespectiveQuery[] = await getAppropriateAthenaQuery(timestampInfo);
  for (let i = 0; i < queries.length; i++) {
    const athenaClient: AthenaClient = new AthenaClient({ region: process.env.AWS_S3_REGION });
    const startCommand = new StartQueryExecutionCommand({
      QueryString: queries.at(i)?.query,
      QueryExecutionContext: { Database: process.env.AWS_GLUE_DB_NAME },
      ResultConfiguration: { OutputLocation: process.env.AWS_ATHENA_OUTPUT_LOCATION },
    });
    try {
      const queryExecution = await athenaClient.send(startCommand);
      if (queryExecution.$metadata.httpStatusCode === 200) {
        const queryExecutionId = queryExecution.QueryExecutionId;
        const getCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
        let queryStatus;
        while (queryStatus !== 'SUCCEEDED') {
          const getResponse = await athenaClient.send(getCommand);
          queryStatus = getResponse.QueryExecution?.Status?.State;
          if (queryStatus === 'FAILED' || queryStatus === 'CANCELLED') {
            await markJobFailed(jobKey, timestampInfo, null);
          }
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
        const getQueryResults: GetQueryResultsCommandOutput = await athenaClient.send(getQueryResultsCommand);
        const queryResultArray: GenericAthenaResultType[] =  retriveExecutedQueryData(getQueryResults);
        await processAthenaQueryResultToDb(queryResultArray, timestampInfo, queries.at(i)?.tableName);
        await markJobSuccess(jobKey, timestampInfo);
      }
    } catch (error: any) {
      await markJobFailedUpdate(jobKey, timestampInfo, error);
    }
  }
};

const getAppropriateAthenaQuery = async (currentJobTimestampInfo: JobTimestampInfo) => {
  const queryToGetSecondLastJob = sqlQueryToSelectSecondLastData();
  const secondLastJobData = await executeAppropriateSqlQueryFoFetchData(queryToGetSecondLastJob, 0);
  if (secondLastJobData !== undefined && secondLastJobData.processing_status === 0) {
    const querytoFetchLastSuccessJob = sqlQueryToSelectLastSuccessData();
    const lastSuccessJobData  = await executeAppropriateSqlQueryFoFetchData(querytoFetchLastSuccessJob, 0);
    if (lastSuccessJobData !== undefined) {
      const lastSuccessJobTimestamp: JobTimestampInfo = JSON.parse(lastSuccessJobData.info);
      return queriesForEachTableIfFailed(lastSuccessJobTimestamp);
    } 
  }
  return queriesForEachTableIfSuccess(currentJobTimestampInfo);
};

const retriveExecutedQueryData = (
  queryExecutionResult: GetQueryResultsCommandOutput): 
AthenaQueryEntityForMetrics[] | AthenaQueryEntityForConversion[] | AthenaEntityForAnnTourClick[] => {
  try {
    const columnNames: any = queryExecutionResult.ResultSet?.ResultSetMetadata?.ColumnInfo?.map(column => column.Name);
    const rows: any = queryExecutionResult.ResultSet?.Rows;
    const results: AthenaQueryEntityForMetrics[] | 
    AthenaQueryEntityForConversion[] | AthenaEntityForAnnTourClick[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = row.Data.map((column: { VarCharValue: string; }) => column.VarCharValue);
      const rowObject: any = {};
      for (let j = 0; j < columnNames.length; j++) {
        const columnName:any = columnNames[j];
        const cellValue = rowData[j];
        rowObject[columnName] = cellValue;
      }
      results.push(rowObject);
    }
    return results;
  } catch (error: any) {
    throw new Error(error);
  }
};

const markJobSuccess = async (jobKey: string, jobTimestampInfo: JobTimestampInfo) => {
  const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.Processed, null);
  const query = sqlQueryToUpdateData(sqlQueryValues);
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

const markJobFailed   = async (jobKey: string, jobTimestampInfo: JobTimestampInfo, failureReason: string | null) => {
  const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.Failed, failureReason);
  const query = sqlQueryToInsertDataIfJobFailed(sqlQueryValues);
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

const markJobInProcess  = async (jobKey: string, jobTimestampInfo: JobTimestampInfo) => {
  const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.InProcess, null);
  const query = sqlQueryToInsertDataIfJobInProcess(sqlQueryValues);
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

const markJobFailedUpdate  = async (
  jobKey: string, jobTimestampInfo: 
  JobTimestampInfo, 
  failureReason: string | null) => {
  const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.Failed, failureReason);
  const query = sqlQueryToUpdateData(sqlQueryValues);
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};
