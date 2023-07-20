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
import { athenaQueryIfSecondLastDataInTableIsSuccess, 
  athenaQueryIfSecondLastDataInTableIsFailure, 
  executeAppropriateSqlQueryFoFetchData, 
  sqlQueryToSelectLastData, 
  sqlQueryToSelectLastSuccessData,
  executeAppropriateSqlQueryToInsertOrUpdateData, 
  sqlQueryToInsertDataIfJobInProcess,
  sqlQueryToInsertDataIfJobFailed,
  sqlQueryToUpdateData,
  sqlQueryToSelectSecondLastData,
  athenaQueryIfDatesAreNotEqual} from './queries';
import { JobProcessingStatus, JobType } from 'api-contract';
import { randomUUID } from 'crypto';
import { getDateAndHour } from '../utils';
import { DateAndHour, SqlQueryValues } from '../types';

export default function refreshTourUsageData() {
  // 1. start a crawler
  // 2. poll crawler status
  // 3. if failed raise events
  // 4. if successful go run athena query
  // 5. fetch athena query result
  startCrawler();
  console.log('refreshTourUsageData');
}

const startCrawler = async () => {
  const jobKey: string = randomUUID();
  const jobStartedAt: number = Date.now(); 
  const jobDateAndHour: DateAndHour = getDateAndHour(jobStartedAt);

  const client: GlueClient = new GlueClient({ region: process.env.AWS_S3_REGION });
  const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
  try {
    const result: StartCrawlerCommandOutput = await client.send(command);
    if(result.$metadata.httpStatusCode === 200) {
      const sqlValues: SqlQueryValues = {
        jobKey: jobKey, 
        jobInfo: jobDateAndHour, 
        jobType: JobType.CRAWLER_ATHENA,
        processing_status: JobProcessingStatus.InProcess,
        failureReason: null,
      };
      const query = sqlQueryToInsertDataIfJobInProcess(sqlValues);
      await executeAppropriateSqlQueryToInsertOrUpdateData(query);
      await getCrawlerStatus(client, jobKey, jobDateAndHour);
    } else {
      const sqlValues: SqlQueryValues = {
        jobKey: jobKey, 
        jobInfo: jobDateAndHour, 
        jobType: JobType.CRAWLER_ATHENA,
        processing_status: JobProcessingStatus.Failed,
        failureReason: result.$metadata.toString(),
      };
      const query = sqlQueryToInsertDataIfJobFailed(sqlValues);
      await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    }
  } catch (error) {
    console.error('Error running crawler:', error);
    // const sqlValues: SqlQueryValues = {
    //   jobKey: jobKey, 
    //   jobInfo: jobDateAndHour, 
    //   jobType: JobType.GLUE_CRAWLER,
    //   processing_status: JobProcessingStatus.Failed,
    //   failureReason: error.message,
    // };
    // const query = sqlQueryToInsertDataIfJobFailed(sqlValues);
    // await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    // console.log('Crawler an CATCH error FAILED');
    // TODO: won't be updating job as failed raise an error in sentry or something
  }
};

const getCrawlerStatus = async (client: GlueClient, jobKey: string, jobDateAndHour: DateAndHour) => {
  console.log('Crawler data is sent NOW TO GET CRAWLER STATUS so processing status is INPROCESS');
  let crawlerStatus;
  try {
    while (crawlerStatus !== 'READY') {
      if (crawlerStatus === 'FAILED' || crawlerStatus === 'ERROR' || crawlerStatus === 'TIMEOUT') {
        // const sqlValues: SqlQueryValues = {
        //   jobKey: jobKey, 
        //   jobInfo: jobDateAndHour, 
        //   jobType: JobType.GLUE_CRAWLER,
        //   processing_status: JobProcessingStatus.Failed,
        //   failureReason: null,
        // };
        // const query = sqlQueryToUpdateDataIfJobFailed(sqlValues);
        // await executeAppropriateSqlQueryToInsertOrUpdateData(query);
        console.log('Crawler ran into some failure: ', crawlerStatus);
        // TODO: won't be updating job as failed raise an error in sentry or something
      } 
      await new Promise(resolve => setTimeout(resolve, 5000));
        
      const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const getResult: GetCrawlerCommandOutput = await client.send(getCommand);
      crawlerStatus = getResult.Crawler?.State;
      console.log('Crawler status:', crawlerStatus);
    }
    await runAthenaQuery(jobKey);
  } catch (error) {
    // const sqlValues: SqlQueryValues = {
    //   jobKey: jobKey, 
    //   jobInfo: jobDateAndHour, 
    //   jobType: JobType.GLUE_CRAWLER,
    //   processing_status: JobProcessingStatus.Failed,
    //   failureReason: null,
    // };
    // const query = sqlQueryToUpdateDataIfJobFailed(sqlValues);
    // await executeAppropriateSqlQueryToInsertOrUpdateData(query);
    // TODO: won't be updating job as failed raise an error in sentry or something
    console.log('Crawler status catch error process is FAILED', error);
  }
};

