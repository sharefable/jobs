import { JobProcessingStatus } from './api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface JobInfo {
  jobRunTime: string;
  jobDataScanningTime: string;
  queryExecutionId?: string;
}

export interface Job {
  job_type: number;
  job_key: string;
  processing_status: JobProcessingStatus;
  info: string;
  failure_reason?: string | null;
}

export interface AnalyticMetricsEntity{
  updated_at: string;
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  views_all: any;
  views_unique: any;
}

export interface AnalyticConversionEntity{
  updated_at: string;
  date_ymd: number;
  entry_duration_type: string;
  tour_id: number;
  btn_id: string;
  clicks: string;
}

export interface AnalyticsUserAidMappingEntity {
  email: string;
  aid: string;
  tour_id: number;
  date_ymd: number;
}

export interface AthenaTourLeadEntity {
  aid: string;
  sid: string;
  payload_tour_id: string;
  payload_ann_id: string;
  uts: string;
}

export interface AnalyticsAidSidMappingEntity {
  sid: string;
  aid: string;
}

export interface AthenaCommon{
  ymd: string;
  payload_tour_id: number;
}

export interface AthenaMetricsEntity extends AthenaCommon{
  views_all: string;
  views_unique: string;
}

export interface AthenaConversionEntity extends AthenaCommon{
  payload_btn_id: string;
  clicks: string;
}

export interface AthenaAnnClickEntity extends AthenaCommon {
  payload_ann_id: string;
  views_unique: string;
  views_all: string;
  time_spent_dist: string;
}

export interface AthenaUserAidMappingEntity {
  payload_user_email: string;
  payload_tour_id: number
  aid: string;
}

export interface AthenaAidSidMappingEntity {
  sid: string;
  aid: string;
}

export enum TableName {
  AnalyticsTourMetrics='analytics_tour_metrics',
  AnalyticsConversion='analytics_conversion',
  AnalyticTourAnnClicks='analytics_tour_ann_clicks',
  AnalyticsUserAidMapping='analytics_user_aid_mapping',
  AnalyticsAidSidMapping='analytics_aid_sid_mapping',
  Tour='tour'
}

export interface AthenaEntityForViewAnnTourClick extends AthenaCommon {
  payload_ann_id: number;
  views_unique: number;
  views_all: number;
}

export interface AnalyticsAnnClickEntity {
  updated_at: string;
  date_ymd: number;
  ann_id: number;
  tour_id: number;
  views_unique: number;
  views_all: number;
  time_spent_dist: string;
}

export interface Demo {
  rid: string;
  display_name: string;
  created_by: number;
  belongs_to_org: number;
}

export interface GroupedData {
  [key: string]: AthenaTourLeadEntity[];
}
