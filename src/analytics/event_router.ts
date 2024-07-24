import { AnalyticsJobType, ProcessingStatus } from '../api-contract';
import JobOps from './job_ops';
import {
  refreshEntityMetricsMaterializedView,
  calculateEntitySubEntityMetrics,
  executeHouseLeadRefresh,
  truncateActivityDtData,
  refreshDailyEntityMetrics,
} from './analytics_jobs';
import * as log  from '../log';
import * as Sentry from '@sentry/node';

interface AnalyticsJobSqsTriggerData {
  type: 'TRIGGER_ANALYTICS_JOB';
  data: {
    job: AnalyticsJobType;
  };
}
export async function routeAnalyticsJob(msg: AnalyticsJobSqsTriggerData) {
  let jobOps;
  try {
    log.info(`Starting analytics job ${JSON.stringify(msg.data, null, 2)}`);
    jobOps = await JobOps.for(msg.data.job);
    switch(msg.data.job) {
      case AnalyticsJobType.REFRESH_ENTITY_METRICS_MATERIALIZED_VIEW:
        await refreshEntityMetricsMaterializedView(jobOps);
        break;
      case AnalyticsJobType.CALCULATE_ENTITY_SUB_ENTITY_METRICS:
        await calculateEntitySubEntityMetrics(jobOps);
        break;
      case AnalyticsJobType.UPDATE_HOUSE_LEAD:
        await executeHouseLeadRefresh(jobOps);
        break;
      case AnalyticsJobType.ACTIVITY_DT_DATA_TRUNCATE:
        await truncateActivityDtData(jobOps);
        break;
      case AnalyticsJobType.REFRESH_DAILY_ENTITY_METRICS:
        await refreshDailyEntityMetrics(jobOps);
        break;
    }
    log.info(`Job finished with data ${JSON.stringify(jobOps.getJob().jobData || {})}`);
  } catch (err) {
    const e = err as Error;
    log.err(`Error while executing a Analytics job. ${e.message}.`);
    Sentry.captureException(e);
    if (jobOps) {
      jobOps.markJobAs(ProcessingStatus.Failed, e.message, {
        stack: e.stack,
        query: (e as any).query,
      });
    }
  }
}
