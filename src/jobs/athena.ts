import { 
  AthenaClient, 
  GetQueryExecutionCommand,
  GetQueryResultsCommand, 
  GetQueryResultsCommandOutput,
  QueryExecutionState,
  StartQueryExecutionCommand, 
} from '@aws-sdk/client-athena';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import fs from 'fs';
import * as log from '../log';
import { executeQuery } from './mysql';
import { pipeline } from 'stream/promises';
import { s3 } from '../singletons';
import { tmpdir } from 'os';

const athenaClient: AthenaClient = new AthenaClient({ region: process.env.AWS_ATHENA_REGION });

export const runAthenaQuery = async (query: string): Promise<string> => {
  const startCommand = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: { Database: process.env.AWS_GLUE_DB_NAME },
    ResultConfiguration: { OutputLocation: `s3://${process.env.AWS_S3_ATHENA_OUTPUT_BUCKET}/${process.env.AWS_S3_ATHENA_OUTPUT_ROOT_DIR}/` }, 
  });
  const queryExecution = await athenaClient.send(startCommand);
  if (queryExecution.$metadata.httpStatusCode === 200) {
    const queryExecutionId: string = queryExecution.QueryExecutionId as string;
    const getCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
    let queryStatus: QueryExecutionState | string | undefined;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getResponse = await athenaClient.send(getCommand);
      queryStatus = getResponse.QueryExecution?.Status?.State;
      if (queryStatus === QueryExecutionState.FAILED || queryStatus === QueryExecutionState.CANCELLED) {
        throw new Error(getResponse.QueryExecution?.Status?.AthenaError?.ErrorMessage || 'Query Failed');
      }
    } while (queryStatus !== QueryExecutionState.SUCCEEDED);

    return queryExecutionId;
  } else {
    throw new Error('No execution Id found, undefined');
  }
};

export const processDataFromRaw = async<T> (queryExecutionId: string):Promise<T[]>  => {
  const result: T[] = [];
  let nextToken: string | undefined = undefined;
  let pageNo = 0;
  do {
    const getQueryResultsCommand = new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId,
      NextToken: nextToken,
    });
    const getQueryResults: GetQueryResultsCommandOutput = await athenaClient.send(getQueryResultsCommand);
    nextToken = getQueryResults.NextToken;
   
    const queryResultChunk: T[] = retriveExecutedQueryData(getQueryResults, pageNo);
    result.push(...queryResultChunk);
    pageNo++;
  } while (nextToken);
  return result;
};

export const retriveExecutedQueryData = <T>(
  queryExecutionResult: GetQueryResultsCommandOutput,
  pageNo: number): T[] => {
  const columnNames: any = queryExecutionResult.ResultSet?.ResultSetMetadata?.ColumnInfo?.map(column => column.Name);
  const rows: any = queryExecutionResult.ResultSet?.Rows;
  const dataRowIndex = pageNo ? 0 : 1; // If it's the first page then only first row has header
  const results: T[]= [];
  for (let i = dataRowIndex; i < rows.length; i++) {
    const rowData = rows[i].Data.map((column: { VarCharValue: string; }) => column.VarCharValue);
    const rowObject: any = {};
    for (let j = 0; j < columnNames.length; j++) {
      const columnName:any = columnNames[j];
      const cellValue = rowData[j];
      rowObject[columnName] = cellValue;
    }
    results.push(rowObject);
  }
  return results;
};

export const processAthenaCsvDataToLocal = async (queryExecutionId: string): Promise<string>  => {
  const params = {
    Bucket: process.env.AWS_S3_ATHENA_OUTPUT_BUCKET,
    Key: `${process.env.AWS_S3_ATHENA_OUTPUT_ROOT_DIR}/${queryExecutionId}.csv`,
  };

  const tempFilepath = `${tmpdir}/${queryExecutionId}.csv`;
  log.info(`Athena data is being written to ${tempFilepath}`);
  let fileHandler;
  try {
    const response = await s3.send(new GetObjectCommand(params));
    const bodyStream = response.Body as Readable;
    fileHandler = fs.createWriteStream(tempFilepath);
    await pipeline(bodyStream, fileHandler);
    log.info(`Athena data is successfully written to ${tempFilepath}`);
    return tempFilepath;
  } catch (err) {
    log.err('Something went wrong while processing athena query to local temp file', (err as Error).message);
    throw new Error((err as Error).message);
  } finally {
    if (fileHandler) fileHandler.close();
  }
};
