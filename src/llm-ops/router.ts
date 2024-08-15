import {TRIGGER_LLM_JOB} from '../types';
import JobOps from './job_ops';

export async function routeLlmOps(msg: TRIGGER_LLM_JOB)  {
  const jobId = msg.data.job.id;

  const jobOps = await JobOps.from(jobId);

  let i = 0;
  setInterval(() => {
    console.log('>>>job', JSON.stringify(jobOps.getJob().info, null, 2));
    jobOps.updateProgress({
      totalBatch: 1000,
      currentBatch: ++i,
      percentageComplete: i / 1000 * 100,
    });
  }, 8000);
}
