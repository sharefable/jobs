import { Job } from '../../types';
import { sqlQueryToSelectLastSuccessData } from '../common_queries/jobs_queries';
import { JobBase } from './job';

export abstract class CommonAthenaBase extends JobBase {
  
  protected abstract getAthenaQuery (): Promise<string>;
  
  protected async getJobSuccessData (): Promise<any> {
    const jobData: Job[] = await sqlQueryToSelectLastSuccessData(this.getJobType());
    return jobData.length !== 0 ?  JSON.parse(jobData.at(0)!.info) : null;
  }
}