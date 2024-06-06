import {TMsgAttrs} from '../../types';
import {AudioProcessingSub, AudioTranscodingJobInfo } from '../../api-contract';
import {deepcopy, getS3FileLocationFromURI} from '../../utils';
import IrrecoverableErr from '../../irrecoverable_err';
import { CreateJobCommandInput, ElasticTranscoderClient } from '@aws-sdk/client-elastic-transcoder';
import * as log from '../../log';
import { TranscoderBase } from './transcoder_base';

export default async function (utProps: TMsgAttrs): Promise<AudioTranscodingJobInfo> {
  const audioTrascoder = new AudioTranscoder();
  return audioTrascoder.initiateTranscoding(utProps);
}


type IProps = AudioTranscodingJobInfo & TMsgAttrs;

export class AudioTranscoder extends TranscoderBase<AudioTranscodingJobInfo> {
  
  protected async mediaTranscoder(
    utProps: TMsgAttrs,
    awsElasticTranscoder: ElasticTranscoderClient)
    : Promise<AudioTranscodingJobInfo> {
    
    const props = utProps as IProps;
    log.info(`Starting ${props.sub} processing for ${props.key}`);
    const source = getS3FileLocationFromURI(props.sourceFilePath);
    const dest = getS3FileLocationFromURI(props.processedFilePath);
    let jobParams: CreateJobCommandInput;
   
    if (props.sub === AudioProcessingSub.CONVERT_TO_HLS) {
      jobParams = {
        PipelineId: process.env.TRANSCODER_PIPELINE_ID,
        OutputKeyPrefix: `${dest.dir}/`, // the output would be produced inside this folder
        Input: {
          Key: source.fullFilePath,
        },
        Outputs: [{
          SegmentDuration: '4.0',
          Key: dest.fileName,
          PresetId: '1351620000001-200060', // PRESET_ID for hls
        }],
      };
    }  else if (props.sub === AudioProcessingSub.CONVERT_TO_WEBM) {
      jobParams = {
        PipelineId: process.env.TRANSCODER_PIPELINE_ID,
        OutputKeyPrefix: `${dest.dir}/`, // the output would be produced inside this folder
        Input: {
          Key: source.fullFilePath,
        },
        Outputs: [{
          Key: dest.fileName,
          PresetId: '1351620000001-300020', // PRESET_ID for webm
        }],
      };
    } else {
      throw new IrrecoverableErr(`Audiotranscoding handler for sub=${props.sub} not found`);
    }
    const trancoderJobResult: Record<string, string | number> = await this.trancoderJob(jobParams, awsElasticTranscoder);
  
    const updatedInfo: AudioTranscodingJobInfo = deepcopy<AudioTranscodingJobInfo>(props);
    updatedInfo.meta = `etsId=${trancoderJobResult.transcoderJobId}`;
    updatedInfo.duration = `${trancoderJobResult.jobDuration}s`;
    return updatedInfo;
  }
}