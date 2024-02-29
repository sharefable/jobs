import { 
  CrawlerState,
  GetCrawlerCommand, 
  GetCrawlerCommandOutput, 
  GlueClient, 
  StartCrawlerCommand, 
  StartCrawlerCommandOutput,
} from '@aws-sdk/client-glue';
import { JobBase } from './base/job';
import * as Sentry from '@sentry/node';
import * as log from '../log';
import { JobType } from 'api-contract';

export const refreshPartitionForAnnBtnClick = async (): Promise<boolean> => {
  const crawlerJob = new RefreshPartitionAnnBtnClicked();
  return crawlerJob.runCrawler(process.env.AWS_GLUE_CRAWLER_NAME!);
};

export const refreshPartitionForUserAssign = async (): Promise<boolean> => {
  const crawlerJob = new RefreshPartitionUserAssign();
  return crawlerJob.runCrawler(process.env.AWS_GLUE_USER_ASSIGN_CRAWLER_NAME!);
};

abstract class RefreshPartitionBase extends JobBase {

  public async runCrawler (crawlerName: string) {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      const glueClient: GlueClient = new GlueClient({ region: process.env.AWS_GLUE_REGION });
      const command: StartCrawlerCommand = new StartCrawlerCommand({ Name: crawlerName});
      const glueResult: StartCrawlerCommandOutput = await glueClient.send(command);
      if(glueResult.$metadata.httpStatusCode === 200) {
        await this.waitForCrawlerReady(glueClient, crawlerName);
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

  private async waitForCrawlerReady (glueClient: GlueClient, crawlerName: string) {
    let crawlerState: CrawlerState | string | undefined;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getCommand = new GetCrawlerCommand({ Name: crawlerName });
      const getResult: GetCrawlerCommandOutput = await glueClient.send(getCommand);
      if (getResult.$metadata.httpStatusCode !== 200) {
        throw new Error(`Httpstatuscode exception while running the crawler ${getResult.$metadata.httpStatusCode}`);
      }
      crawlerState = getResult.Crawler!.State;
      log.info(`Crawler state: ${crawlerState}`);
    } while (crawlerState !== CrawlerState.READY);
  }
}

class RefreshPartitionAnnBtnClicked extends RefreshPartitionBase {

  protected getJobType(): JobType {
    return JobType.REFRESH_CRAWLER;
  }
}

class RefreshPartitionUserAssign extends RefreshPartitionBase {
  
  protected getJobType(): JobType {
    return JobType.REFRESH_CRAWLER_FOR_ANN_USER_ASSIGN;
  }
}