import { JobProcessingStatus, JobType } from 'api-contract';
import { Connection, MysqlError } from 'mysql';
import { JobTimestampInfo, SqlQueryValues } from 'types';

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

export function executeQuery(conn: Connection, query: string) {
  return new Promise((resolve, reject) => {
    !conn.query(query, (err: MysqlError | null, rows: []) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export const getJobTimestampInfo =  (timestamp: number): JobTimestampInfo => {
  const localDate = new Date(timestamp);
  const currentRunAt: string = getUtcTimestamp(localDate);
  localDate.setHours(localDate.getHours() - 1);
  const lastSuccessfulRunAt: string = getUtcTimestamp(localDate);
  const jobTimestampInfo: JobTimestampInfo = { currentRunAt: currentRunAt, lastSuccessfulRunAt: lastSuccessfulRunAt};
  return jobTimestampInfo;
};

const convertToDateFormat = (unformattedDate: string) => {
  const year = unformattedDate.slice(0, 4);
  const month = unformattedDate.slice(4, 6);
  const day = unformattedDate.slice(6, 8);
  const convertedDateStr = `${year}-${month}-${day}`;
  return convertedDateStr;
};

const oldDateFormat = (newFormat: string): number => {
  const oldFormat = newFormat.replace(/-/g, '');
  return parseInt(oldFormat);
};

export const calculateDateNintyDaysBefore = (date: string): number => {
  const hyphenedDate = convertToDateFormat(date);
  const originalDate = new Date(hyphenedDate);
  const ninetyDaysBefore = new Date(originalDate);
  ninetyDaysBefore.setDate(originalDate.getDate() - 90);
  const ninetyDaysBeforeDate: number = oldDateFormat(ninetyDaysBefore.toISOString().slice(0, 10));
  return ninetyDaysBeforeDate;
};

export const generateSqlValues = (jobKey: string, jobTimestampInfo: JobTimestampInfo, processingStatus: JobProcessingStatus, reason: string | null ): SqlQueryValues => {
  const sqlValues: SqlQueryValues = {
    jobKey: jobKey, 
    jobInfo: jobTimestampInfo, 
    jobType: JobType.REFRESH_TOUR_ANALYTICS,
    processing_status: processingStatus,
    failureReason: null,
  };
  return sqlValues;
};

const getUtcTimestamp = (timestamp: Date): string => {
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
  const jobTimeInfo = `${jobUtcYear}${jobUtcMonth.toString().padStart(2, '0')}${jobUtcDate.toString().padStart(2, '0')}${jobUtcHour.toString().padStart(2, '0')}`;
  return jobTimeInfo;
};

export const getYmdFromJobTimestampInfo = (timestamp: string): number => {
  return parseInt(timestamp.substring(0,8));
};
