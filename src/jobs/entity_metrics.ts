import { AnalyticsJob, AnalyticsJobType, ProcessingStatus } from "../api-contract";
import { JobExecBase } from "./job_exec_base";

export async function executeMetricsRefresh(job: JobExecBase) {
    const createdJob: AnalyticsJob = await job.createJob(job, AnalyticsJobType.REFRESH_ENTITY_METRICS_MATERIALIZED_VIEW);
    try {
        const query = 'REFRESH MATERIALIZED VIEW al.entity_metrics;';
        const queryResult = await job.processQuery(query);
        await job.updateJob(createdJob.id, ProcessingStatus.Successful, {executionTime: queryResult.executionTime});
    } catch (err) {
      console.error('Something went wrong with #executeMetricsRefresh', err);
      await job.updateJob(createdJob.id, ProcessingStatus.Failed);
    }
}