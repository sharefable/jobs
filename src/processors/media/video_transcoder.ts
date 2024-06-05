import {TMsgAttrs} from '../../types';
import {VideoProcessingSub, VideoTranscodingJobInfo} from '../../api-contract';
import {deepcopy, getS3FileLocationFromURI} from '../../utils';
import IrrecoverableErr from '../../irrecoverable_err';
import { CreateJobCommandInput, ElasticTranscoderClient } from '@aws-sdk/client-elastic-transcoder';
import * as log from '../../log';
import { TranscoderBase } from './transcoder_base';

export default async function (utProps: TMsgAttrs): Promise<VideoTranscodingJobInfo> {
  const videoTranscoder = new VideoTranscoder();
  return videoTranscoder.initiateTranscoding(utProps);
}

type IProps = VideoTranscodingJobInfo & TMsgAttrs;

export class VideoTranscoder extends TranscoderBase<VideoTranscodingJobInfo> {
  
  protected async mediaTranscoder(
    utProps: TMsgAttrs,
    awsElasticTranscoder: ElasticTranscoderClient)
    : Promise<VideoTranscodingJobInfo> {
    
    const props = utProps as IProps;
    log.info(`Starting ${props.sub} processing for ${props.key}`);
    const source = getS3FileLocationFromURI(props.sourceFilePath);
    const dest = getS3FileLocationFromURI(props.processedFilePath);
    let jobParams: CreateJobCommandInput;
   
    if (props.sub === VideoProcessingSub.CONVERT_TO_HLS) {
      jobParams = {
        PipelineId: process.env.TRANSCODER_PIPELINE_ID,
        OutputKeyPrefix: `${dest.dir}/`, // the output would be produced inside this folder
        Input: {
          Key: source.fullFilePath,
        },
        Outputs: [{
          SegmentDuration: '4.0',
          Key: dest.fileName,
          PresetId: '1351620000001-200010', // PRESET_ID for hls
          ThumbnailPattern: 'poster-{count}',
        }],
      };
    } else if (props.sub === VideoProcessingSub.CONVERT_TO_MP4) {
      jobParams = {
        PipelineId: process.env.TRANSCODER_PIPELINE_ID,
        OutputKeyPrefix: `${dest.dir}/`, // the output would be produced inside this folder
        Input: {
          Key: source.fullFilePath,
        },
        Outputs: [{
          Key: dest.fileName,
          PresetId: '1351620000001-100070', // PRESET_ID for mp4 web
        }],
      };
    } else {
      throw new IrrecoverableErr(`Videotranscoding handler for sub=${props.sub} not found`);
    }

    const trancoderJobResult: Record<string, string | number> = await this.trancoderJob(jobParams, awsElasticTranscoder);
  
    const updatedInfo: VideoTranscodingJobInfo = deepcopy<VideoTranscodingJobInfo>(props);
    updatedInfo.meta = `etsId=${trancoderJobResult.transcoderJobId}`;
    updatedInfo.duration = `${trancoderJobResult.jobDuration}s`;
    return updatedInfo;
  } 
}