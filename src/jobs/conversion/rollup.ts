import { JobType } from '../../api-contract';
import { RollUpBase } from '../base/rollup';
import { queryToGetPrevDateData } from '../common_queries/jobs_queries';
import { AnalyticConversionEntity, TableName } from '../../types';
import { updateConversionTypeToDaily } from './queries';

export const rollupCurrentToDailyForConversionData = async () => {
  const rollupConversion = new RollupConversionJob();
  await rollupConversion.executeRollupJob();
};

export class RollupConversionJob extends RollUpBase<AnalyticConversionEntity> {

  protected getJobType(): JobType {
    return JobType.ROLLUP_CONVERSION_CURRENT_TO_DAILY;
  }
 
  protected async updateToDaily (annClickData: AnalyticConversionEntity, updatedAt: string): Promise<void> {
    await updateConversionTypeToDaily(annClickData, updatedAt);
  }

  protected async getPrevDateData (prevYmd: string): Promise<AnalyticConversionEntity[]> {
    return await queryToGetPrevDateData(prevYmd, TableName.AnalyticsConversion);
  }
}