import {TMsgAttrs} from '../types';
import {GetObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import NonRunnableErr from '../irrecoverable_err';
import {Readable} from 'stream';
import * as fs from 'fs';
import {createReadStream, createWriteStream} from 'fs';
import {createFFmpeg, fetchFile} from '@ffmpeg/ffmpeg';
import * as log from '../log';
import {VideoTranscodingJobInfo} from '../api-contract';
import {deepcopy, getS3FileLocationFromURI} from '../utils';


type IProps = VideoTranscodingJobInfo & TMsgAttrs;

const s3 = new S3Client({ region: process.env.S3_REGION });

const ffmpeg = createFFmpeg({ log: false });
(async () => {
  await ffmpeg.load();
})();

export default async function (utProps: TMsgAttrs): Promise<object> {
  const props = utProps as IProps;
  const qualifiedKey = props.key;
  const sourcePath = props.sourceFilePath;
  const destPath = props.processedFilePath;

  if (!qualifiedKey) throw new NonRunnableErr('key not found');
  log.info('Received message to transcode video', qualifiedKey);

  const source = getS3FileLocationFromURI(sourcePath);
  const dest = getS3FileLocationFromURI(destPath);
  if (!source.bucketName) throw new NonRunnableErr('source bucketName can\'t be retrieved');
  if (!dest.bucketName) throw new NonRunnableErr('dest bucketName can\'t be retrieved');

  // Get file from s3 -> save it in local file system
  const { Body: body } = await s3.send(new GetObjectCommand({
    Bucket: source.bucketName,
    Key: source.key,
  }));

  const nFilename = source.key.replace(/\//g, '_');
  if (body instanceof Readable) {
    await new Promise((resolve, reject) => {
      body.pipe(createWriteStream(`/tmp/${nFilename}`))
        .on('error', err => reject(err))
        .on('close', () => resolve(1));
    });

    log.info('written', nFilename);
  } else throw new NonRunnableErr('s3 stream is not Readable');

  // Transcode the file to mp4 container. The vodeo file needs to be encoded with mimeType: 'video/webm;codecs=h264'
  // so that ffmpeg could change the container easily and save it back to disk with extension
  log.info('Converting...');
  const ts = +new Date();
  const inputVideoFile = `/tmp/${nFilename}`;
  const outputVideoFile = `/tmp/${dest.fileName}`;
  ffmpeg.FS('writeFile', 'source.webm', await fetchFile(inputVideoFile));
  await ffmpeg.run('-i', 'source.webm', '-movflags', '+faststart' ,'transcoded.mp4');
  await fs.promises.writeFile(outputVideoFile, ffmpeg.FS('readFile', 'transcoded.mp4'));
  const duration = ((+new Date() - ts) / 1000) | 0;
  log.info(`Time to convert time in sec ${duration}`);

  // The transcoded file is uploaded to s3
  // A new file is created with extension. The source file is kept in s3
  // only supported CONVERT_TO_MP4 for now
  await s3.send(new PutObjectCommand({
    Bucket: dest.bucketName,
    Key: dest.key,
    Body: createReadStream(outputVideoFile),
    ContentType: 'video/mp4', // only CONVERT_TO_MP4 supported right now
    Metadata: {
      source: sourcePath,
    },
  }));

  log.info('file uploaded to s3', dest.key);

  await Promise.all([inputVideoFile, outputVideoFile].map(f => fs.promises.unlink(f)));

  const updatedInfo: VideoTranscodingJobInfo = deepcopy<VideoTranscodingJobInfo>(props);
  updatedInfo.duration = `${duration}s`;
  return updatedInfo;
}
