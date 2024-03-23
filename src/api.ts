import { ApiResp, ReqListLead360, RespHouseLeadInfo, RespTour } from './api-contract';
import * as log from './log';

export async function getHouseLeadInfo (orgId: number, email: string): Promise<RespHouseLeadInfo | null> {
  const data: RespHouseLeadInfo = await req(`/hldinf?org_id=${orgId}&email=${email}`, 'GET') as RespHouseLeadInfo;
  if (data && data.id) return data;
  else return null;
}

export async function getTourAssetPath (tourId: number): Promise<string> {
  const data = await req(`/trasstpath?id=${tourId}`, 'GET') as string;
  return data;
}

export async function saveLead360 (body: ReqListLead360): Promise<void> {
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

export async function getTourDataFile(url: string): Promise<any>{
  const data =  await fetch(url, {
    method: 'GET',
  });
  return await data.json();
}