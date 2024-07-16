import { Job2, TourData } from 'types';
import { AnalyticsJob, AnalyticsJobType, ApiResp, ReqHouseLeadInfoWithInfo360, ReqNewAnalyticsJob, ReqNewLog, ReqUpdateAnalyticsJob, RespCommonConfig, RespFatTenantIntegration, RespHouseLeadInfo, RespDemoEntity } from './api-contract';
import * as log from './log';

export async function getHouseLeadInfo (orgId: number, email: string): Promise<RespHouseLeadInfo | null> {
  const data: RespHouseLeadInfo = await req(`/hldinf?org_id=${orgId}&email=${email}`, 'GET') as RespHouseLeadInfo;
  if (data && Object.keys(data).length > 0) return data;
  else return null;
}

export async function getTourAssetPath (tourId: number): Promise<string> {
  const data = await req(`/trasstpath?id=${tourId}`, 'GET') as string;
  return data;
}

export async function addOrUpdateLead360 (body: ReqHouseLeadInfoWithInfo360): Promise<void> {
  await req('/poplead', 'POST', body);
}

export async function addToApplicationLog(logLine: ReqNewLog) {
  await req('/new/log', 'POST', logLine);
}

export async function getTenantIntegration(id: number): Promise<RespFatTenantIntegration> {
  return await req(`/fat/tenant_integration/${id}`) as RespFatTenantIntegration;
}

export async function getTourById(id: string): Promise<RespDemoEntity> {
  return await req(`/tour/by/id/${id}`) as RespDemoEntity;
}

export async function getTourByRid(rid: string): Promise<RespDemoEntity> {
  return await req(`/tour?rid=${rid}`) as RespDemoEntity;
}

export async function getLiveAndPublishedTourAssetsByRid(rid: string): Promise<{
  liveTour: RespDemoEntity,
  publishedTour: RespDemoEntity | undefined,
  gifUrl: string | undefined
}> {
  const cconfig = await req('/cconfig') as RespCommonConfig;
  const tourPath = `${cconfig.pubTourAssetPath}${rid}/0_d_data.json`;

  const liveTour = await getTourByRid(rid);
  let publishedTourData: ApiResp<RespDemoEntity> | undefined;
  if (liveTour.lastPublishedDate) {
    publishedTourData = (await fetch(tourPath).then(resp => resp.json())) as ApiResp<RespDemoEntity>;
  }

  return {
    liveTour: liveTour,
    publishedTour: publishedTourData && publishedTourData.data,
    gifUrl: publishedTourData && `${cconfig.pubTourAssetPath}${rid}/demo.gif`,
  };
}


type Resp = RespDemoEntity | RespHouseLeadInfo | string | RespFatTenantIntegration | RespCommonConfig | AnalyticsJob;
export async function req (
  urlPath: string,
  method: 'GET' | 'POST' = 'GET',
  payload?: any,
): Promise<Resp> {
  const headers = {
    'Content-Type': 'application/json',
  };


  const url = `${process.env.API_SERVER_ENDPOINT}/v1${urlPath}`;
  let resp;
  let data;
  console.log('payload', payload);
  console.log('url', url);
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    console.log('data', resp);
    data = (await resp.json()) as ApiResp<Resp>;

  } catch (e) {
    log.warn(e);
    throw new Error( 'Can\'t make changes to entity');
  }
  if (!(resp.status >= 200 && resp.status < 300)) {
    throw new Error('Couldn\'t make changes');
  }
  return data.data;
}

export async function getTourDataFile(url: string): Promise<TourData> {
  const data =  await fetch(url, {
    method: 'GET',
  });
  return await data.json() as TourData;
}

export async function uploadLeadactivityToS3(body: any): Promise<void> {
  await req('/updleadanalytics', 'POST', body);
}

type AnalyticsResp = AnalyticsJob | undefined;
export async function analyticsReq (
  urlPath: string,
  method: 'GET' | 'POST' = 'GET',
  payload?: any,
): Promise<AnalyticsResp | null> {
  const headers = {
    'Content-Type': 'application/json',
  };

  const url = `${process.env.API_SERVER_ENDPOINT}/v1${urlPath}`;
  let resp;
  let data =  null;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const contentType = resp.headers.get('Content-Type');;

    if (contentType && contentType.includes('application/json')) {
       data = await resp.json() as AnalyticsResp;
    } 
  } catch (e) {
    log.warn(e);
    throw new Error( 'Can\'t make changes to entity');
  }
  if (!(resp.status >= 200 && resp.status < 300)) {
    throw new Error('Couldn\'t make changes');
  }
  return data;
}

export async function createJob(job: ReqNewAnalyticsJob): Promise<AnalyticsJob> {
  return await analyticsReq('/fat/a/job', 'POST', job) as AnalyticsJob;
}

export async function updateJob(job: ReqUpdateAnalyticsJob, jobId: number): Promise<void> {
  await analyticsReq(`/fat/a/job/${jobId}`, 'POST', job);
}

export async function getLastSuccessData(jobType: AnalyticsJobType): Promise<AnalyticsJob | null> {
  return await analyticsReq(`/fat/a/job/last_success/${jobType}`, 'GET') as AnalyticsJob;
}