import { Job, JobProcessingInfo, JobProcessingStatus, LlmOpsJobInfo, ReqUpdateJob } from '../api-contract';
import { req } from '../api';

export interface Meta {
  totalBatch: number;
  currentBatch: number;
  percentageComplete: number;
}

export default class JobOps {
  private job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  getJob() {
    return this.job;
  }

  async updateProgress(meta: Meta) {
    this.job = await req<ReqUpdateJob, Job>('/fat/job', 'POST', {
      id: this.job.id,
      status: JobProcessingStatus.InProcess,
      failureReason: this.job.failureReason,
      jobInfo: {
        ...this.job.info,
        metaJob: meta,
      } as unknown as LlmOpsJobInfo,
    });
  }

  public static async from(id: number) {
    const job = await req<undefined, Job>(`/fat/job/${id}`);
    return new JobOps(job);
  }
}
