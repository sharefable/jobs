import { AnalyticsJobType, JobProcessingStatus, ProcessingStatus, RespScreen, RespDemoEntity, SchemaVersion, TourSettings } from './api-contract';

export type TMsgAttrs = Record<string, string | null | undefined>;

export interface JobInfo {
  highWaterMark?: string;
  lowWaterMark?: string;
  jobRunTime: string;
  jobDataScanningTime: string;
  queryExecutionId?: string;
  userIdMappingRunTime?: string;
}

export interface Job {
  job_type: number;
  job_key: string;
  processing_status: JobProcessingStatus;
  info: string;
  failure_reason?: string | null;
}

export interface Job2 {
  job_type: AnalyticsJobType;
  job_key: string;
  job_status: ProcessingStatus;
  low_watermark: Date;
  high_watermark: Date;
  job_data: string;
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
  primaryKey: string;
  aid: string;
  tour_id: number;
}

export interface AthenaTourLeadEntity {
  aid: string;
  sid: string;
  payload_tour_id: number;
  payload_ann_id: string;
  payload_btn_id: string;
  uts: string;
}

export interface AnalyticsAidSidMappingEntity {
  sid: string;
  aid: string;
}

export interface AthenaCommon {
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
  Tour='tour',
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

export interface Tour {
  rid: string;
  display_name: string;
  created_by: number;
  belongs_to_org: number;
  settings: TourSettings
}

export interface GroupedData {
  [key: string]: AthenaTourLeadEntity[];
}

export interface GroupedAidData {
  [key: string]: AthenaTourLeadEntity[];
}


export interface LeadAccessInfoOfTour {
  [key: string]: any
  ctaClickRate: number;
  demoCompletion: number;
  totalTimeSpent: number;
  demoUniqueViews: number;
  demoTotalViews: number;
  lastActiveAt: number,
  activityUrl: string,
  demoName: string,
  orgId: number
}

export enum CobaltEvents {
  REFRESH_CONTACT_PROPERTIES='REFRESH_CONTACT_PROPERTIES',
  ACTIVITY_ON_DEMO='ACTIVITY_ON_DEMO',
}

export interface ContactPropertyPayload {
  email: string;
  ctaClickRate: number;
  demoCompletion: number;
  totalTimeSpent: number;
  demoUniqueViews: number;
  demoTotalViews: number;
  lastActiveAt: number,
}

export interface Event {
  event: string;
  payload: ContactPropertyPayload | ActivityTimeline;
}

export interface ActivityTimeline {
  email: string;
  totalTimeSpent: number;
  activityUrl: string,
  demoName: string,
  completionPercentage: number;
  ourEventId: string;
}

export interface ScreenDiagnostics {
  type: string;
  reason: string;
  code: number;
}
export declare type ITourDiganostics = Record<number, ScreenDiagnostics[]>;
export interface TourDataWoScheme {
  opts: ITourDataOpts;
  entities: Record<string, TourEntity>;
  diagnostics: ITourDiganostics;
  journey: JourneyData;
}

export interface TourData extends TourDataWoScheme {
  v: SchemaVersion;
  lastUpdatedAtUtc: number;
}

export interface TourEntity {
  type: 'screen' | 'qualification';
  ref: string;
}

export interface JourneyData {
  positioning: CreateJourneyPositioning;
  title: string;
  flows: JourneyFlow[];
  cta?: {
    size: AnnotationButtonSize;
    text: string;
    navigateTo: string;
  };
  primaryColor: string;
}

export declare enum AnnotationButtonSize {
  Large = 'large',
  Medium = 'medium',
  Small = 'small'
}

export interface JourneyFlow {
  header1: string;
  header2: string;
  main: string;
}

export declare enum CreateJourneyPositioning {
  Left_Bottom = 'leftbottom',
  Right_Bottom = 'rightbottom'
}

export interface ITourDataOpts extends IChronoUpdatable {
  primaryColor: string;
  annotationBodyBackgroundColor: string;
  annotationBodyBorderColor: string;
  annotationFontFamily: string | null;
  annotationFontColor: string;
  main: string;
  borderRadius: number;
  annotationPadding: string;
}

export interface IChronoUpdatable {
  monoIncKey: number;
  createdAt: number;
  updatedAt: number;
}

export interface IAnnotationConfig extends IAnnotationOriginConfig {
  syncPending: boolean;
}

export interface IAnnotationOriginConfig extends IChronoUpdatable {
  id: string;
  refId: string;
  grpId: string;
  zId: string;
  bodyContent: string;
  displayText: string;
  positioning: AnnotationPositions | VideoAnnotationPositions | CustomAnnotationPosition | CoverAnnotationPositions;
  buttons: IAnnotationButton[];
  type: 'cover' | 'default';
  size: EAnnotationBoxSize;
  customDims: CustomAnnDims;
  isHotspot: boolean;
  hideAnnotation: boolean;
  videoUrl: string;
  hotspotElPath: string | null;
  videoUrlHls: string;
  videoUrlMp4: string;
  videoUrlWebm: string;
  showOverlay: boolean;
  buttonLayout: AnnotationButtonLayoutType;
  selectionShape: AnnotationSelectionShapeType;
  selectionEffect: AnnotationSelectionEffectType;
  targetElCssStyle: string;
  annCSSStyle: string;
  annotationSelectionColor: string;
}

export declare enum CustomAnnotationPosition {
  TOP_LEFT = 'c-top-left',
  TOP_CENTER = 'c-top-center',
  TOP_RIGHT = 'c-top-right',
  RIGHT_TOP = 'c-right-top',
  RIGHT_CENTER = 'c-right-center',
  RIGHT_BOTTOM = 'c-right-bottom',
  BOTTOM_RIGHT = 'c-bottom-right',
  BOTTOM_CENTER = 'c-bottom-center',
  BOTTOM_LEFT = 'c-bottom-left',
  LEFT_BOTTOM = 'c-left-bottom',
  LEFT_CENTER = 'c-left-center',
  LEFT_TOP = 'c-left-top'
}
export declare enum CoverAnnotationPositions {
  LEFT = 'left',
  RIGHT = 'right'
}
export declare enum AnnotationPositions {
  Auto = 'auto'
}
export declare enum VideoAnnotationPositions {
  BottomRight = 'bottom-right',
  BottomLeft = 'bottom-left',
  Center = 'center',
  Follow = 'follow'
}

export interface IAnnotationButton {
  id: string;
  type: IAnnotationButtonType;
  text: string;
  style: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  exclude?: boolean;
  order: number;
  hotspot: ITourEntityHotspot | null;
}

export interface TourScreenEntity extends TourEntity {
  type: 'screen';
  annotations: Record<string, IAnnotationOriginConfig>;
}

export interface ITourEntityHotspot {
  type: 'el' | 'an-btn';
  on: 'click';
  target: string;
  actionType: 'navigate' | 'open';
  actionValue: string;
}

export declare enum AnnotationButtonStyle {
  Primary = 'primary',
  Link = 'link',
  Outline = 'outline'
}

export declare type IAnnotationButtonType = 'next' | 'prev' | 'custom';
export declare type EAnnotationBoxSize = 'small' | 'medium' | 'large' | 'custom';
export declare const AnnotationButtonLayout: readonly ['default', 'full-width'];
export declare type AnnotationButtonLayoutType = typeof AnnotationButtonLayout[number];
export declare const AnnotationSelectionShape: readonly ['box', 'pulse'];
export declare type AnnotationSelectionShapeType = typeof AnnotationSelectionShape[number];
export declare const AnnotationSelectionEffect: readonly ['regular', 'blinking'];
export declare type AnnotationSelectionEffectType = typeof AnnotationSelectionEffect[number];
export declare type CustomAnnDims = {
  width: number;
};

export interface P_RespTour extends RespDemoEntity {
  dataFileUri: URL;
  displayableUpdatedAt: string;
  isPlaceholder: boolean;
  screens?: P_RespScreen[];
  loaderFileUri: URL;
}

export interface P_RespScreen extends RespScreen {
  urlStructured: URL;
  thumbnailUri: URL;
  dataFileUri: URL;
  editFileUri: URL;
  displayableUpdatedAt: string;
  related: P_RespScreen[];
  numUsedInTours: number;
  isRootScreen: boolean;
}

export type AnnotationPerScreenId = { screenId: number, annotations: IAnnotationConfig[] };

export interface IAnnotationConfigWithLocation extends IAnnotationConfigWithScreenId {
  location: string;
}

export interface IAnnotationConfigWithScreenId extends IAnnotationConfig {
  screenId: number
}

export interface Campaign {
  id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  status: string;
  name: string;
  parent_campaign_id: number |null;
  client_id: number |null;
}

export interface Lead {
  email: string;
  first_name: string;
  last_name: string;
}