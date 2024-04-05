import {ForObjectType, LogType, ReqNewLog, RespTour} from 'api-contract';
import {addToApplicationLog, getTenantIntegration, getTourById} from '../api';
import RetryableErr from '../retryable-err';
import Handlebars from 'handlebars';

interface ReqNewLogForWebhook extends ReqNewLog {
  logLine: {
    status: 'success' | 'failed';
    httpStatus?: number;
    isRetry: boolean;
    reason: string;
    payload?: Record<string, any>;
    body?: string;
    headers?: string;
    respTxt?:string;
  }
}

export default async function runIntegration(event?: string | null, payload?: string | null, id?: string | null, retrying?: boolean) {
  if (id === null || id === undefined || id === '') {
    throw new RetryableErr('integrationId is empty', false);
  }

  const iid = +id;
  if (!Number.isFinite(iid)) {
    throw new RetryableErr(`integrationId is not valid. Received ${id}`, false);
  }

  const fatResp = await getTenantIntegration(iid);
    
  if (!(fatResp.org && fatResp.platformIntegration && fatResp.tenantIntegration)) {
    console.error('Data fetch error iid', iid, fatResp);
    throw new RetryableErr('Can\'t get TenantIntegration data from server', false);
  }
  

  const commonLogParams: Omit<ReqNewLogForWebhook, 'logLine'> = {
    orgId: fatResp.org.id,
    logType: LogType.WEBHOOK_EXEC,
    forObjectType: ForObjectType.TENANT_INTEGRATION,
    forObjectId: iid,
  };

  let eventPayload: Record<string, string | number | boolean>;
  try {
    eventPayload = JSON.parse(payload || '');
  } catch (e) {
    await addToApplicationLog({
      ...commonLogParams,
      logLine: {
        isRetry: retrying,
        status: 'failed',
        reason: 'Payload is not valid',
        payload: payload,
      },
    });
    console.log((e as Error).stack);
    throw new RetryableErr(`Can't parse event payload with error ${(e as Error).message}`, false);
  }

  if (event === 'CREATE_OR_UPDATE_CONTACT') {
    const tourIdRaw = eventPayload.ti;
    const tour = await getTourById(tourIdRaw as string);

    if (!tour) {
      console.error('Demo does not exist for id', tourIdRaw);
      await addToApplicationLog({
        ...commonLogParams,
        logLine: {
          isRetry: retrying,
          status: 'failed',
          reason: 'Can\'t find demo',
          payload: eventPayload,
        },
      });
      throw new RetryableErr(`Can't find demo ${tourIdRaw}`, false);
    }

    let webhookBody: Record<string, any>;
    try {
      webhookBody = JSON.parse(fatResp.tenantIntegration.tenantConfig.reqBody);
    } catch (e) {
      const rawBody = fatResp.tenantIntegration.tenantConfig.reqBody;
      console.error('Webhook body can\'t be parsed', rawBody);
      console.error((e as Error).stack);
      await addToApplicationLog({
        ...commonLogParams,
        logLine: {
          isRetry: retrying,
          status: 'failed',
          reason: `Can't parse webhook body becuase ${(e as Error).message}`,
          payload: eventPayload,
          body: rawBody,
        },
      });
      throw new RetryableErr(`Can't parse webhook body ${(e as Error).message}`, false);
    }

    let webhookHeaders: Record<string, any>;
    try {
      webhookHeaders = JSON.parse(fatResp.tenantIntegration.tenantConfig.reqHeaders);
    } catch (e) {
      const rawHeaders = fatResp.tenantIntegration.tenantConfig.reqHeaders;
      console.error('Webhook headers can\'t be parsed', rawHeaders);
      console.error((e as Error).stack);
      await addToApplicationLog({
        ...commonLogParams,
        logLine: {
          isRetry: retrying,
          status: 'failed',
          reason: `Can't parse webhook headers because ${(e as Error).message}`,
          payload: eventPayload,
          body: webhookBody,
          headers: rawHeaders,
        },
      });
      throw new RetryableErr(`Can't parse webhook headers ${(e as Error).message}`, false);
    }

    let resp: Response;
    let bodyStr;
    try {
      const template = Handlebars.compile(JSON.stringify(webhookBody));
      bodyStr = template({
        ...eventPayload,
        demo_rid: tour.rid,
      });

      resp = await fetch(fatResp.tenantIntegration.tenantConfig.url, {
        method: 'POST',
        headers: webhookHeaders,
        body: bodyStr,
      });
    } catch (e) {
      await addToApplicationLog({
        ...commonLogParams,
        logLine: {
          isRetry: retrying,
          status: 'failed',
          reason: `Error from endpoint. Error: ${(e as Error).message}`,
          payload: eventPayload,
          body: bodyStr,
          headers: webhookHeaders,
        },
      });
      console.error((e as Error).stack);
      throw new RetryableErr(`Error from endpoint. Message: ${(e as Error).message}`, true);
    }

    if (resp.status >= 500) {
      await addToApplicationLog({
        ...commonLogParams,
        logLine: {
          isRetry: retrying,
          status: 'failed',
          reason: `Error from endpoint. Status ${resp.status}`,
          httpStatus: resp.status,
          payload: eventPayload,
          body: bodyStr,
          headers: webhookHeaders,
          respTxt: await resp.text(),
        },
      });
      throw new RetryableErr(`Error from endpoint. Status ${resp.status}.`, true);
    } else if (resp.status >= 400) {
      await addToApplicationLog({
        ...commonLogParams,
        logLine: {
          isRetry: retrying,
          status: 'failed',
          reason: `Error from endpoint. Status ${resp.status}`,
          httpStatus: resp.status,
          payload: eventPayload,
          body: bodyStr,
          headers: webhookHeaders,
          respTxt: await resp.text(),
        },
      });
      throw new RetryableErr(`Error from endpoint. Status ${resp.status}.`, false);
    }

    await addToApplicationLog({
      ...commonLogParams,
      logLine: {
        isRetry: retrying,
        status: 'success',
        payload: eventPayload,
        httpStatus: resp.status,
        body: bodyStr,
        headers: webhookHeaders,
      },
    });

  } else {
    await addToApplicationLog({
      ...commonLogParams,
      logLine: {
        isRetry: retrying,
        status: 'failed',
        reason: `Unknown event handler for event ${event}`,
        payload: eventPayload,
      },
    });
    throw new RetryableErr(`Unknown event handler for event ${event}`, false);
  }
}
