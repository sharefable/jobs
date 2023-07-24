import { JobProcessingStatus, JobType } from 'api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface JobTimestampInfo {
  currentRunAt: string;
  lastSuccessfulRunAt: string;
}

export interface TourCount{
  tour_count: number;
}

export interface SqlQueryValues {
  jobType: JobType;
  jobKey: string;
  processing_status: JobProcessingStatus;
  jobInfo?: JobTimestampInfo;
  failureReason?: string | null;
}

export interface AnalyticTourMetrics{
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  views_all: any;
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

export interface AggregatedViewsAndDate{
  aggregatedViews: AnalyticTourMetricsViews;
  nientyDaysBeforeDate: number;
}
