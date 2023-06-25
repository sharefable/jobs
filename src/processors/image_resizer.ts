import {ImgResizingJobInfo} from '../api-contract';
import {TMsgAttrs} from '../types';
import ffmpegTransform from './file_based_ffmpeg_transformer';
import {fetchFile} from '@ffmpeg/ffmpeg';
import {deepcopy} from '../utils';

type IProps = ImgResizingJobInfo & TMsgAttrs;

export default async function (utProps: TMsgAttrs): Promise<object> {
  const props = utProps as IProps;
  const processingInfo = await ffmpegTransform(
    props,
    'image/png',   // only supported CONVERT_TO_MP4 for now
    // Transcode the file to mp4 container. The vodeo file needs to be encoded with mimeType: 'video/webm;codecs=h264'
    // so that ffmpeg could change the container easily and save it back to disk with extension
    async (ffmpeg, inFile) => {
      const virtualOutFile = 'resized.png';
      ffmpeg.FS('writeFile', 'source', await fetchFile(inFile));
      await ffmpeg.run('-i', 'source', '-vf', `scale=${props.resolution}:-1` , virtualOutFile);
      return virtualOutFile;
    },
  );

  const updatedInfo: ImgResizingJobInfo = deepcopy<ImgResizingJobInfo>(props);
  updatedInfo.duration = `${processingInfo.duration}s`;
  return updatedInfo;
}
