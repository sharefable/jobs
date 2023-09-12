import {init, captureCheckIn} from '@sentry/node';

const DSN_KEY_JOBS = 'https://b60b8299d85ce00707286d674174523d@o4505113177620480.ingest.sentry.io/4505718715383808';

export const sentryInitialize = () => {
  init({
    dsn: DSN_KEY_JOBS,
    environment: process.env.APP_ENV,
    tracesSampleRate: 1.0,
  });
};

export const sentrySuccess = (checkInId: string, jobName: string) => {
  captureCheckIn({
    checkInId,
    monitorSlug: jobName,
    status: 'ok',
  });
};

export const sentryProgress = (jobName: string) => {
  const checkInId = captureCheckIn({
    monitorSlug: jobName,
    status: 'in_progress',
  });
  return checkInId;
};