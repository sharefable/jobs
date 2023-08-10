import { AthenaClient, 
  GetQueryExecutionCommand,
  GetQueryResultsCommand, 
  GetQueryResultsCommandOutput,
  StartQueryExecutionCommand } from '@aws-sdk/client-athena';
import { GenericAthenaResultType, JobTimestampInfo, Job } from '../types';
import { retriveExecutedQueryData } from './refresh_tour_usage_data';
import { getJobTimestampInfo } from '../utils';
import { createJob, sqlQueryToSelectLastSuccessData } from './jobs';
import { JobType } from '../api-contract';
import { randomUUID } from 'crypto';
import { athenaQueryToGetAnnTourClicksData, 
  athenaQueryToGetConversionData, 
  athenaQueryToGetMetricsData } from './athena_queries';
import { executeQueryToFetchData } from './mysql';

const athenaClient: AthenaClient = new AthenaClient({ region: process.env.AWS_ATHENA_REGION });

export const runAthenaQuery = async(query: string): Promise<string> => {
  try {
    const startCommand = new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: { Database: process.env.AWS_GLUE_DB_NAME },
      ResultConfiguration: { OutputLocation: process.env.AWS_ATHENA_OUTPUT_LOCATION },
    });
    const queryExecution = await athenaClient.send(startCommand);
    if (queryExecution.$metadata.httpStatusCode === 200) {
      const queryExecutionId: string = queryExecution.QueryExecutionId as string;
      const getCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
      let queryStatus;
      while (queryStatus !== 'SUCCEEDED') {
        const getResponse = await athenaClient.send(getCommand);
        queryStatus = getResponse.QueryExecution?.Status?.State;
        if (queryStatus === 'FAILED' || queryStatus === 'CANCELLED') {
          throw new Error(queryStatus);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      return queryExecutionId;
    } else {
      throw new Error('No execution Id found, undefined');
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getAthenaResponse = async (jobTypeForAthena: string, jobTypeForSuccesData: string): 
Promise<GenericAthenaResultType[]> => {
  const athenaJobkey = randomUUID();
  const athenaJobStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(athenaJobStartedAt);
  const markAsInProgress = await createJob(jobTypeForAthena, athenaJobkey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const query: string = await getAppropriateAthenaQuery(timestampInfo, jobTypeForSuccesData);
    const queryExecutionId: string = await runAthenaQuery(query);
    const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
    const getQueryResults: GetQueryResultsCommandOutput = await athenaClient.send(getQueryResultsCommand);
    const queryResultArray: GenericAthenaResultType[] = retriveExecutedQueryData(getQueryResults);
    await success(`Athena query for ${jobTypeForSuccesData} table processed`);
    return queryResultArray;
  } catch (err: any) {
    await failure(err.message);
    throw new Error(err.message);
  }
};

const getAppropriateAthenaQuery = async (currentJobTimestampInfo: JobTimestampInfo, 
  jobType: string) : Promise<string> => {
  const querytoFetchLastSuccessJob = sqlQueryToSelectLastSuccessData(jobType);
  const lastSuccessJobData: Job[]= await executeQueryToFetchData(querytoFetchLastSuccessJob);
  try {
    let query;
    if(lastSuccessJobData !== undefined) {
      const timeStampInfo: string = lastSuccessJobData.at(0)?.info as string;
      const lastSuccessJobTimestamp: JobTimestampInfo = JSON.parse(timeStampInfo);
      if (jobType === JobType.REFRESH_TOUR_METRICS) {
        query = athenaQueryToGetMetricsData(lastSuccessJobTimestamp.currentRunAt, 
          currentJobTimestampInfo.currentRanFor);
      } else if (jobType === JobType.REFRESH_TOUR_ANN_CLICK) {
        query = athenaQueryToGetAnnTourClicksData(lastSuccessJobTimestamp.currentRunAt, 
          currentJobTimestampInfo.currentRanFor);     
      } else {
        query = athenaQueryToGetConversionData(lastSuccessJobTimestamp.currentRunAt, 
          currentJobTimestampInfo.currentRanFor);
      }
    }
    return query as string;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
