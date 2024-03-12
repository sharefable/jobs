import { sqlQueryToSelectLastSuccessData } from '../common_queries/jobs_queries';
import { getCreatedAtAndUpdateAt, getTimeFromUpdatedAt, getYmd } from '../../utils';
import { JobBase } from './job';
import { Job, JobInfo } from '../../types';
import { JobType } from '../../api-contract';

export abstract class RollUpBase<T extends { updated_at: string }> extends JobBase {
    
  public async execute() {
    const annClicks: T[] = await this.getDbDataToUpdate();
    for (const annClick of annClicks) {
      const updatedAt: string = getCreatedAtAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
      const timePortion = getTimeFromUpdatedAt(annClick.updated_at);
       
      if (timePortion === '23:59:59') {
        await this.updateToDaily(annClick, updatedAt);
      } 
    }
  }

  protected async getLastSuccessData (jobType: JobType): Promise<any> {
    let lastSuccessYmd = '20230101';
    const jobData: Job[] = await sqlQueryToSelectLastSuccessData(jobType);
    if (jobData.length !== 0) {
      const jobDataRunTime: JobInfo =  JSON.parse(jobData.at(0)!.info);
      lastSuccessYmd = getYmd(jobDataRunTime.jobRunTime);
    } 
    return lastSuccessYmd;
  }

  protected async getDbDataToUpdate (): Promise<T[]> {
    const lastSuccessYmd = await this.getLastSuccessData(this.getJobType());
    const currentYmd = getYmd(this.baseValues.jobInfo.jobDataScanningTime);
    const analyticsData: T[] = await this.getPrevDataFromDbForAperiod(lastSuccessYmd, currentYmd);
    
    if (lastSuccessYmd === '20230101' && analyticsData.length === 0) {
      this.baseValues.jobInfo.jobRunTime = '2023010100';
    }
    return analyticsData;
  }

  protected abstract getPrevDataFromDbForAperiod(lastSuccessYmd: string, currentYmd: string): Promise<T[]>;
      
  protected abstract updateToDaily(queryResult: T, createdAtAndUpdatedAt: string): Promise<void>;
}