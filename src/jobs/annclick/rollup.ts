import { JobType } from '../../api-contract';
import { RollUpBase } from '../base/rollup';
import { queryToGetPrevDateData } from '../common_queries/jobs_queries';
import {  AnalyticsAnnClickEntity, Job, JobInfo, TableName } from '../../types';
import { updateAnnTourTypeToDaily } from './queries';
import { getYmd } from '../../utils';


export const rollupCurrentToDailyForAnnClickData = async () => {
  const rollupAnnClick = new RollupAnnClickJob();
  await rollupAnnClick.executeRollupJob();
};

export class RollupAnnClickJob extends RollUpBase<AnalyticsAnnClickEntity> {
 
  protected getJobType(): JobType {
    return JobType.ROLLUP_ANN_CLICK_CURRENT_TO_DAILY;
  }

  protected async updateToDaily (annClickData: AnalyticsAnnClickEntity, updatedAt: string): Promise<void> {
    await updateAnnTourTypeToDaily(annClickData, updatedAt);
  }

  protected async getPrevDataFromDbForAperiod(lastSuccessYmd: string, currentYmd: string): Promise<AnalyticsAnnClickEntity[]> {
    return await queryToGetPrevDateData(lastSuccessYmd, currentYmd, TableName.AnalyticTourAnnClicks);
  }

}