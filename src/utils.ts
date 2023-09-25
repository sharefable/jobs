import { JobInfo } from './types';

export function deepcopy<T>(obj:T): T {
  return JSON.parse(JSON.stringify(obj));
}

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

export const getUTCTimesForJob =  (): JobInfo => {
  const jobStartedAt  = new Date(); 
  const jobRunTime: string = getUtcDateHour(jobStartedAt);
  jobStartedAt.setHours(jobStartedAt.getHours() - 1);
  const jobDataScanningTime: string = getUtcDateHour(jobStartedAt);
  const jobTimestampInfo: JobInfo = { jobRunTime: jobRunTime, jobDataScanningTime: jobDataScanningTime};
  return jobTimestampInfo;
};

export const getUtcDateHour= (timestamp: Date): string => {
  const jobUtc = new Date(
    timestamp.getUTCFullYear(),
    timestamp.getUTCMonth(),
    timestamp.getUTCDate(),
    timestamp.getUTCHours(),
    timestamp.getUTCMinutes(),
    timestamp.getUTCSeconds(),
    timestamp.getUTCMilliseconds(),
  );
  const jobUtcYear = jobUtc.getFullYear();
  const jobUtcMonth = jobUtc.getMonth() + 1;
  const jobUtcDate = jobUtc.getDate();
  const jobUtcHour = jobUtc.getHours();
  const jobDateHourInfo = `${jobUtcYear}${jobUtcMonth.toString().padStart(2, '0')}${jobUtcDate.toString().padStart(2, '0')}${jobUtcHour.toString().padStart(2, '0')}`;
  return jobDateHourInfo;
};

export const getCreatedAtAndUpdateAt = (timestamp: string): string => {
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hours = timestamp.slice(8, 10);
  const minutes = '59'; 
  const seconds = '59';
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};


export const getTimeFromUpdatedAt = (updatedAt: string) => {
  const date = new Date(updatedAt);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const sec = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${sec}`;
};

export const getYmd = (dateAndHour: string) => {
  return dateAndHour.substring(0, 8);
};

export const calculateAverage = (arr1: any[], arr2:any[]) => {
  const maxLength = Math.max(arr1.length, arr2.length);
  const sumArr: number[] = new Array(maxLength).fill(0);

  arr1.forEach((value, index) => {
    sumArr[index] += value;
  });

  arr2.forEach((value, index) => {
    sumArr[index] += value;
  });
  const averages = sumArr.map((sum) => Math.round(sum / 2)); 
  return averages;
};