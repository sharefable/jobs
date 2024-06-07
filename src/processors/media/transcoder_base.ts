import { CreateJobCommand, CreateJobCommandInput, ElasticTranscoderClient, ReadJobCommand } from '@aws-sdk/client-elastic-transcoder';
import * as log from '../../log';
import IrrecoverableErr from '../../irrecoverable_err';
import { TMsgAttrs } from 'types';

export abstract class TranscoderBase<T> {
 
  public async initiateTranscoding(utProps: TMsgAttrs): Promise<T> {
    const awsElasticTranscoder = new ElasticTranscoderClient({region: process.env.ETS_REGION});
    const trancodedMedia = await this.mediaTranscoder(utProps, awsElasticTranscoder);
    return trancodedMedia;
  }
 
  protected abstract mediaTranscoder(utProps: TMsgAttrs, awsElasticTranscoder: ElasticTranscoderClient):Promise<T>;

  protected async trancoderJob(
    jobParams: CreateJobCommandInput,
    awsElasticTranscoder: ElasticTranscoderClient,
  ): Promise<Record<string, string | number>>  {
    const startTime = +new Date();
    let jobDuration = -1;
    let transcoderJobId = '';
    try {
      const createJobCommand = new CreateJobCommand(jobParams);
      const createdJobResponse = await awsElasticTranscoder.send(createJobCommand);
      if (!createdJobResponse?.Job) {
        throw new Error('Job object is undefined after job submission');
      }
      transcoderJobId = createdJobResponse.Job.Id!;

      jobDuration = await new Promise((resolve, reject) => {
        const timer = setInterval( async() => {
          try {
            const duration = ((+new Date() - startTime) / 1000) | 0;
            if (duration > 12 * 60) {
              // If the job does not finish in 12mins, get outta
              clearInterval(timer);
              reject(new Error(`Job ${transcoderJobId} timed out`));
              return;
            }
            const readJobCommand = new ReadJobCommand({ Id: transcoderJobId});
            const readJobResponse = await awsElasticTranscoder.send(readJobCommand);
            if (!readJobResponse?.Job) {
              reject(new Error('Job object is undefined while fetching for status'));
              return;
            }
            const jobStatus = readJobResponse.Job.Status;
            log.info(`Job ${transcoderJobId} status ${jobStatus}`);
            if (jobStatus == 'Complete') {
              clearInterval(timer); 
              resolve(duration);
            } else if (jobStatus === 'Error') {
              clearInterval(timer);
              reject(new Error(`Job ${transcoderJobId} failed`));
            }
          } catch (err) {
            reject(err);
          }
        }, 2000);
      });
      return {jobDuration, transcoderJobId};
    } catch (err) {
      const errMsg = (err as Error).message;
      log.err('[Error from transcoder service] ', errMsg);
      throw new IrrecoverableErr(errMsg);
    }
  }
}