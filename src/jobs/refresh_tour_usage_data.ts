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
import { athenaQueryToFetchEventsForCurrentTimestamp, 
  athenaQueryToFetchAllEventsFromLastSuccessToCurrentTimestamp, 
  executeAppropriateSqlQueryFoFetchData, 
  sqlQueryToFetchLastAthenaJob, 
  sqlQueryToSelectLastSuccessData,
  executeAppropriateSqlQueryToInsertOrUpdateData, 
  sqlQueryToInsertDataIfJobInProcess,
  sqlQueryToInsertDataIfJobFailed,
  sqlQueryToUpdateData,
  sqlQueryToSelectSecondLastData } from './job_queries';
import { JobProcessingStatus } from 'api-contract';
import { randomUUID } from 'crypto';
import { generateSqlValues, getDateAndHour } from '../utils';
import { AthenaQueryEntity, JobTimestampInfo } from '../types';
import { processAthenaQueryResultToDb } from './process_data_to_db';

export default function refreshTourUsageData() {
  startCrawler();
  console.log('refreshTourUsageData');
}

const startCrawler = async () => {
  const jobKey: string = randomUUID();
  const jobStartedAt: number = Date.now(); 
  const jobTimestampInfo: JobTimestampInfo = getDateAndHour(jobStartedAt);
  
  const glueClient: GlueClient = new GlueClient({ region: process.env.AWS_S3_REGION });
  const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
  try {
    const glueResult: StartCrawlerCommandOutput = await glueClient.send(command);
    if(glueResult.$metadata.httpStatusCode === 200) {
      const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.InProcess, null);
      const query = sqlQueryToInsertDataIfJobInProcess(sqlQueryValues);
      await executeAppropriateSqlQueryToInsertOrUpdateData(query);
      await getCrawlerStatus(glueClient, jobKey, jobTimestampInfo);
    } else {
      const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.Failed, glueResult.$metadata.toString());
      const query = sqlQueryToInsertDataIfJobFailed(sqlQueryValues);
      await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    }
  } catch (error) {
    const sqlQueryValues = generateSqlValues(jobKey, jobTimestampInfo, JobProcessingStatus.Failed, 'Something went wrong');
    const query = sqlQueryToInsertDataIfJobFailed(sqlQueryValues);
    await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    // TODO: raise an error in sentry 
  }
};

const getCrawlerStatus = async (glueClient: GlueClient, jobKey: string, timestampInfo: JobTimestampInfo) => {
  let crawlerStatus;
  try {
    while (crawlerStatus !== 'READY') {
      if (crawlerStatus === 'FAILED' || crawlerStatus === 'ERROR' || crawlerStatus === 'TIMEOUT') {
        const sqlQueryValues = generateSqlValues(jobKey, timestampInfo, JobProcessingStatus.Failed, null);
        const query = sqlQueryToUpdateData(sqlQueryValues);
        await executeAppropriateSqlQueryToInsertOrUpdateData(query);
        // TODO: raise an error in sentry
      } 
      await new Promise(resolve => setTimeout(resolve, 5000));
        
      const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
      crawlerStatus = getResult.Crawler?.State;
    }
    await runAthenaQuery(jobKey, timestampInfo);
  } catch (error) {
    const sqlQueryValues = generateSqlValues(jobKey, timestampInfo, JobProcessingStatus.Failed, null);
    const query = sqlQueryToUpdateData(sqlQueryValues);
    await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    // TODO: raise an error in sentry
  }
};

const runAthenaQuery = async (jobKey: string, timestampInfo: JobTimestampInfo) => {
  const athenaClient: AthenaClient = new AthenaClient({ region: process.env.AWS_S3_REGION });
  const startCommand = new StartQueryExecutionCommand({
    QueryString: await getAppropriateAthenaQuery(),
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
        console.log('queryStatus', queryStatus);
        if (queryStatus === 'FAILED' || queryStatus === 'CANCELLED') {
          const sqlQueryValues = generateSqlValues(jobKey, timestampInfo, JobProcessingStatus.Failed, `queryStatus: ${queryStatus}`);
          const query = sqlQueryToUpdateData(sqlQueryValues);
          await executeAppropriateSqlQueryToInsertOrUpdateData(query);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
      const getQueryResults: GetQueryResultsCommandOutput = await athenaClient.send(getQueryResultsCommand);
      const queryResultArray: AthenaQueryEntity[] =  retriveExecutedQueryData(getQueryResults);
      if (queryResultArray.length > 0) {
        await processAthenaQueryResultToDb(queryResultArray);
      }
      const sqlQueryValues = generateSqlValues(jobKey, timestampInfo, JobProcessingStatus.Processed, null);
      const query = sqlQueryToUpdateData(sqlQueryValues);
      await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    }
  } catch (error: any) {
    const sqlQueryValues = generateSqlValues(jobKey, timestampInfo, JobProcessingStatus.Failed, error.message);
    const query = sqlQueryToUpdateData(sqlQueryValues);
    await executeAppropriateSqlQueryToInsertOrUpdateData(query);
  }
};

const getAppropriateAthenaQuery = async () => {
  const queryToGetCurrentAthenaJob = sqlQueryToFetchLastAthenaJob();
  const currentAthenaJobData = await executeAppropriateSqlQueryFoFetchData(queryToGetCurrentAthenaJob);
  const currentAthenaJobTimestampInfo: JobTimestampInfo = JSON.parse(currentAthenaJobData.info);

  const queryToGetSecondLastAthenaJob = sqlQueryToSelectSecondLastData();
  const secondLastAthenaJobData = await executeAppropriateSqlQueryFoFetchData(queryToGetSecondLastAthenaJob);
 
  if (secondLastAthenaJobData !== undefined && secondLastAthenaJobData.processing_status === 0) {
    const querytoFetchLastSuccessAthenaJob = sqlQueryToSelectLastSuccessData();
    const lastSucessAthenaJobData  = await executeAppropriateSqlQueryFoFetchData(querytoFetchLastSuccessAthenaJob);
    if (lastSucessAthenaJobData !== undefined) {
      const lastSucessAthenaJobTimestamp: JobTimestampInfo = JSON.parse(lastSucessAthenaJobData.info);
      return athenaQueryToFetchAllEventsFromLastSuccessToCurrentTimestamp(lastSucessAthenaJobTimestamp);
    } 
  }
  const query = athenaQueryToFetchEventsForCurrentTimestamp(currentAthenaJobTimestampInfo);
  return query;
};

const retriveExecutedQueryData = (queryExecutionResult: GetQueryResultsCommandOutput): AthenaQueryEntity[] => {
  try {
    const columnNames: any = queryExecutionResult.ResultSet?.ResultSetMetadata?.ColumnInfo?.map(column => column.Name);
    const rows: any = queryExecutionResult.ResultSet?.Rows;
    const results: AthenaQueryEntity[] = [];
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

