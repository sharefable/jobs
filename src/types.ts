import { JobProcessingStatus, JobType } from 'api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface DateAndHour {
  date: string;
  hour: string;
}

export interface SqlQueryValues {
  jobType: JobType;
  jobKey?: string;
  processing_status: JobProcessingStatus;
  jobInfo?: DateAndHour;
  failureReason?: string | null;
}
