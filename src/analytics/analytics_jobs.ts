import { ProcessingStatus } from 'api-contract';
import { clientAnalytics } from '../db';
import JobOps from './job_ops';

async function runQuery(query: string): Promise<any> {
  let conn;
  try {
    conn = await clientAnalytics.connect();
    try {
      const startTime = Date.now();
      const result = await conn.query(query);
      const endTime = Date.now();
      return { result, executionTimeInSecond: Math.ceil((endTime - startTime) / 1000) };
    } catch (e) {
      // this is added so that the upstream reporting can handle the
      // query logging
      (e as any).query = query;
      throw e;
    }
  } finally {
    if (conn) conn.release();
  }
}

async function runCommonJob(query: string, job: JobOps) {
  const queryResult = await runQuery(query);
  await job.markJobAs(ProcessingStatus.Successful, undefined, {
    executionTime: queryResult.executionTimeInSecond,
    result: (queryResult.result.row || [])[0],
    query: query,
  });
}

export async function refreshEntityMetricsMaterializedView(job: JobOps) {
  return runCommonJob('REFRESH MATERIALIZED VIEW al.entity_metrics;', job);
}

export async function calculateEntitySubEntityMetrics(job: JobOps) {
  const currentJob = job.getJob();
  const query = `
    SELECT al.update_entity_subentity_metrics('${currentJob.lowWatermark}', '${currentJob.highWatermark}');
  `;
  return runCommonJob(query, job);
}

export async function executeHouseLeadRefresh(job: JobOps) {
  const currentJob = job.getJob();
  const query = `
    SELECT al.update_house_lead('${currentJob.lowWatermark}', '${currentJob.highWatermark}');
  `;
  return runCommonJob(query, job);
}

export async function executeHouseLeadMetricsRefresh(job: JobOps) {
  const currentJob = job.getJob();
  const query = `
    SELECT al.update_house_lead_metrics('${currentJob.lowWatermark}', '${currentJob.highWatermark}')
  `;
  return runCommonJob(query, job);
}

export async function truncateActivityDtData(job: JobOps) {
  const currentJob = job.getJob();
  const query = `
    SELECT al.remove_duplicates_activity_dt('${currentJob.lowWatermark}', '${currentJob.highWatermark}')
  `;
  return runCommonJob(query, job);
}
