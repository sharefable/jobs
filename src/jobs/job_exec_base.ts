import { randomUUID } from "crypto";
import { createJob, getLastSuccessData, updateJob } from "../api";
import { AnalyticsJob, AnalyticsJobType, ProcessingStatus, ReqNewAnalyticsJob, ReqUpdateAnalyticsJob } from "../api-contract";
import { stringToDate } from "../utils";
import { client } from "../pg-db";

export class JobExecBase {
    private lastRun: AnalyticsJob | null;

    constructor() {
        this.lastRun = null;
    }

    public async getLastSucessFullJob(jobType: AnalyticsJobType): Promise<void> {
        this.lastRun = await getLastSuccessData(jobType);
        // if (this.lastRun.jobStatus === ProcessingStatus.InProgress) {
        //     // sqsQueue with delay 30 mins
        // }
    }



    public async updateJob(jobId: number, status: ProcessingStatus, jobData?: any): Promise<void> {
        const req: ReqUpdateAnalyticsJob =  {
            jobStatus: status,
            jobData
        }
        await updateJob(req, jobId);
    }

    public async createJob(job: JobExecBase, jobType: AnalyticsJobType): Promise<AnalyticsJob> {
        let req: ReqNewAnalyticsJob;
        let jobResp: AnalyticsJob;
        if (job.lastRun) {
            req =  {
                jobType: job.lastRun!.jobType,
                jobKey: randomUUID(),
                jobStatus: ProcessingStatus.InProgress,
                lowWatermark: job.lastRun.highWatermark,
                highWatermark: new Date(),
            }
            jobResp = await createJob(req);
        } else {
            req =  {
                jobType: jobType,
                jobKey: randomUUID(),
                jobStatus: ProcessingStatus.InProgress,
                lowWatermark: stringToDate('20230101'),
                highWatermark: new Date(),
            }
            this.lastRun = await createJob(req);
            jobResp = this.lastRun;
        }
        return jobResp;
    }

    public async processQuery(query: string): Promise<any> {
        try {
            const conn = await client.connect();
            const startTime = Date.now();
            const result = await conn.query(query);
            const endTime = Date.now();
            return {result, executionTime: endTime - startTime};
        } catch (e) {
            console.log("eee", e)
        }
    
    }
}