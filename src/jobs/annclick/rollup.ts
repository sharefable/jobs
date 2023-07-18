import { JobType } from '../../api-contract';
import { RollUpBase } from '../base/rollup';
import { queryToGetPrevDateData } from '../common_queries/jobs_queries';
import {  AnalyticsAnnClickEntity, TableName } from '../../types';
import { updateAnnTourTypeToDaily } from './queries';


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

  protected async getPrevDateData (prevYmd: string): Promise<AnalyticsAnnClickEntity[]> {
    const annTourClickData: AnalyticsAnnClickEntity[] = 
    await queryToGetPrevDateData(prevYmd, TableName.AnalyticTourAnnClicks);
    return annTourClickData;
  }
}