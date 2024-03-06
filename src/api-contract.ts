/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 2.35.1025 on 2024-03-05 16:47:06.

export interface ApiResp<T> {
    status: ResponseStatus;
    data: T;
    errStr: string;
    errCode: ErrorCode;
}

export interface ButtonClicks {
    btnId: string;
    totalClicks: number;
}

export interface EntityHoldingInfoBase extends Serializable {
    __id: number;
    type: string;
}

export interface ImgResizingJobInfo extends JobProcessingInfo {
    sourceFilePath: string;
    processedFilePath: string;
    resolution: string;
}

export interface JobProcessingInfo extends MapSerializable {
    __id: number;
    duration: string;
    key: string;
    type: string;
}

export interface MediaTypeEntityHolding extends EntityHoldingInfoBase {
    fullFilePaths: string[];
    deletable: boolean;
}

export interface PaymentTerms {
}

export interface ReqTourPropUpdate {
    tourRid: string;
    inProgress?: boolean;
}

export interface ScreenAssets {
    thumbnail: string;
    name: string;
    url: string;
    icon: string;
}

export interface TotalVisitorsByYmd {
    totalViews: number;
    ymd: string;
}

export interface TourAnnViewsWithPercentile {
    annId: string;
    totalViews: number;
    p1: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
}

export interface TourAnnWithViews {
    annId: string;
    totalViews: number;
    p50: number;
    p75: number;
    p95: number;
}

export interface TourManifest {
    version: number;
    name: string;
    url: string;
    screenAssets: ScreenAssets[];
}

export interface VideoTranscodingJobInfo extends JobProcessingInfo {
    sourceFilePath: string;
    processedFilePath: string;
    sub: VideoProcessingSub;
    meta: string;
}

export interface ReqActivateOrDeactivateUser {
    userId: number;
    shouldActivate: boolean;
}

export interface ReqCopyScreen {
    parentId: number;
    tourRid: string;
}

export interface ReqDuplicateTour {
    duplicateTourName: string;
    fromTourRid: string;
}

export interface ReqEntityAssetAssn {
    entityRid: string;
    entityType: EntityType;
}

export interface ReqMediaProcessing {
    path: string;
    assn: ReqEntityAssetAssn;
}

export interface ReqNewOrg {
    displayName: string;
    thumbnail: string;
}

export interface ReqNewScreen {
    name: string;
    url?: string;
    thumbnail?: string;
    favIcon?: string;
    type: ScreenType;
    contentType?: string;
    body: string;
}

export interface ReqNewTour {
    name: string;
    description?: string;
}

export interface ReqNfHook {
    eventName: NfEvents;
    payload: { [index: string]: string };
}

export interface ReqProxyAsset {
    origin: string;
    clientInfo: string;
    body?: boolean;
}

export interface ReqRecordEdit {
    rid: string;
    editData: string;
}

export interface ReqRenameGeneric {
    newName: string;
    description?: string;
    rid: string;
}

export interface ReqScreenTour {
    screenRid: string;
    tourRid: string;
}

export interface ReqSubscriptionInfo {
    pricingPlan: Plan;
    pricingInterval: Interval;
}

export interface ReqThumbnailCreation {
    screenRid: string;
}

export interface ReqTourRid {
    tourRid: string;
}

export interface ReqUpdateScreenProperty {
    rid: string;
    propName: string;
    propValue: any;
}

export interface ReqUpdateUser {
    firstName: string;
    lastName: string;
}

export interface RespCommonConfig extends ResponseBase {
    commonAssetPath: string;
    screenAssetPath: string;
    tourAssetPath: string;
    pubTourAssetPath: string;
    dataFileName: string;
    loaderFileName: string;
    editFileName: string;
    pubDataFileName: string;
    pubLoaderFileName: string;
    pubEditFileName: string;
    pubTourEntityFileName: string;
    manifestFileName: string;
    latestSchemaVersion: SchemaVersion;
}

export interface RespConversion {
    tourId: number;
    buttonsWithTotalClicks: ButtonClicks[];
}

export interface RespHealth extends ResponseBase {
    status: string;
}

export interface RespMediaProcessingInfo extends ResponseBase {
    jobId: number;
    originalFilePath: string;
    mediaType: MediaType;
    processedFilePath: string;
    processingState: JobProcessingStatus;
    failureReason: string;
}

export interface RespOrg extends ResponseBase {
    rid: string;
    displayName: string;
    thumbnail: string;
}

export interface RespProxyAsset extends ResponseBase {
    proxyUri: string;
    content?: string;
}

export interface RespScreen extends ResponseBase {
    id: number;
    parentScreenId: number;
    rid: string;
    assetPrefixHash: string;
    displayName: string;
    createdBy: RespUser;
    thumbnail: string;
    url: string;
    icon: string;
    responsive: boolean;
    type: ScreenType;
    uploadUrl?: string;
}

