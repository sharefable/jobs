import { JobProcessingStatus, JobType } from 'api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface DateAndHour {
  date: string;
  hour: string;
}

export interface SqlQueryValues {
  jobType: JobType;
  jobKey: string;
  processing_status: JobProcessingStatus;
  jobInfo?: DateAndHour;
  failureReason?: string | null;
}

export interface AnalyticTourMetrics{
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  views_all: number;
  views_unique?: number;
}

export interface AthenaQueryEntity{
  ymd: number;
  h: number;
  payload_tour_id: number;
  views_all: any;
  views_unique: number;
}

export interface AnalyticTourMetricsViews{
  sum_views_all: number;
  sum_views_unique: number;
}

export interface TourCount{
  tour_count: number;
}

export const enum EntityDurationType{
  DAILY = 'DAILY',
  CURRENT = 'CURRENT',
  LIFETIME ='LIFETIME',
}
