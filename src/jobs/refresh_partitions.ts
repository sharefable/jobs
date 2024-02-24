import { 
  CrawlerState,
  GetCrawlerCommand, 
  GetCrawlerCommandOutput, 
  GlueClient, 
  StartCrawlerCommand, 
  StartCrawlerCommandOutput,
} from '@aws-sdk/client-glue';
import { JobBase } from './base/job';
import { JobType } from '../api-contract';
import * as Sentry from '@sentry/node';
import * as log from '../log';

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
        await this.waitForCrawlerReady(glueClient);
        await success();
        return true;
      } else {
        await failure(`Httpstatuscode exception while running the crawler ${glueResult.$metadata.httpStatusCode}`);
        Sentry.captureException(
          `Httpstatuscode exception while running the crawler ${glueResult.$metadata.httpStatusCode}`);
        return false;
      }
    } catch (error) {
      await failure((error as Error).message);
      Sentry.captureException(error as Error);
      return false;
    }
  }

  private async waitForCrawlerReady (glueClient: GlueClient) {
    let crawlerState: CrawlerState | string | undefined;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getCommand = new GetCrawlerCommand({ Name: process.env.AWS_GLUE_CRAWLER_NAME });
      const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
      if (getResult.$metadata.httpStatusCode !== 200) {
        throw new Error(`Httpstatuscode exception while running the crawler ${getResult.$metadata.httpStatusCode}`);
      }
      crawlerState = getResult.Crawler!.State;
      log.info(`Crawler state: ${crawlerState}`);
    } while (crawlerState !== CrawlerState.READY);
  }
}