const runAthenaQuery = async (jobKey: string) => {
  const client: AthenaClient = new AthenaClient({ region: process.env.AWS_S3_REGION });
  const startCommand = new StartQueryExecutionCommand({
    QueryString: await getAppropriateAthenaQuery(),
    QueryExecutionContext: { Database: process.env.AWS_GLUE_DB_NAME },
    ResultConfiguration: { OutputLocation: process.env.AWS_ATHENA_OUTPUT_LOCATION },
  });
  try {
    const queryExecution = await client.send(startCommand);
    if (queryExecution.$metadata.httpStatusCode === 200) {
      const queryExecutionId = queryExecution.QueryExecutionId;
      const getCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
      let queryStatus;
      while (queryStatus !== 'SUCCEEDED') {
        const getResponse = await client.send(getCommand);
        queryStatus = getResponse.QueryExecution?.Status?.State;
        console.log('queryStatus', queryStatus);
        if (queryStatus === 'FAILED' || queryStatus === 'CANCELLED') {
          const sqlValues: SqlQueryValues = {
            jobKey: jobKey, 
            jobType: JobType.CRAWLER_ATHENA,
            processing_status: JobProcessingStatus.Failed,
            failureReason: `queryStatus: ${queryStatus}`,
          };
          const query = sqlQueryToUpdateData(sqlValues);
          await executeAppropriateSqlQueryToInsertOrUpdateData(query);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
      const getQueryResults: GetQueryResultsCommandOutput = await client.send(getQueryResultsCommand);
      const sqlValues: SqlQueryValues = {
        jobKey: jobKey,
        jobType: JobType.CRAWLER_ATHENA,
        processing_status: JobProcessingStatus.Processed,
        failureReason: null,
      };
      const query = sqlQueryToUpdateData(sqlValues);
      await executeAppropriateSqlQueryToInsertOrUpdateData(query);
      retriveExecutedQueryData(getQueryResults);
    }
  } catch (error: any) {
    console.error('Error running Athena query:', error);
    const sqlValues: SqlQueryValues = {
      jobKey: jobKey, 
      jobType: JobType.CRAWLER_ATHENA,
      processing_status: JobProcessingStatus.Failed,
      failureReason: error.message,
    };
    const query = sqlQueryToUpdateData(sqlValues);
    await executeAppropriateSqlQueryToInsertOrUpdateData(query);
  }
};

const getAppropriateAthenaQuery = async () => {
  
  const queryToFetchLastData = sqlQueryToSelectLastData();
  const lastJobData = await executeAppropriateSqlQueryFoFetchData(queryToFetchLastData);
  const lastJobDateHour: DateAndHour = JSON.parse(lastJobData.info);

  const queryToFetchSecondLastData = sqlQueryToSelectSecondLastData();
  const secondLastJobData = await executeAppropriateSqlQueryFoFetchData(queryToFetchSecondLastData);
 
  if (secondLastJobData !== undefined && secondLastJobData.processing_status === 0) {
    const querytoFetchLastSuccessData = sqlQueryToSelectLastSuccessData();
    const lastSucessData  = await executeAppropriateSqlQueryFoFetchData(querytoFetchLastSuccessData);
    if (lastSucessData !== undefined) {
      const lastSucessDataDateAndHour: DateAndHour = JSON.parse(lastSucessData.info);
      if (lastSucessDataDateAndHour.date === lastJobDateHour.date) {
        const query = athenaQueryIfSecondLastDataInTableIsFailure(JSON.parse(lastSucessData.info), lastJobDateHour.hour);
        return query;
      } else {
        const query = athenaQueryIfDatesAreNotEqual(JSON.parse(lastSucessData.info));
        return query;
      }
    } 
  }
  const query = athenaQueryIfSecondLastDataInTableIsSuccess(lastJobDateHour);
  return query;
};

const retriveExecutedQueryData = (queryExecutionResult: GetQueryResultsCommandOutput) => {
  try {
    const columnNames: any = queryExecutionResult.ResultSet?.ResultSetMetadata?.ColumnInfo?.map(column => column.Name);
    const rows: any = queryExecutionResult.ResultSet?.Rows;
    console.log('columnNames', columnNames);
    console.log('row', rows);
    const results = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = row.Data.map((column: { VarCharValue: string; }) => column.VarCharValue);
      const rowObject: any= {};
      for (let j = 0; j < columnNames.length; j++) {
        const columnName:any = columnNames[j];
        const cellValue = rowData[j];
        rowObject[columnName] = cellValue;
      }
      results.push(rowObject);
    }
    console.log('results', results);
  } catch (error) {
    console.error('Error running retriveExecutedQueryData', error);
  }
};

