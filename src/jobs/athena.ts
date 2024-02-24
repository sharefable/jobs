import { 
  AthenaClient, 
  GetQueryExecutionCommand,
  GetQueryResultsCommand, 
  GetQueryResultsCommandOutput,
  QueryExecutionState,
  StartQueryExecutionCommand, 
} from '@aws-sdk/client-athena';

const athenaClient: AthenaClient = new AthenaClient({ region: process.env.AWS_ATHENA_REGION });

export const runAthenaQuery = async (query: string): Promise<string> => {
  const startCommand = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: { Database: process.env.AWS_GLUE_DB_NAME },
    ResultConfiguration: { OutputLocation: process.env.AWS_ATHENA_OUTPUT_LOCATION },
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
