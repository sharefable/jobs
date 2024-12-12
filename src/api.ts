import {
  ApiResp,
  ReqHouseLeadInfoWithInfo360,
  ReqNewLog,
  RespCommonConfig,
  RespFatTenantIntegration,
  RespDemoEntity,
  ReqLockUnlockDemo,
} from './api-contract';
import * as log from './log';

export async function getTourAssetPath (tourId: number): Promise<string> {
  const data = await req<undefined, string>(`/trasstpath?id=${tourId}`, 'GET');
  return data;
}

export async function addOrUpdateLead360 (body: ReqHouseLeadInfoWithInfo360): Promise<void> {
  await req<ReqHouseLeadInfoWithInfo360, undefined>('/poplead', 'POST', body);
}

export async function addToApplicationLog(logLine: ReqNewLog) {
  await req<ReqNewLog, undefined>('/new/log', 'POST', logLine);
}

export async function getTenantIntegration(id: number): Promise<RespFatTenantIntegration> {
  return await req<undefined, RespFatTenantIntegration>(`/fat/tenant_integration/${id}`);
}

export async function getTourById(id: string): Promise<RespDemoEntity> {
  return await req<undefined, RespDemoEntity>(`/tour/by/id/${id}`);
}

export async function getTourByRid(rid: string): Promise<RespDemoEntity> {
  return await req<undefined, RespDemoEntity>(`/tour?rid=${rid}`);
}

export async function republishDemo(rid: string): Promise<void> {
  await req<undefined, RespDemoEntity>(`/repub/entity/rid/${rid}`);
}

export async function lockUnlockAllDemosForOrg(orgId: number, shouldLock: boolean): Promise<string[]> {
  return await req<ReqLockUnlockDemo, string[]>('/lock', 'POST', {
    orgId: orgId,
    shouldLock,
  });
}

export async function getLiveAndPublishedTourAssetsByRid(rid: string): Promise<{
  liveTour: RespDemoEntity,
  publishedTour: RespDemoEntity | undefined,
  gifUrl: string | undefined
}> {
  const cconfig = await req<undefined, RespCommonConfig>('/cconfig') ;
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

export async function req<T, K> (
  urlPath: string,
  method: 'GET' | 'POST' = 'GET',
  payload?: T,
  auth?: string,
): Promise<K> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) headers['Authorization'] = auth;

  const url = `${process.env.API_SERVER_ENDPOINT}/v1${urlPath}`;
  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!(resp.status >= 200 && resp.status < 300)) {
      throw new Error(`Response status exception. Status: ${resp.status}`);
    }
  } catch (e) {
    log.err((e as Error).stack);
    throw new Error( `Error while making request to ${url}. Error: ${(e as Error).message}`);
  }
  const data = (await resp.json()) as ApiResp<K>;
  return data.data as K;
}
