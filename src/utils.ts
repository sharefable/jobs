import * as log from './log';

export function deepcopy<T>(obj:T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const S_TIMEOUT = Symbol('TIMEOUT');
export const sleep = (ms: number): Promise<unknown> => new Promise(done => setTimeout(() => done(S_TIMEOUT), ms));

export const withRetry = async <T extends (...args: any) => any>(
  fn: T,
  maxRetry: number,
  retryIntervalMs = 3000,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
): Promise<ReturnType<typeof fn>> => {
  let i = 0;
  while (++i) {
    try {
      log.info('Running with retry', `${i}/${maxRetry}`);
      const op = await fn();
      return op;
    } catch(e) {
      log.err((e as Error).stack);
      if (i >= maxRetry) throw e;
      await sleep(retryIntervalMs);
    }
  }
};

export function getS3FileLocationFromURI(path: string) {
  const url = new URL(path);
  const host = url.hostname;
  const hostArr = host.split('.');
  // fable-tour-app-gamma.s3.ap-south-1.amazonaws.com
  const bucketName = hostArr.slice(0, hostArr.length - 4).join('.');
  const pathname = url.pathname.substring(1); // remove leading / as the path name /home.acme.com
  const pathArr = pathname.split('/');
  const dir = pathArr.slice(0, pathArr.length - 1).join('/');
  const fileName = pathArr.at(-1);

  return {
    bucketName: bucketName,
    dir,
    fullFilePath: pathname,
    fileName,
  };
}