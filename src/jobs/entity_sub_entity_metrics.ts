import { AnalyticsJob, AnalyticsJobType, ProcessingStatus } from "../api-contract";
import { JobExecBase } from "./job_exec_base";

export async function executeSubEntityMetricsRefresh(job: JobExecBase) {
    const createdJob: AnalyticsJob = await job.createJob(job, AnalyticsJobType.CALCULATE_ENTITY_SUB_ENTITY_METRICS);
    try {
        console.log('createdJob', createdJob)
        const lowWatermark = new Date(createdJob.lowWatermark).toISOString().replace('T', ' ').replace('Z', '').substring(0, 23);
        const highWatermark = new Date(createdJob.highWatermark).toISOString().replace('T', ' ').replace('Z', '').substring(0, 23);
        console.log('lowWatermark', lowWatermark);
        const query = `SELECT update_entity_subentity_metrics(${lowWatermark}, ${highWatermark})`;
        const queryResult = await job.processQuery(query);
        const result = queryResult.rows[0].update_entity_subentity_metrics;
        await job.updateJob(createdJob.id,  ProcessingStatus.Successful, {queryResult: result, executionTime: queryResult.executionTime});
    } catch (err) {
        console.error('Something went wrong with #executeSubEntityMetricsRefresh', err);
        await job.updateJob(createdJob.id, ProcessingStatus.Failed); 
    }

}