export interface RespSubscription extends ResponseBase {
    paymentPlan: Plan;
    paymentInterval: Interval;
    status: Status;
    trialStartedOn: Date;
    trialEndsOn: Date;
}

export interface RespTour extends ResponseBase {
    id: number;
    rid: string;
    assetPrefixHash: string;
    displayName: string;
    description: string;
    lastPublishedDate: Date;
    onboarding: boolean;
    inProgress: boolean;
    createdBy: RespUser;
}

export interface RespTourAnnViews {
    tourId: number;
    tourAnnWithViews: TourAnnWithViews[];
}

export interface RespTourAnnWithPercentile {
    tourAnnInfo: TourAnnViewsWithPercentile[];
}

export interface RespTourView {
    tourId: number;
    totalViews: SumViews;
    totalVisitorsByYmd: TotalVisitorsByYmd[];
}

export interface RespTourWithScreens extends RespTour {
    screens: RespScreen[];
    idxm?: { [index: string]: string };
}

export interface RespUploadUrl {
    url: string;
    expiry: string;
    filename: string;
}

export interface RespUser extends ResponseBase {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    personalEmail: boolean;
    orgAssociation: UserOrgAssociation;
    active: boolean;
}

export interface Serializable {
}

export interface MapSerializable extends Serializable {
}

export interface ResponseBase {
    createdAt: Date;
    updatedAt: Date;
}

export interface SumViews {
    viewsAll: number;
    viewsUnique: number;
}

export const enum EntityType {
    Screen = 0,
    Tour = 1,
}

export const enum EntryDurationType {
    CURRENT = "CURRENT",
    DAILY = "DAILY",
    LIFETIME = "LIFETIME",
}

export const enum JobProcessingStatus {
    Failed = 0,
    Touched = 1,
    InProcess = 2,
    Processed = 3,
}

export const enum JobType {
    TRANSCODE_VIDEO = "TRANSCODE_VIDEO",
    RESIZE_IMG = "RESIZE_IMG",
    DELETE_ASSET = "DELETE_ASSET",
    REFRESH_CRAWLER = "REFRESH_CRAWLER",
    REFRESH_CRAWLER_FOR_ANN_USER_ASSIGN = "REFRESH_CRAWLER_FOR_ANN_USER_ASSIGN",
    REFRESH_TOUR_ANN_CLICK = "REFRESH_TOUR_ANN_CLICK",
    REFRESH_TOUR_CONVERSION = "REFRESH_TOUR_CONVERSION",
    REFRESH_TOUR_METRICS = "REFRESH_TOUR_METRICS",
    REFRESH_USER_AID_MAPPING = "REFRESH_USER_AID_MAPPING",
    REFRESH_AID_SID_MAPPING = "REFRESH_AID_SID_MAPPING",
    ROLLUP_METRICS_CURRENT_TO_DAILY = "ROLLUP_METRICS_CURRENT_TO_DAILY",
    ROLLUP_CONVERSION_CURRENT_TO_DAILY = "ROLLUP_CONVERSION_CURRENT_TO_DAILY",
    ROLLUP_ANN_CLICK_CURRENT_TO_DAILY = "ROLLUP_ANN_CLICK_CURRENT_TO_DAILY",
}

export const enum SchemaVersion {
    V1 = "2023-01-10",
}

export const enum ScreenType {
    Img = 0,
    SerDom = 1,
}

export const enum VideoProcessingSub {
    CONVERT_TO_MP4 = "CONVERT_TO_MP4",
    CONVERT_TO_HLS = "CONVERT_TO_HLS",
}

export const enum MediaType {
    VIDEO_HLS = "VIDEO_HLS",
    VIDEO_MP4 = "VIDEO_MP4",
    IMG_MULTI = "IMG_MULTI",
}

export const enum ResponseStatus {
    Success = "Success",
    Failure = "Failure",
}

export const enum ErrorCode {
    IllegalArgs = 100,
    NotFound = 101,
}

export const enum NfEvents {
    NEW_USER_SIGNUP = "NEW_USER_SIGNUP",
    EBOOK_DOWNLOAD = "EBOOK_DOWNLOAD",
}

export const enum Plan {
    STARTUP = "STARTUP",
    BUSINESS = "BUSINESS",
}

export const enum Interval {
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY",
}

export const enum Status {
    FUTURE = "FUTURE",
    IN_TRIAL = "IN_TRIAL",
    ACTIVE = "ACTIVE",
    NON_RENEWING = "NON_RENEWING",
    PAUSED = "PAUSED",
    CANCELLED = "CANCELLED",
    _UNKNOWN = "_UNKNOWN",
}

export const enum UserOrgAssociation {
    Implicit = "Implicit",
    Explicit = "Explicit",
    NA = "NA",
}
