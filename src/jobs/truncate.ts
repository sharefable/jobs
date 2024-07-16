import { AnalyticsJob, AnalyticsJobType, ProcessingStatus } from "../api-contract";
import { JobExecBase } from "./job_exec_base";

export async function executeTruncateRefresh(job: JobExecBase) {

    const createdJob: AnalyticsJob = await job.createJob(job, AnalyticsJobType.ACTIVITY_DT_DATA_TRUNCATE);
    try {     
        const query = `SELECT remove_duplicates_activity_dt(${createdJob.lowWatermark}, ${createdJob.highWatermark})`;
        const queryResult = await job.processQuery(query);
        const result = queryResult.rows[0].remove_duplicates_activity_dt;
        await job.updateJob(createdJob.id, ProcessingStatus.Successful, {queryResult: result, executionTime: queryResult.executionTime});
   } catch (err) {
    console.error('Something went wrong with #executeTruncateRefresh', err);
    await job.updateJob(createdJob.id, ProcessingStatus.Failed);
   }
}