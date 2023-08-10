import { JobProcessingStatus } from 'api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface JobTimestampInfo {
  currentRunAt: string;
  currentRanFor: string;
}

export interface Job {
  job_type: number;
  job_key: string;
  processing_status: JobProcessingStatus;
  info: string;
  failure_reason?: string | null;
}

export interface AnalyticTourMetrics{
  updated_at: string;
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  views_all: any;
  views_unique: number;
}

export interface AnalyticTourConversion{
  updated_at: string;
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  btn_id: string;
  clicks: string;
}

export type GenericAthenaResultType = AthenaQueryEntityForConversion | AthenaQueryEntityForMetrics| AthenaEntityForAnnTourClick;

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

export enum TableName {
  AnalyticsTourMetrics='analytics_tour_metrics',
  AnalyticsConversion='analytics_conversion',
  AnalyticTourAnnClicks='analytics_tour_ann_clicks',
}

export interface AthenaEntityForViewAnnTourClick extends AthenaQueryCommon {
  payload_ann_id: number;
  views_unique: number;
  views_all: number;
}

export interface AnalyticsEntityForAnnTourClick {
  updated_at: string;
  date_ymd: number;
  ann_id: number;
  tour_id: number;
  views_unique: number;
  views_all: number;
  time_spent_dist: string;
}
