/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 2.35.1025 on 2024-06-05 13:51:33.

export interface ApiResp<T> {
    status: ResponseStatus;
    data: T;
    errStr: string;
    errCode: ErrorCode;
}

export interface AudioTranscodingJobInfo extends JobProcessingInfo {
    sourceFilePath: string;
    processedFilePath: string;
    sub: AudioProcessingSub;
    meta: string;
}

export interface ButtonClicks {
    btnId: string;
    totalClicks: number;
}

export interface CreateGifJobInfo extends JobProcessingInfo {
    manifestFilePath: string;
    gifFilePath: string;
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

export interface InviteCode {
    invitedEmail: string;
    orgId: number;
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

export interface OnboardingTourForPrev {
    rid: string;
    name: string;
    description: string;
}

export interface OrgInfo {
    useCases?: string[];
    othersText?: string;
    bet?: any;
}

export interface PaymentTerms {
}

export interface ReqNewLog {
    orgId: number;
    logType: LogType;
    forObjectType: ForObjectType;
    forObjectId: number;
    forObjectKey?: string;
    logLine: any;
}

export interface RespFatTenantIntegration {
    org: RespOrg;
    platformIntegration: PlatformIntegration;
    tenantIntegration: TenantIntegration;
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

export interface TourLeads {
    aid: string;
    email: string;
}

export interface TourManifest {
    version: number;
    name: string;
    url: string;
    screenAssets: ScreenAssets[];
}

export interface TourSettings {
    vpdWidth: number;
    vpdHeight: number;
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

export interface ReqAddOrUpdateLeadInfo {
    tourId: number;
    emailId: string;
    value: string;
    key: LeadInfoKey;
}

export interface ReqAssignOrgToUser {
    orgId: number;
}

export interface ReqCobaltEvent {
    event: string;
    payload: { [index: string]: string };
}

export interface ReqCopyScreen {
    parentId: number;
    tourRid: string;
}

export interface ReqCreateOrDeleteNewVanityDomain {
    domainName: string;
    subdomainName: string;
    apexDomainName: string;
}

export interface ReqCreateOrUpdateTenantIntegration {
    integrationType: PlatformIntegrationType;
    tenantIntegrationId?: number;
    relayId?: number;
    event: string;
    disabled?: boolean;
    tourId?: number;
    tenantConfig: { [index: string]: any };
}

export interface ReqDeleteTenantIntegration {
    tenantIntegrationId: number;
}

export interface ReqDuplicateTour {
    duplicateTourName: string;
    fromTourRid: string;
}

export interface ReqEntityAssetAssn {
    entityRid: string;
    entityType: EntityType;
}

export interface ReqHouseLeadInfoWithInfo360 {
    orgId: number;
    leadEmailId: string;
    info360: ReqLead360[];
}

export interface ReqLead360 {
    tourId: number;
    demoVisited: number;
    sessionsCreated: number;
    timeSpentSec: number;
    lastInteractedAt: Date;
    completionPercentage: number;
    ctaClickRate: number;
}

export interface ReqLeadActivityDataPost {
    tourId: number;
    aid: string;
    data: string;
}

export interface ReqMediaProcessing {
    path: string;
    assn: ReqEntityAssetAssn;
}

export interface ReqNewInvite {
    invitedEmail: string;
    expiryTimeUnit?: ExpiryTimeUnit;
    expireAfter?: number;
}

export interface ReqNewLinkedAccount {
    orgId: number;
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
    settings?: TourSettings;
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
    lifetimeLicense?: string;
}

export interface ReqThumbnailCreation {
    screenRid: string;
}

export interface ReqTourPropUpdate {
    tourRid: string;
    site?: { [index: string]: any };
    inProgress?: boolean;
    responsive?: boolean;
    responsive2?: Responsiveness;
}

export interface ReqTourRid {
    tourRid: string;
}

export interface ReqTransferTour {
    email: string;
    orgId: number;
    rids: string[];
}

export interface ReqUpdateOrg {
    orgInfo: OrgInfo;
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

export interface RespAccountToken extends ResponseBase {
    token: string;
}

export interface RespApiKey extends ResponseBase {
    apiKey: string;
    active: boolean;
    createdBy: RespUser;
}

export interface RespCommonConfig extends ResponseBase {
    commonAssetPath: string;
    screenAssetPath: string;
    tourAssetPath: string;
    pubTourAssetPath: string;
    dataFileName: string;
    loaderFileName: string;
    editFileName: string;
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

export interface RespHouseLeadInfo extends ResponseBase {
    orgId: number;
    leadEmailId: string;
    info360: Lead360[];
}

export interface RespLeadActivityUrl {
    leadActivityUrl: string;
}

export interface RespLinkedApps {
    name: string;
    icon: string;
    description: string;
    type: string;
    connected?: boolean;
    slug: string;
}

export interface RespMediaProcessingInfo extends ResponseBase {
    jobId: number;
    originalFilePath: string;
    mediaType: MediaType;
    processedFilePath: string;
    processingState: JobProcessingStatus;
    failureReason: string;
}

export interface RespNewInvite {
    code: string;
}

export interface RespOrg extends ResponseBase {
    id: number;
    rid: string;
    displayName: string;
    thumbnail: string;
    info: OrgInfo;
    createdBy: RespUser;
}

export interface RespPlatformIntegration extends ResponseBase {
    type: PlatformIntegrationType;
    name: string;
    icon: string;
    description: string;
    slug: string;
    disabled: boolean;
    platformConfig: { [index: string]: any };
    tenantIntegrations: RespTenantIntegration[];
}

export interface RespProxyAsset extends ResponseBase {
    proxyUri: string;
    content?: string;
    hasErr?: boolean;
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

export interface RespSubsValidation {
    cardPresent: boolean;
}

export interface RespSubscription extends ResponseBase {
    paymentPlan: Plan;
    paymentInterval: Interval;
    status: Status;
    trialStartedOn: Date;
    trialEndsOn: Date;
}

export interface RespTenantIntegration extends ResponseBase {
    id: number;
    disabled: boolean;
    event: string;
    tenantConfig: { [index: string]: any };
    relay: number;
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
    pubDataFileName: string;
    pubLoaderFileName: string;
    pubEditFileName: string;
    pubTourEntityFileName: string;
    site: { [index: string]: any };
    responsive: boolean;
    responsive2: Responsiveness;
    deleted: TourDeleted;
    settings?: TourSettings;
}

export interface RespTourAnnViews {
    tourId: number;
    tourAnnWithViews: TourAnnWithViews[];
}

export interface RespTourAnnWithPercentile {
    tourAnnInfo: TourAnnViewsWithPercentile[];
}

export interface RespTourLeads {
    tourLeads: TourLeads[];
    uniqueEmailCount: number;
}

export interface RespTourView {
    tourId: number;
    totalViews: number;
    uniqueViews: number;
    totalVisitorsByYmd: TotalVisitorsByYmd[];
}

export interface RespTourWithScreens extends RespTour {
    screens: RespScreen[];
    idxm?: { [index: string]: string };
    cc: RespCommonConfig;
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
    orgs: RespOrg[];
}

export interface RespVanityDomain {
    subdomainName: string;
    apexDomainName: string;
    domainName: string;
    createdAt: Date;
    status: VanityDomainDeploymentStatus;
    records: VanityDomainRecords[];
    rejectionReason?: string;
}

export interface AuthInputMap {
    name: string;
    label: string;
    placeholder: string;
    required: boolean;
    type: string;
    options: string[];
}

export interface Identifiers {
    portalId: number;
    appId: number;
    userId: number;
    hub_domain: string;
}

export interface LinkedAppVersion {
    _v: string;
    description: string;
}

export interface LinkedApps {
    name: string;
    icon: string;
    description: string;
    type: string;
    tags: string[];
    version?: LinkedAppVersion;
    connected?: boolean;
    slug: string;
    app_id: string;
    auth_type: string;
    connected_accounts?: any[];
    auth_input_map?: AuthInputMap[];
    reauth_required: boolean;
}

export interface Serializable {
}

export interface MapSerializable extends Serializable {
}

export interface PlatformIntegration extends EntityBase {
    type: PlatformIntegrationType;
    name: string;
    icon: string;
    description: string;
    disabled: boolean;
    platformConfig: { [index: string]: any };
}

export interface TenantIntegration extends EntityBase {
    orgId: number;
    disabled: boolean;
    integrationId: number;
    event: string;
    tourId: number;
    tenantConfig: { [index: string]: any };
}

export interface ResponseBase {
    createdAt: Date;
    updatedAt: Date;
}

export interface Lead360 extends EntityBase {
    tourId: number;
    demoVisited: number;
    sessionsCreated: number;
    timeSpentSec: number;
    lastInteractedAt: Date;
    completionPercentage: number;
    ctaClickRate: number;
}

export interface VanityDomainRecords {
    recordType: DomainRecordType;
    recordDes: string;
    recordKey: string;
    recordValue: string;
}

export interface EntityBase {
    createdAt: Date;
    updatedAt: Date;
    id: number;
}

export const enum ConfigEntityType {
    Org = "Org",
}

export const enum UnauthorizedReason {
    OrgSuggestedButInvalidAssociation = "OrgSuggestedButInvalidAssociation",
}

export const enum AudioProcessingSub {
    CONVERT_TO_HLS = "CONVERT_TO_HLS",
    CONVERT_TO_WEBM = "CONVERT_TO_WEBM",
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
    TRANSCODE_AUDIO = "TRANSCODE_AUDIO",
    RESIZE_IMG = "RESIZE_IMG",
    CREATE_DEMO_GIF = "CREATE_DEMO_GIF",
    DELETE_ASSET = "DELETE_ASSET",
    REFRESH_CRAWLER = "REFRESH_CRAWLER",
    REFRESH_CRAWLER_FOR_ANN_USER_ASSIGN = "REFRESH_CRAWLER_FOR_ANN_USER_ASSIGN",
    REFRESH_TOUR_ANN_CLICK = "REFRESH_TOUR_ANN_CLICK",
    REFRESH_TOUR_CONVERSION = "REFRESH_TOUR_CONVERSION",
    REFRESH_TOUR_METRICS = "REFRESH_TOUR_METRICS",
    REFRESH_USER_AID_MAPPING = "REFRESH_USER_AID_MAPPING",
    REFRESH_AID_SID_MAPPING = "REFRESH_AID_SID_MAPPING",
    REFRESH_LEAD_ACTIVITY = "REFRESH_LEAD_ACTIVITY",
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

export const enum TourDeleted {
    ACTIVE = 0,
    DELETED = 1,
}

export const enum VideoProcessingSub {
    CONVERT_TO_MP4 = "CONVERT_TO_MP4",
    CONVERT_TO_HLS = "CONVERT_TO_HLS",
}

export const enum MediaType {
    VIDEO_HLS = "VIDEO_HLS",
    VIDEO_MP4 = "VIDEO_MP4",
    IMG_MULTI = "IMG_MULTI",
    AUDIO_MP3 = "AUDIO_MP3",
    AUDIO_HLS = "AUDIO_HLS",
    AUDIO_WEBM = "AUDIO_WEBM",
    GIF = "GIF",
}

export const enum ResponseStatus {
    Success = "Success",
    Failure = "Failure",
}

export const enum ErrorCode {
    IllegalArgs = 100,
    NotFound = 101,
}

export const enum LogType {
    WEBHOOK_EXEC = "WEBHOOK_EXEC",
    SUBSCRIPTION = "SUBSCRIPTION",
}

export const enum ForObjectType {
    TENANT_INTEGRATION = "TENANT_INTEGRATION",
    LIFETIME_LICENSE_KEY = "LIFETIME_LICENSE_KEY",
}

export const enum LeadInfoKey {
    HUBSPOT_CONTACT_ID = "HUBSPOT_CONTACT_ID",
    SFDC_CONTACT_ID = "SFDC_CONTACT_ID",
}

export const enum PlatformIntegrationType {
    FableWebhook = "FableWebhook",
    Zapier = "Zapier",
}

export const enum ExpiryTimeUnit {
    d = "d",
    h = "h",
}

export const enum NfEvents {
    NEW_USER_SIGNUP = "NEW_USER_SIGNUP",
    NEW_ORG_CREATED = "NEW_ORG_CREATED",
    EBOOK_DOWNLOAD = "EBOOK_DOWNLOAD",
    RUN_INTEGRATION = "RUN_INTEGRATION",
    NEW_USER_SIGNUP_WITH_SUBS = "NEW_USER_SIGNUP_WITH_SUBS",
}

export const enum Plan {
    SOLO = "SOLO",
    STARTUP = "STARTUP",
    BUSINESS = "BUSINESS",
    LIFETIME_TIER1 = "LIFETIME_TIER1",
    LIFETIME_TIER2 = "LIFETIME_TIER2",
    LIFETIME_TIER3 = "LIFETIME_TIER3",
}

export const enum Interval {
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY",
    LIFETIME = "LIFETIME",
}

export const enum Responsiveness {
    NoChoice = "NoChoice",
    NoResponsive = "NoResponsive",
    Responsive = "Responsive",
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

export const enum VanityDomainDeploymentStatus {
    Requested = "Requested",
    ManualInterventionNeeded = "ManualInterventionNeeded",
    InProgress = "InProgress",
    VerificationPending = "VerificationPending",
    DeploymentPending = "DeploymentPending",
    Issued = "Issued",
    Failed = "Failed",
}

export const enum DomainRecordType {
    CNAME = "CNAME",
}
