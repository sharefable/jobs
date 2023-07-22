import { JobProcessingInfo, JobProcessingStatus, JobType } from 'api-contract';
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

export const getDateAndHour =  (time: number): JobTimestampInfo => {
  const date = new Date(time);
  const utcTimeOfCrawler = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  const jobRanHour = utcTimeOfCrawler.getHours();
  date.setHours(date.getHours() - 1);
  const utcYear = utcTimeOfCrawler.getFullYear();
  const utcMonth = utcTimeOfCrawler.getMonth() + 1;
  const utcDay = utcTimeOfCrawler.getDate();
  const utcHour = utcTimeOfCrawler.getHours();
  const jobDate = parseInt(`${utcYear}${utcMonth.toString().padStart(2, '0')}${utcDay.toString().padStart(2, '0')}`);
  const jobRanForHour = parseInt(`${utcHour}`);
  const dateAndHour: JobTimestampInfo = { date: jobDate, jobRanForPrevHour: jobRanForHour, actualHour: jobRanHour };
  return dateAndHour;
};

const convertToDateFormat = (unformattedDate: string) => {
  const year = unformattedDate.slice(0, 4);
  const month = unformattedDate.slice(4, 6);
  const day = unformattedDate.slice(6, 8);
  const convertedDateStr = `${year}-${month}-${day}`;
  return convertedDateStr;
};

export const calculateDateNintyDaysBefore = (date: string): number => {
  const formattedDate = convertToDateFormat(date);
  const newDate = new Date(formattedDate);
  const ninetyDaysBefore = new Date(newDate);
  ninetyDaysBefore.setDate(newDate.getDate() - 90);
  const ninetyDaysBeforeStr: number = oldDateFormat (ninetyDaysBefore.toISOString().slice(0, 10));
  return ninetyDaysBeforeStr;
};

const oldDateFormat = (newFormat: string): number => {
  const oldFormat = newFormat.replace(/-/g, '');
  return parseInt(oldFormat);
};

export const generateSqlValues = (jobKey: string, jobTimestampInfo: JobTimestampInfo, processingStatus: JobProcessingStatus, reason: string | null ): SqlQueryValues => {
  const sqlValues: SqlQueryValues = {
    jobKey: jobKey, 
    jobInfo: jobTimestampInfo, 
    jobType: JobType.ATHENA_QUERY,
    processing_status: processingStatus,
    failureReason: null,
  };
  return sqlValues;
};

