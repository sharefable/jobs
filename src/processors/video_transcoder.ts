import {TMsgAttrs} from '../types';
import {VideoProcessingSub, VideoTranscodingJobInfo} from '../api-contract';
import {deepcopy, getS3FileLocationFromURI} from '../utils';
import IrrecoverableErr from '../irrecoverable_err';
import { CreateJobCommand, CreateJobCommandInput, ElasticTranscoderClient, ReadJobCommand } from '@aws-sdk/client-elastic-transcoder';
import * as log from '../log';


type IProps = VideoTranscodingJobInfo & TMsgAttrs;
export default async function (utProps: TMsgAttrs): Promise<object> {
  const props = utProps as IProps;
  log.info(`Starting ${props.sub} processing for ${props.key}`);
  const source = getS3FileLocationFromURI(props.sourceFilePath);
  const dest = getS3FileLocationFromURI(props.processedFilePath);
  let jobParams: CreateJobCommandInput;
  const awsElasticTranscoder = new ElasticTranscoderClient({region: process.env.ETS_REGION});
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

  const startTime = +new Date();
  let jobDuration = -1;
  let transcoderJobId = '';
  try {
    const createJobCommand = new CreateJobCommand(jobParams);
    const createdJobResponse = await awsElasticTranscoder.send(createJobCommand);
    if (!createdJobResponse?.Job) {
      throw new Error('Job object is undefined after job submission');
    }
    transcoderJobId = createdJobResponse.Job.Id!;

    jobDuration = await new Promise((resolve, reject) => {
      const timer = setInterval( async() => {
        try {
          const duration = ((+new Date() - startTime) / 1000) | 0;
          if (duration > 12 * 60) {
          // If the job does not finish in 12mins, get outta
            clearInterval(timer);
            reject(new Error(`Job ${transcoderJobId} timed out`));
            return;
          }
          const readJobCommand = new ReadJobCommand({ Id: transcoderJobId});
          const readJobResponse = await awsElasticTranscoder.send(readJobCommand);
          if (!readJobResponse?.Job) {
            reject(new Error('Job object is undefined while fetching for status'));
            return;
          }
          const jobStatus = readJobResponse.Job.Status;
          log.info(`Job ${transcoderJobId} status ${jobStatus}`);
          if (jobStatus == 'Complete') {
            clearInterval(timer); 
            resolve(duration);
          } else if (jobStatus === 'Error') {
            clearInterval(timer);
            reject(new Error(`Job ${transcoderJobId} failed`));
          }
        } catch (err) {
          reject(err);
        }
      }, 2000);
    });
  } catch (err) {
    const errMsg = (err as Error).message;
    log.err('[Error from transcoder service] ', errMsg);
    throw new IrrecoverableErr(errMsg);
  }
  
  const updatedInfo: VideoTranscodingJobInfo = deepcopy<VideoTranscodingJobInfo>(props);
  updatedInfo.meta = `etsId=${transcoderJobId}`;
  updatedInfo.duration = `${jobDuration}s`;
  return updatedInfo;
}

