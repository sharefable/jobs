import {TMsgAttrs} from '../types';
import {fetchFile} from '@ffmpeg/ffmpeg';
import {VideoTranscodingJobInfo} from '../api-contract';
import {deepcopy} from '../utils';
import ffmpegTransform from './file_based_ffmpeg_transformer';
import { CreateJobCommand, ElasticTranscoderClient, ReadJobCommand } from '@aws-sdk/client-elastic-transcoder';
import * as log from '../log';


type IProps = VideoTranscodingJobInfo & TMsgAttrs;

export default async function (utProps: TMsgAttrs): Promise<object> {
  const props = utProps as IProps;
  const processingInfo = await ffmpegTransform(
    props,
    'video/mp4',   // only supported CONVERT_TO_MP4 for now
    // Transcode the file to mp4 container. The vodeo file needs to be encoded with mimeType: 'video/webm;codecs=h264'
    // so that ffmpeg could change the container easily and save it back to disk with extension
    async (ffmpeg, inFile) => {
      const virtualOutFile = 'transcoded.mp4';
      ffmpeg.FS('writeFile', 'source.webm', await fetchFile(inFile));
      await ffmpeg.run('-i', 'source.webm', '-movflags', '+faststart' , virtualOutFile);
      return virtualOutFile;
    },
  );
  //const awsElasticTranscoder = new ElasticTranscoderClient({region: process.env.s3_REGION});
  // const params = {
  //   PipelineId: '1687807152584-1v28mw', // PIPELINE_ID
  //   OutputKeyPrefix: 'test_demo/', 
  //   Input: {
  //     Key: 'f98c03d5c9b246f2b8c4461bf0747c30',
  //   },
  //   Outputs: [{
  //     Key: 'demo_2',
  //     PresetId: '1351620000001-200010', // PRESET_ID
  //     ThumbnailPattern: 'poster-{count}',
  //   }],
  // };
  // const createJobCommand = new CreateJobCommand(params);
  // let createdJobResponse;
  // try {
  //   createdJobResponse = await awsElasticTranscoder.send(createJobCommand);
  // } catch (err) {
  //   log.err('Error when sending create job command', err);
  // }
  // let jobStatus = createdJobResponse?.Job?.Status; // after job create status will be submitted
  // const readJobCommand = new ReadJobCommand({ Id: createdJobResponse?.Job?.Id});
  
  // const intervalId = setInterval( async() => {
  //   try {
  //     const readJobResponse = await awsElasticTranscoder.send(readJobCommand);
  //     jobStatus = readJobResponse.Job?.Status;
  //     if (jobStatus == 'Completed') {
  //       clearInterval(intervalId); 
  //     }
  //   } catch (err) {
  //     log.err('Error when sending read job command', err);
  //   }
  // }, 5000);

  const updatedInfo: VideoTranscodingJobInfo = deepcopy<VideoTranscodingJobInfo>(props);
  updatedInfo.duration = `${processingInfo.duration}s`;
  return updatedInfo;
}

