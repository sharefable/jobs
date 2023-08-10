import { GetQueryResultsCommandOutput } from '@aws-sdk/client-athena';
import { GetCrawlerCommand, 
  GetCrawlerCommandOutput, 
  GlueClient, 
  StartCrawlerCommand, 
  StartCrawlerCommandOutput } from '@aws-sdk/client-glue';
import { randomUUID } from 'crypto';
import { getJobTimestampInfo } from '../utils';
import { GenericAthenaResultType,    
  JobTimestampInfo} from '../types';
import { createJob } from './jobs';
import { JobType } from 'api-contract';

export const runCrawler = async (): Promise<boolean> => {
  const crawlerJobkey: string = randomUUID();
  const crawlerJobStartedAt: number = Date.now(); 
  const jobTimestampInfo: JobTimestampInfo = getJobTimestampInfo(crawlerJobStartedAt);
  const markAsInProgress = await createJob(JobType.REFRESH_CRAWLER, crawlerJobkey, jobTimestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const glueClient: GlueClient = new GlueClient({ region: process.env.AWS_GLUE_REGION });
    const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
    const glueResult: StartCrawlerCommandOutput = await glueClient.send(command);
    if(glueResult.$metadata.httpStatusCode === 200) {
      await getCrawlerStatus(glueClient);
      await success('Crawler Job Successfully');
      return true;
    } else {
      await failure('Something wrong happend when running the crawler');
      return false;
    }
  } catch (error: any) {
    await failure(error.message);
    return false;
    // TODO: raise an error in sentry 
  }
};

const getCrawlerStatus = async (glueClient: GlueClient) => {
  let crawlerStatus;
  try {
    while (crawlerStatus !== 'READY') {
      if (crawlerStatus === 'FAILED' || crawlerStatus === 'ERROR' || crawlerStatus === 'TIMEOUT') {
        throw new Error(`crawlerStatus ${crawlerStatus}`);
        // TODO: raise an error in sentry
      } 
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
      crawlerStatus = getResult.Crawler?.State;
    }
  } catch (error: any) {
    throw new Error(error.message);
    // TODO: raise an error in sentry
  }
};

export const retriveExecutedQueryData = (
  queryExecutionResult: GetQueryResultsCommandOutput): GenericAthenaResultType[] => {
  try {
    const columnNames: any = queryExecutionResult.ResultSet?.ResultSetMetadata?.ColumnInfo?.map(column => column.Name);
    const rows: any = queryExecutionResult.ResultSet?.Rows;
    const results: GenericAthenaResultType[]= [];
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