/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 2.35.1025 on 2023-06-19 16:56:48.

export interface ApiResp<T> {
    status: ResponseStatus;
    data: T;
    errStr: string;
    errCode: ErrorCode;
}

export interface ReqCopyScreen {
    parentId: number;
    tourRid: string;
}

export interface ReqMediaProcess {
    qualifiedPath?: string;
    path: string;
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

export interface ReqProxyAsset {
    origin: string;
    clientInfo: string;
}

export interface ReqRecordEdit {
    rid: string;
    editData: string;
}

export interface ReqRenameGeneric {
    newName: string;
    rid: string;
}

export interface ReqScreenTour {
    screenRid: string;
    tourRid: string;
}

export interface ReqThumbnailCreation {
    screenRid: string;
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
    dataFileName: string;
    editFileName: string;
    latestSchemaVersion: SchemaVersion;
}

export interface RespHealth extends ResponseBase {
    status: string;
}

export interface RespMediaProcessingInfo extends ResponseBase {
    id: number;
    fullFilePath: string;
    processingState: MediaProcessingState;
    failureReason: string;
}

export interface RespOrg extends ResponseBase {
    rid: string;
    displayName: string;
    thumbnail: string;
}

export interface RespProxyAsset extends ResponseBase {
    proxyUri: string;
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
    tour?: RespTour;
    type: ScreenType;
    uploadUrl?: string;
}

export interface RespTour extends ResponseBase {
    rid: string;
    assetPrefixHash: string;
    displayName: string;
    description: string;
    createdBy: RespUser;
}

export interface RespTourWithScreens extends RespTour {
    screens: RespScreen[];
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
    belongsToOrg: number;
    orgAssociation: UserOrgAssociation;
}

export interface ResponseBase {
    createdAt: Date;
    updatedAt: Date;
}

export const enum MediaProcessingState {
    Failed = 0,
    Touched = 1,
    InProcess = 2,
    Processed = 3,
}

export const enum SchemaVersion {
    V1 = "2023-01-10",
}

export const enum ScreenType {
    Img = 0,
    SerDom = 1,
}

export const enum ResponseStatus {
    Success = "Success",
    Failure = "Failure",
}

export const enum ErrorCode {
    IllegalArgs = 100,
    NotFound = 101,
}

export const enum UserOrgAssociation {
    Implicit = "Implicit",
    Explicit = "Explicit",
    NA = "NA",
}
