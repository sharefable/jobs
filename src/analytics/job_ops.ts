import {
  AnalyticsJob,
  AnalyticsJobType,
  ProcessingStatus,
  ReqNewAnalyticsJob,
  ReqUpdateAnalyticsJob,
} from '../api-contract';
import { req } from '../api';
import { v4 as uuidv4 } from 'uuid';
import { withRetry } from '../utils';

function getISODate(d: Date): Date {
  return d.toISOString() as unknown as Date;
}

export default class JobOps {
  private job: AnalyticsJob;

  constructor(job: AnalyticsJob) {
    this.job = job;
  }

  getJob() {
    return this.job;
  }

  async markJobAs(status: ProcessingStatus, err?: string, data?: Record<string, any>) {
    this.job.jobStatus = status;
    const job = await withRetry(() =>
      req<ReqUpdateAnalyticsJob, AnalyticsJob>(`/fat/a/job/${this.job.id}`, 'POST', {
        jobStatus: status,
        jobData: data,
        failureReason: err,
      }), 3, 5000);
    this.job = job;
  }

  public static async for(jobType: AnalyticsJobType) {
    const lastSuccessfulJob = await req<undefined, AnalyticsJob | null>(`/fat/a/job/last_success/${jobType}`);
    if (lastSuccessfulJob) {
      const job = await req<ReqNewAnalyticsJob, AnalyticsJob>('/fat/a/job', 'POST', {
        jobType,
        jobKey: uuidv4(),
        jobStatus: ProcessingStatus.InProgress,
        lowWatermark: lastSuccessfulJob.highWatermark,
        highWatermark: getISODate(new Date()),
      });
      return new JobOps(job);
    }

    const job = await req<ReqNewAnalyticsJob, AnalyticsJob>('/fat/a/job', 'POST', {
      jobType,
      jobKey: uuidv4(),
      jobStatus: ProcessingStatus.InProgress,
      // We start data processing from here, in case this is the first job
      lowWatermark: getISODate(new Date(2023, 0, 1, 0, 0, 0, 0)),
      highWatermark: getISODate(new Date()),
    });
    return new JobOps(job);
  }
}
