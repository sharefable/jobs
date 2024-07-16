import { AnalyticsJob, AnalyticsJobType, ProcessingStatus } from "../api-contract";
import { JobExecBase } from "./job_exec_base";

export async function executeHouseLeadRefresh(job: JobExecBase) {
    const createdJob: AnalyticsJob = await job.createJob(job, AnalyticsJobType.UPDATE_HOUSE_LEAD);
    try {
        const query = `SELECT update_house_lead(${createdJob.lowWatermark}, ${createdJob.highWatermark})`;
        const queryResult = await job.processQuery(query);
        const result = queryResult.rows[0].update_house_lead;
        await job.updateJob(createdJob.id, ProcessingStatus.Successful, {queryResult: result, executionTime: queryResult.executionTime});
    } catch (err) {
        console.error('Something went wrong with #executeHouseLeadRefresh', err);
        await job.updateJob(createdJob.id, ProcessingStatus.Failed);
    }
}


export async function executeHouseLeadMetricsRefresh(job: JobExecBase) {
    const createdJob: AnalyticsJob = await job.createJob(job, AnalyticsJobType.CALCULATE_HOUSE_LEAD_METRICS);
    try {
        const query = `SELECT update_house_lead_metrics(${createdJob.lowWatermark}, ${createdJob.highWatermark})`;
        const queryResult = await job.processQuery(query);
        const result = queryResult.rows[0].update_house_lead_metrics;
        await job.updateJob(createdJob.id, ProcessingStatus.Successful, {queryResult: result, executionTime: queryResult.executionTime});
    } catch (err) {
        console.error('Something went wrong with #executeHouseLeadRefresh', err);
        await job.updateJob(createdJob.id, ProcessingStatus.Failed);
    }
}
