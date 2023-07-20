import { Connection, MysqlError } from 'mysql';
import { DateAndHour } from 'types';

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

export const getDateAndHour =  (time: number): DateAndHour => {
  const date = new Date(time);
  date.setHours(date.getHours() - 1);
  const utcTime = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  const year = utcTime.getFullYear();
  const month = utcTime.getMonth() + 1;
  const day = utcTime.getDate();
  const hour = utcTime.getHours();
  const formattedDate = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  const formattedHour = `${hour}`;
  const dateAndHour: DateAndHour = { date: formattedDate, hour: formattedHour };
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
  const givenDate = new Date(formattedDate);
  const ninetyDaysBefore = new Date(givenDate);
  ninetyDaysBefore.setDate(givenDate.getDate() - 90);
  const ninetyDaysBeforeStr: number = oldDateFormat (ninetyDaysBefore.toISOString().slice(0, 10));
  return ninetyDaysBeforeStr;
};

const oldDateFormat = (newFormat: string): number => {
  const oldFormat = newFormat.replace(/-/g, '');
  return parseInt(oldFormat);
};

