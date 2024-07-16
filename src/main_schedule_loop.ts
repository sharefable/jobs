import { executeSubEntityMetricsRefresh } from "./jobs/entity_sub_entity_metrics";
import { AnalyticsJobType } from "./api-contract";
import { executeMetricsRefresh } from "./jobs/entity_metrics";
import { JobExecBase } from "./jobs/job_exec_base";
import { TMsgAttrs } from "./types";
import { executeHouseLeadMetricsRefresh, executeHouseLeadRefresh } from "./jobs/house_lead";
import { executeTruncateRefresh } from "./jobs/truncate";

interface JobSqsData {
    job: AnalyticsJobType;
}

type JobType = JobSqsData & TMsgAttrs;
export async function onReceiveMessageFromSqs(message: TMsgAttrs) {
    const utProps = message as JobType;
    console.log(utProps.job);
    try {
        if (utProps.job === 'REFRESH_ENTITY_METRICS_MATERIALIZED_VIEW') {
            const jobBase: JobExecBase = await createJobAndGetLastSucessFullJob(AnalyticsJobType.REFRESH_ENTITY_METRICS_MATERIALIZED_VIEW);
            await executeMetricsRefresh(jobBase)
        } else if (utProps.job === 'CALCULATE_ENTITY_SUB_ENTITY_METRICS') {
            const jobBase: JobExecBase = await createJobAndGetLastSucessFullJob(AnalyticsJobType.CALCULATE_ENTITY_SUB_ENTITY_METRICS);
            await executeSubEntityMetricsRefresh(jobBase)
        } else if (utProps.job === 'UPDATE_HOUSE_LEAD') {
            const jobBase: JobExecBase = await createJobAndGetLastSucessFullJob(AnalyticsJobType.UPDATE_HOUSE_LEAD);
            await executeHouseLeadRefresh(jobBase)
        } else if (utProps.job === 'CALCULATE_HOUSE_LEAD_METRICS') {
            const jobBase: JobExecBase = await createJobAndGetLastSucessFullJob(AnalyticsJobType.CALCULATE_HOUSE_LEAD_METRICS);
            await executeHouseLeadMetricsRefresh(jobBase)
        } else if (utProps.job === 'ACTIVITY_DT_DATA_TRUNCATE') {
            const jobBase: JobExecBase = await createJobAndGetLastSucessFullJob(AnalyticsJobType.ACTIVITY_DT_DATA_TRUNCATE);
            await executeTruncateRefresh(jobBase);
        } else {
            throw new Error('The specified job type is not supported')
        }
    } catch (err) {
        console.log(err);
    }
}

async function createJobAndGetLastSucessFullJob(jobType: AnalyticsJobType): Promise<JobExecBase> {
    const job = new JobExecBase();
    await job.getLastSucessFullJob(jobType);
    return job;
}
