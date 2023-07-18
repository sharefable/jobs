import { getCreatedAtAndUpdateAt, getPreviousDate, getTimeFromUpdatedAt } from '../../utils';
import { JobBase } from './job';
import { captureException } from '@sentry/node';

export abstract class RollUpBase<T extends { updated_at: string }> extends JobBase {
    
  public async executeRollupJob() {
    const markAsInProgress = await this.createJob(this.getJobType());
    const [success, failure] = await markAsInProgress();
    try {
      const prevYmd: string = getPreviousDate(this.baseValues.jobInfo.jobRunTime);
      const annClicks: T[] = await this.getPrevDateData(prevYmd);
      for (const annClick of annClicks) {
        const updatedAt: string = getCreatedAtAndUpdateAt(this.baseValues.jobInfo.jobDataScanningTime);
        const timePortion = getTimeFromUpdatedAt(annClick.updated_at);
        if (timePortion === '23:59:59') {
          await this.updateToDaily(annClick, updatedAt);
        } 
        await success();
      }
    } catch (err: any) {
      await failure(err.message);
      captureException(err);
    }
  }
    
  protected abstract getPrevDateData(prevYmd: string): Promise<T[]>;
      
  protected abstract updateToDaily(queryResult: T, createdAtAndUpdatedAt: string): Promise<void>;
}