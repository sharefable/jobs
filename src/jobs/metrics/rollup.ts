import { JobType } from '../../api-contract';
import { RollUpBase } from '../base/rollup';
import { queryToGetPrevDateData } from '../common_queries/jobs_queries';
import { AnalyticMetricsEntity, TableName } from '../../types';
import { updateMetricsTypeToDaily } from './queries';

export const rollupCurrentToDailyForMetricsData = async () => {
  const rollupMetrics = new RollupMetricsJob();
  await rollupMetrics.executeRollupJob();
};

  
export class RollupMetricsJob extends RollUpBase<AnalyticMetricsEntity> {

  protected getJobType(): JobType {
    return JobType.ROLLUP_METRICS_CURRENT_TO_DAILY;
  }
  
  protected async updateToDaily (annClickData: AnalyticMetricsEntity, updatedAt: string): Promise<void> {
    await updateMetricsTypeToDaily(annClickData, updatedAt);
  }

  protected async getPrevDataFromDbForAperiod(lastSuccessYmd: string, currentYmd: string): Promise<AnalyticMetricsEntity[]> {
    return await queryToGetPrevDateData(lastSuccessYmd, currentYmd, TableName.AnalyticsTourMetrics);
  }
}