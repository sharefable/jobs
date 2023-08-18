import { 
  GetCrawlerCommand, 
  GetCrawlerCommandOutput, 
  GlueClient, 
  StartCrawlerCommand, 
  StartCrawlerCommandOutput,
} from '@aws-sdk/client-glue';
import { JobBase } from './base/job';
import { JobType } from '../api-contract';
import * as Sentry from '@sentry/node';

export const refreshPartition = async (): Promise<boolean> => {
  const crawlerJob = new RefreshPartition();
  return crawlerJob.runCrawler();
};

class RefreshPartition extends JobBase {

  protected getJobType(): JobType {
    return JobType.REFRESH_CRAWLER;
  }

  public async runCrawler () {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      const glueClient: GlueClient = new GlueClient({ region: process.env.AWS_GLUE_REGION });
      const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const glueResult: StartCrawlerCommandOutput = await glueClient.send(command);
      if(glueResult.$metadata.httpStatusCode === 200) {
        await this.getCrawlerStatus(glueClient);
        await success();
        return true;
      } else {
        await failure('Something wrong happend when running the crawler');
        // TODO: raise an error in sentry 
        Sentry.captureException('Something wrong happend when running the crawler');
        return false;
      }
    } catch (error: any) {
      await failure(error.message);
      Sentry.captureException(error.message);
      return false;
      // TODO: raise an error in sentry 
    }
  }

  private async getCrawlerStatus (glueClient: GlueClient) {
    let crawlerStatus;
    while (crawlerStatus !== 'READY') {
      if (crawlerStatus === 'FAILED' || crawlerStatus === 'ERROR' || crawlerStatus === 'TIMEOUT') {
        throw new Error(`crawlerStatus ${crawlerStatus}`);
      } 
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
      crawlerStatus = getResult.Crawler?.State;
    }
  }
}