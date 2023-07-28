import { JobProcessingStatus, JobType } from 'api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface JobTimestampInfo {
  currentRunAt: string;
  lastSuccessfulRunAt: string;
}

export interface Count{
  count: number;
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
  views_unique: number;
}

export interface AnalyticTourConversion{
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  btn_id: string;
  clicks: string;
}

export type GenericAthenaResultType = AthenaQueryEntityForConversion | AthenaQueryEntityForMetrics | AthenaEntityForAnnTourClick;

export interface AthenaQueryCommon{
  ymd: string;
  payload_tour_id: number;
}

export interface AthenaQueryEntityForMetrics extends AthenaQueryCommon{
  views_all: string;
  views_unique: string;
}

export interface AthenaQueryEntityForConversion extends AthenaQueryCommon{
  payload_btn_id: string;
  clicks: string;
}

export interface AthenaEntityForAnnTourClick extends AthenaQueryCommon {
  payload_ann_id: string;
  views_unique: string;
  views_all: string;
  time_spent_dist: string;
}

export interface AnalyticViews{
  sum_views_all: number;
  sum_views_unique: number;
}

export interface AnalyticTourConversionClicks{
  total_clicks: number;
}

export interface AggregatedViewsAndDate{
  aggregatedViews: AnalyticViews;
  nientyDaysBeforeDate: number;
}

export interface AggregatedValues extends AggregatedViewsAndDate{
  avg_time_spent: string;
}

export interface AggregatedClicksAndDate{
  aggregatedClicks: AnalyticTourConversionClicks;
  nientyDaysBeforeDate: number;
}

export interface RespectiveQuery{
  query: string;
  tableName: TableName;
}

export enum TableName{
  AnalyticsTourMetrics='analytics_tour_metrics',
  AnalyticsConversion='analytics_conversion',
  AnalyticTourAnnClicks='analytics_tour_ann_clicks',
}

export interface AthenaEntityForViewAnnTourClick extends AthenaQueryCommon{
  payload_ann_id: number;
  views_unique: number;
  views_all: number;
}

export interface AnalyticsEntityForAnnTourClick{
  date_ymd: number;
  ann_id: number;
  tour_id: number;
  views_unique: number;
  views_all: number;
  time_spent_dist: string;
  
}
