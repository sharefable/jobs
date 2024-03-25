import { 
  AnalyticsUserAidMappingEntity,
  AnnotationPerScreenId,
  AnnotationPositions,
  AthenaTourLeadEntity,
  CreateJourneyPositioning,
  CustomAnnDims,
  GroupedData,
  IAnnotationButton,
  IAnnotationConfig,
  IAnnotationConfigWithLocation,
  IAnnotationConfigWithScreenId,
  IAnnotationOriginConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  JobInfo,
  JourneyData,
  P_RespTour,
  TourData,
  TourScreenEntity,
  VideoAnnotationPositions, 
} from './types';
import * as log from './log';

export function deepcopy<T>(obj:T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function getS3FileLocationFromURI(path: string) {
  const url = new URL(path);
  const host = url.hostname;
  const hostArr = host.split('.');
  // fable-tour-app-gamma.s3.ap-south-1.amazonaws.com
  const bucketName = hostArr.slice(0, hostArr.length - 4).join('.');
  const pathname = url.pathname.substring(1); // remove leading / as the path name /home.acme.com
  const pathArr = pathname.split('/');
  const dir = pathArr.slice(0, pathArr.length - 1).join('/');
  const fileName = pathArr.at(-1);

  return {
    bucketName: bucketName,
    dir,
    fullFilePath: pathname,
    fileName,
  };
}

export const getUTCTimesForJob =  (): JobInfo => {
  const jobStartedAt  = new Date(); 
  const jobRunTime: string = getUtcDateHour(jobStartedAt);
  jobStartedAt.setHours(jobStartedAt.getHours() - 1);
  const jobDataScanningTime: string = getUtcDateHour(jobStartedAt);
  const jobTimestampInfo: JobInfo = { jobRunTime: jobRunTime, jobDataScanningTime: jobDataScanningTime};
  return jobTimestampInfo;
};

export const getUtcDateHour= (timestamp: Date): string => {
  const jobUtc = new Date(
    timestamp.getUTCFullYear(),
    timestamp.getUTCMonth(),
    timestamp.getUTCDate(),
    timestamp.getUTCHours(),
    timestamp.getUTCMinutes(),
    timestamp.getUTCSeconds(),
    timestamp.getUTCMilliseconds(),
  );
  const jobUtcYear = jobUtc.getFullYear();
  const jobUtcMonth = jobUtc.getMonth() + 1;
  const jobUtcDate = jobUtc.getDate();
  const jobUtcHour = jobUtc.getHours();
  const jobDateHourInfo = `${jobUtcYear}${jobUtcMonth.toString().padStart(2, '0')}${jobUtcDate.toString().padStart(2, '0')}${jobUtcHour.toString().padStart(2, '0')}`;
  return jobDateHourInfo;
};

export const getCreatedAtAndUpdateAt = (timestamp: string): string => {
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hours = timestamp.slice(8, 10);
  const minutes = '59'; 
  const seconds = '59';
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const getMidnightTimestamp = (currentYmd: string): string => {
  const year = currentYmd.slice(0, 4);
  const month = currentYmd.slice(4, 6);
  const day = currentYmd.slice(6, 8);
  const hours = '23';
  const minutes = '59'; 
  const seconds = '59';
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};


export const getTimeFromUpdatedAt = (updatedAt: string) => {
  const date = new Date(updatedAt);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const sec = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${sec}`;
};

export const getYmd = (dateAndHour: string) => {
  return dateAndHour.substring(0, 8);
};

export const calculateAverage = (arr1: any[], arr2:any[]) => {
  const maxLength = Math.max(arr1.length, arr2.length);
  const sumArr: number[] = new Array(maxLength).fill(0);

  arr1.forEach((value, index) => {
    sumArr[index] += value;
  });

  arr2.forEach((value, index) => {
    sumArr[index] += value;
  });
  const averages = sumArr.map((sum) => Math.round(sum / 2)); 
  return averages;
};

export function groupQueryResultBySid(queryResult: AthenaTourLeadEntity[]): GroupedData {
  const groupedData: GroupedData = {};
  queryResult.forEach((item: AthenaTourLeadEntity) => {
    if (!groupedData[item.sid]) {
      groupedData[item.sid] = [];
    }
    groupedData[item.sid].push(item);
  });
  return groupedData;
}

export function timeSpentInDemo(groupedData: GroupedData): number {
  let result = 0;
  for (const sid in groupedData) {
    const group: AthenaTourLeadEntity[] = groupedData[sid];
    group.sort((a, b) => parseInt(a.uts) - parseInt(b.uts));
    const firstUts = parseInt(group[0].uts);
    const lastUts = parseInt(group[group.length - 1].uts);
    const timeDifference = lastUts - firstUts;
    result += timeDifference + 5;
  }
  return result;
}

export function filterDemoLeads(demoLeads: AnalyticsUserAidMappingEntity[]): AnalyticsUserAidMappingEntity[] {
  const emailMap: Record<string, AnalyticsUserAidMappingEntity> = {};

  demoLeads.forEach((obj: AnalyticsUserAidMappingEntity) => {
    if (obj.email && obj.email.trim() !== '') {
      if (!(obj.email in emailMap) || emailMap[obj.email].date_ymd < obj.date_ymd) {
        emailMap[obj.email] = obj;
      }
    }
  });
  return Object.values(emailMap);
}


export function tourAnnoationsLength(data: TourData): number {
  const annotationAndOpts = getThemeAndAnnotationFromDataFile(data, false);
  const allAnnotationsForTour = getAnnsForTour(annotationAndOpts.annotations, annotationAndOpts.annotationsIdMap);
  const annConfigs = [];
  let main;
  if (annotationAndOpts.journey?.flows.length !== 0) {
    for (const flow of annotationAndOpts.journey.flows) {
      main = flow.main;
      console.log(main);
      const annConfigss = getOrderedAnnotaionFromMain(allAnnotationsForTour, main);
      annConfigs.push(...annConfigss);
    }
  } else {
    main = annotationAndOpts.opts.main;
    const annConfigss = getOrderedAnnotaionFromMain(allAnnotationsForTour, main);
    annConfigs.push(...annConfigss);
  }
  const count = annConfigs.length;
  return count;
}

export function getAnnsForTour(
  annotations: Record<string, IAnnotationConfig[]>,
  annotationsIdMap: Record<string, string[]>,
): AnnotationPerScreenId[] {
  const anPerScreen: AnnotationPerScreenId[] = [];
  try {
    const combinedAnnotations: Record<string, IAnnotationConfig> = {};
    const annToDeleteAcrossScreen: Record<string, Record<string, number>> = {};

    for (const [screenId, anns] of Object.entries(annotations)) {
      const idMap = annotationsIdMap[screenId];
      const deleteMap: Record<string, number> = annToDeleteAcrossScreen[screenId] = {};
      for (let i = 0; i < anns.length; i++) {
        if (!anns[i]) {
          deleteMap[idMap[i]] = 1;
          continue;
        }
        combinedAnnotations[`${screenId}/${anns[i].refId}`] = anns[i];
      }
    }
    const screenAnMap: Record<string, IAnnotationConfig[]> = {};
    for (const [qId, an] of Object.entries(combinedAnnotations)) {
      const [screenId] = qId.split('/');
      if (screenId in screenAnMap) {
        screenAnMap[screenId].push(an);
      } else {
        screenAnMap[screenId] = [an];
        anPerScreen.push({ screenId: +screenId, annotations: screenAnMap[screenId] });
      }
    }
  } catch (e) {
    log.err(e);
  }
  return anPerScreen;
}

export const getOrderedAnnotaionFromMain = (
  allAnns: AnnotationPerScreenId[],
  main: string,
) : IAnnotationConfigWithLocation[] => {
  const flatAnns = getFlatAnns(allAnns);
  const firstAnnId = main.split('/')[1];
  const firstAnn = flatAnns[firstAnnId];

  const annsInOrder = getOrderedAnnsFromGivenAnn(firstAnn, flatAnns);
  return annsInOrder;
};

const getOrderedAnnsFromGivenAnn = (
  ann: IAnnotationConfigWithLocation,
  flatAnns: Record<string, IAnnotationConfigWithLocation>,
): IAnnotationConfigWithLocation[] => {
  const annsInOrder: IAnnotationConfigWithLocation[] = [];

  while (true) {
    annsInOrder.push(ann);

    const nextBtn = getAnnotationBtn(ann, 'next')!;
    if (!nextBtn.hotspot || nextBtn.hotspot.actionType === 'open') {
      break;
    }
    const nextAnnRefId = nextBtn.hotspot.actionValue.split('/')[1];
    ann = flatAnns[nextAnnRefId];
  }

  return annsInOrder;
};

const getFlatAnns = (
  allAnns: AnnotationPerScreenId[],
  tour?: P_RespTour,
): Record<string, IAnnotationConfigWithLocation> => {
  const flatAnns: Record<string, IAnnotationConfigWithLocation> = {};
  for (const annPerScreen of allAnns) {
    for (const ann of annPerScreen.annotations) {
      flatAnns[ann.refId] = {
        ...ann,
        location: tour ? `/demo/${tour.rid}/${annPerScreen.screenId}/${ann.refId}` : '',
        // screenId: annPerScreen.screen.id,
        screenId: annPerScreen.screenId,
      };
    }
  }
  return flatAnns;
};

export const getAnnotationBtn = (
  config: IAnnotationConfig,
  type: 'prev' | 'next',
): IAnnotationButton => config.buttons.find(btn => btn.type === type)!;

// TODO why create custom type for a simple type
export type AnnotationSerialIdMap = Record<string, string>
export const getAnnotationSerialIdMap = (
  main: string,
  allAnnotationsForTour: AnnotationPerScreenId[],
): Record<string, string> => {
  const annotationSerialIdMap: Record<string, string> = {};
  let refId = main.split('/')[1];
  let idx = 0;
  while (true) {
    const annotation = getAnnotationByRefId(refId, allAnnotationsForTour);
    if (!annotation) break; // sometime main would not point to proper annotation
    annotationSerialIdMap[refId] = `${idx + 1}`;
    const nextBtn = getAnnotationBtn(annotation!, 'next');
    if (!isNavigateHotspot(nextBtn.hotspot)) break;
    idx += 1;
    refId = nextBtn.hotspot!.actionValue.split('/')[1];
  }

  for (const annRefId in annotationSerialIdMap) {
    if (Object.prototype.hasOwnProperty.call(annotationSerialIdMap, annRefId)) {
      annotationSerialIdMap[annRefId] += ` of ${idx + 1}`;
    }
  }

  return annotationSerialIdMap;
};

export const isNavigateHotspot = (hotspot: ITourEntityHotspot | null): boolean => {
  const result = Boolean((hotspot && hotspot.actionType === 'navigate'));
  return result;
};

export const getAnnotationByRefId = (
  refId: string,
  allAnnotationsForTour: AnnotationPerScreenId[],
): IAnnotationConfigWithScreenId | null => {
  for (const screenGroup of allAnnotationsForTour) {
    const screenId = screenGroup.screenId;
    for (const annotation of screenGroup.annotations) {
      if (annotation.refId === refId) {
        return { ...annotation, screenId };
      }
    }
  }
  return null;
};

export function getThemeAndAnnotationFromDataFile(data: TourData, isLocal = true): {
  annotations: Record<string, IAnnotationConfig[]>,
  annotationsIdMap: Record<string, string[]>,
  opts: ITourDataOpts,
  journey: JourneyData
} {
  const annotationsPerScreen: Record<string, IAnnotationConfig[]> = {};
  const annotationsIdMapPerScreen: Record<string, string[]> = {};
  for (const [screenId, entity] of Object.entries(data.entities)) {
    if (entity.type === 'screen') {
      const anns: IAnnotationConfig[] = [];
      const ids: string[] = [];
      for (const [annId, ann] of Object.entries((entity as TourScreenEntity).annotations)) {
        ids.push(annId);
        anns.push(ann as IAnnotationConfig);
      }
      annotationsPerScreen[screenId] = isLocal ? (anns as IAnnotationConfig[]) : anns.map(remoteToLocalAnnotationConfig);
      annotationsIdMapPerScreen[screenId] = ids;
    } else {
      throw new Error('TODO not yet implemented');
    }
  }

  return {
    annotations: isLocal ? annotationsPerScreen : remoteToLocalAnnotationConfigMap(
      annotationsPerScreen as Record<string, IAnnotationOriginConfig[]>,
      data.opts,
    ),
    annotationsIdMap: annotationsIdMapPerScreen,
    opts: isLocal ? data.opts : normalizeBackwardCompatibilityForOpts(data.opts),
    journey: normalizeBackwardCompatibilityForJourney(data.journey, data.opts),
  };
}

export function remoteToLocalAnnotationConfigMap(
  config: Record<string, IAnnotationOriginConfig[]>,
  opts: ITourDataOpts,
): Record<string, IAnnotationConfig[]> {
  const config2: Record<string, IAnnotationConfig[]> = {};
  for (const [screenId, anns] of Object.entries(config)) {
    config2[screenId] = anns.map(an => remoteToLocalAnnotationConfig(normalizeBackwardCompatibility(an, opts)));
  }
  return config2;
}

export function normalizeBackwardCompatibilityForOpts(opts: ITourDataOpts): ITourDataOpts {
  if (opts === null || opts === undefined) {
    return opts;
  }
  const newOpts = { ...opts };
  if (newOpts.annotationFontColor === undefined || newOpts.annotationFontColor === null) {
    newOpts.annotationFontColor = '#424242';
  }

  if (newOpts.annotationFontFamily === undefined) {
    newOpts.annotationFontFamily = null;
  }

  if (newOpts.borderRadius === undefined || newOpts.borderRadius === null) {
    newOpts.borderRadius = 4;
  }

  if (newOpts.annotationPadding === undefined || newOpts.annotationPadding === null) {
    newOpts.annotationPadding = '14 14';
  }

  return newOpts;
}

export function normalizeBackwardCompatibilityForJourney(
  journey: JourneyData,
  opts: ITourDataOpts,
): JourneyData {
  if (journey === null || journey === undefined) {
    return getSampleJourneyData();
  }

  if (!journey.primaryColor) {
    journey.primaryColor = opts.primaryColor;
  }

  return journey;
}

export declare function getSampleJourneyData(): {
  positioning: CreateJourneyPositioning;
  title: string;
  flows: never[];
  primaryColor: string;
};

export function remoteToLocalAnnotationConfig(rc: IAnnotationOriginConfig): IAnnotationConfig {
  return {
    ...rc,
    syncPending: false,
  };
}

export declare const DEFAULT_ANN_DIMS: CustomAnnDims;
export declare const DEFAULT_BLUE_BORDER_COLOR = '#2196f3';

export function normalizeBackwardCompatibility(
  an: IAnnotationOriginConfig,
  opts: ITourDataOpts,
): IAnnotationOriginConfig {
  if (an.annotationSelectionColor === undefined || an.annotationSelectionColor === null) {
    // annotationSelectionColor was present in tour opts previous versions and now this config is moved to annotation cofnig
    const tOpts = opts as ITourDataOpts & { annotationSelectionColor?: string };
    an.annotationSelectionColor = tOpts.annotationSelectionColor || DEFAULT_BLUE_BORDER_COLOR;
  }

  if (an.type === 'cover') an.isHotspot = false;
  else an.isHotspot = true;

  if (an.hideAnnotation === undefined || an.hideAnnotation === null) {
    an.hideAnnotation = false;
  }

  if (an.videoUrl === undefined || an.videoUrl === null) {
    an.videoUrl = '';
  }

  if (an.videoUrlMp4 === undefined || an.videoUrlMp4 === null) {
    an.videoUrlMp4 = '';
  }

  if (an.videoUrlHls === undefined || an.videoUrlHls === null) {
    an.videoUrlHls = '';
  }

  if (an.videoUrlWebm === undefined || an.videoUrlWebm === null) {
    an.videoUrlWebm = '';
  }

  if (an.buttonLayout === undefined || an.buttonLayout === null) {
    an.buttonLayout = 'default';
  }

  if (an.selectionShape === undefined || an.selectionShape === null) {
    an.selectionShape = 'box';
  }

  if (an.selectionEffect === undefined || an.selectionEffect === null) {
    an.selectionEffect = 'regular';
  }

  if (an.targetElCssStyle === undefined || an.targetElCssStyle === null) {
    an.targetElCssStyle = '';
  }

  if (an.annCSSStyle === undefined || an.annCSSStyle === null) {
    an.annCSSStyle = '';
  }

  if (an.customDims === undefined || an.customDims === null) {
    an.customDims = DEFAULT_ANN_DIMS;
  }

  if (an.zId === undefined || an.zId === null) {
    an.zId = an.refId;
  }

  const isVideoAnnotation = isVideoAnn(an as IAnnotationConfig);
  if (isVideoAnnotation && an.positioning === AnnotationPositions.Auto) {
    an.positioning = VideoAnnotationPositions.BottomRight;
  }

  if (an.showOverlay === undefined || an.showOverlay === null) {
    // showOverlay was present in tour opts previous versions and now this config is moved to annotation cofnig
    const tOpts = opts as ITourDataOpts & { showOverlay?: boolean };
    if (!(tOpts.showOverlay === undefined || tOpts.showOverlay === null)) {
      an.showOverlay = !!tOpts.showOverlay;
    } else {
      an.showOverlay = true;
    }
  }

  return an;
}

export const isVideoAnn = (config: IAnnotationConfig): boolean => !isBlankString(config.videoUrl)
  || (!isBlankString(config.videoUrlMp4)
    || !isBlankString(config.videoUrlWebm)
    || !isBlankString(config.videoUrlHls));

export function isBlankString(str: string): boolean {
  return str.trim() === '';
}