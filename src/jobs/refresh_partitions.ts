import { GetCrawlerCommand, 
  GetCrawlerCommandOutput, 
  GlueClient, 
  StartCrawlerCommand, 
  StartCrawlerCommandOutput } from '@aws-sdk/client-glue';
import { JobType } from 'api-contract';
import { JobBase } from './base';

export const refreshCrawler = async (): Promise<boolean> => {
  const crawlerJob = new RunCrawlerJob(JobType.REFRESH_CRAWLER);
  return crawlerJob.runCrawler();
};

class RunCrawlerJob extends JobBase {

  public async runCrawler () {
    const markAsInProgress = await this.createJob(this.jobType);
    const [success, failure] = await markAsInProgress('');
    try {
      const glueClient: GlueClient = new GlueClient({ region: process.env.AWS_GLUE_REGION });
      const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const glueResult: StartCrawlerCommandOutput = await glueClient.send(command);
      if(glueResult.$metadata.httpStatusCode === 200) {
        await this.getCrawlerStatus(glueClient);
        await success('Crawler Job Successful');
        return true;
      } else {
        await failure('Something wrong happend when running the crawler');
        // TODO: raise an error in sentry 
        return false;
      }
    } catch (error: any) {
      await failure(error.message);
      return false;
      // TODO: raise an error in sentry 
    }
  }

  protected async getCrawlerStatus (glueClient: GlueClient) {
    let crawlerStatus;
    try {
      while (crawlerStatus !== 'READY') {
        if (crawlerStatus === 'FAILED' || crawlerStatus === 'ERROR' || crawlerStatus === 'TIMEOUT') {
          throw new Error(`crawlerStatus ${crawlerStatus}`);
        } 
        await new Promise(resolve => setTimeout(resolve, 5000));
        const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
        const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
        crawlerStatus = getResult.Crawler?.State;
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}