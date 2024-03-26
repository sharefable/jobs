import { TourData } from 'types';
import { ApiResp, ReqHouseLeadInfoWithInfo360, RespHouseLeadInfo, RespTour } from './api-contract';
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


type Resp = RespTour | RespHouseLeadInfo | string;
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
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
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