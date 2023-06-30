import NonRunnableErr from '../irrecoverable_err';
import * as log from '../log';
import {getS3FileLocationFromURI} from '../utils';
import {ImgResizingJobInfo, VideoTranscodingJobInfo} from '../api-contract';
import {s3} from '../singletons';
import {GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {Readable} from 'stream';
import fs, {createReadStream, createWriteStream} from 'fs';
import {createFFmpeg, FFmpeg} from '@ffmpeg/ffmpeg';

export default async function (
  props: VideoTranscodingJobInfo | ImgResizingJobInfo,
  contentType: 'video/mp4' | 'image/png',
  ffmpegProcess:(ffmpegInst: FFmpeg, inFile: string) => Promise<string>,
): Promise<{ duration: number }> {
  const qualifiedKey = props.key;
  const sourcePath = props.sourceFilePath;
  const destPath = props.processedFilePath;

  if (!qualifiedKey) throw new NonRunnableErr('key not found');
  log.info('Received message to transcode video', qualifiedKey);

  const source = getS3FileLocationFromURI(sourcePath);
  const dest = getS3FileLocationFromURI(destPath);
  if (!source.bucketName) throw new NonRunnableErr('source bucketName can\'t be retrieved');
  if (!dest.bucketName) throw new NonRunnableErr('dest bucketName can\'t be retrieved');

  const nFilename = source.fullFilePath.replace(/\//g, '_');
  let ffmpeg;
  try {
    [, ffmpeg] = await Promise.all([
      (async () => {
        const {Body: body} = await s3.send(new GetObjectCommand({
          Bucket: source.bucketName,
          Key: source.fullFilePath,
        }));

        if (body instanceof Readable) {
          await new Promise((resolve, reject) => {
            body.pipe(createWriteStream(`/tmp/${nFilename}`))
              .on('error', err => reject(err))
              .on('close', () => resolve(1));
          });

          log.info('written', nFilename);
        } else throw new NonRunnableErr('s3 stream is not Readable');
      })(),
      (async () => {
        const ffmpegInst = createFFmpeg({log: false});
        await ffmpegInst.load();
        return ffmpegInst;
      })(),
    ]);


    log.info('Converting...');
    const ts = +new Date();
    const inputMediaFile = `/tmp/${nFilename}`;
    const outputMediaFile = `/tmp/${dest.fileName}`;

    const outVirtualFile = await ffmpegProcess(ffmpeg, inputMediaFile);
    await fs.promises.writeFile(outputMediaFile, ffmpeg.FS('readFile', outVirtualFile));
    const duration = ((+new Date() - ts) / 1000) | 0;
    log.info(`Time to convert time in sec ${duration}`);

    await s3.send(new PutObjectCommand({
      Bucket: dest.bucketName,
      Key: dest.fullFilePath,
      Body: createReadStream(outputMediaFile),
      ContentType: contentType,
      Metadata: {
        source: sourcePath,
      },
    }));
    log.info('file uploaded to s3', dest.fullFilePath);

    await Promise.all([inputMediaFile, outputMediaFile].map(f => fs.promises.unlink(f)));

    return {
      duration,
    };
  } finally {
    if (ffmpeg) ffmpeg.exit();
  }
}
