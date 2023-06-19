import {TMsgAttrs} from './types';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import IrrecoverableErr from './irrecoverable_err';
import {Readable} from 'stream';
import { createWriteStream, createReadStream } from 'fs';
import * as fs from 'fs';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as log from './log';
import {getConnection} from './db';
import { MysqlError, PoolConnection } from 'mysql';
import { MediaProcessingState } from './api-contract';


export interface IProps extends TMsgAttrs {
  key: string;
  addExtensionInNewFile: 'mp4';
  action: 'CONVERT_TO_MP4';
  fullPath: string;
}

const s3 = new S3Client({ region: process.env.S3_REGION });

const ffmpeg = createFFmpeg({ log: false });
(async () => {
  await ffmpeg.load();
})();

export default async function (utProps: TMsgAttrs, deleteMsgOnFinish: () => Promise<any>) {
  let conn: PoolConnection | null = null;
  let qualifiedKey = '';
  try {
    const props = utProps as IProps;
    qualifiedKey = props.key;
    const sourcePath = props.fullPath.replace(/https?:\/\//, '');

    if (!qualifiedKey) throw new IrrecoverableErr('key not found');
    log.info('Received message to transcode video', qualifiedKey);

    conn = await getConnection();

    // value of sourcePath = fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/akashgoswami/usr/org/2/85c663479c9b42a89f26f96dd31529a6
    const sourcePathArr = sourcePath.split('/');
    const domain = sourcePathArr[0];
    const domainArr = domain.split('.'); // fable-tour-app-gamma.s3.ap-south-1.amazonaws.com
    const bucketName = domainArr.slice(0, domainArr.length - 4).join('.');
    if (!bucketName) throw new IrrecoverableErr('bucketName can\'t be retrieved');

    // Marking in db that the process is starting
    await new Promise((res, rej) => {
      conn!.query(
        'UPDATE media_processing_info SET processing_status = ? WHERE qualified_file_path = ?',
        [MediaProcessingState.InProcess, qualifiedKey],
        (err: MysqlError | null) => {
          if (err) rej(err);
          else res(1);
        });
    });

    const key = sourcePathArr.slice(1, sourcePathArr.length).join('/');
    const filepath = sourcePathArr.slice(1, sourcePathArr.length - 1).join('/');
    const filename = sourcePathArr.at(-1);

    // Get file from s3 -> save it in local file system
    const { Body: body } = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));

    const nFilename = key.replace(/\//g, '_');
    if (body instanceof Readable) {
      await new Promise((resolve, reject) => {
        body.pipe(createWriteStream(`/tmp/${nFilename}`))
          .on('error', err => reject(err))
          .on('close', () => resolve(1));
      });

      log.info('written', nFilename);
    } else throw new IrrecoverableErr('s3 stream is not Readable'); 

    // Transcode the file to mp4 container. The vodeo file needs to be encoded with mimeType: 'video/webm;codecs=h264'
    // so that ffmpeg could change the container easily and save it back to disk with extension
    log.info('Converting...');
    const ts = +new Date();
    const inputVideoFile = `/tmp/${nFilename}`;
    const outputVideoFile = `/tmp/${filename}.mp4`;
    ffmpeg.FS('writeFile', 'source.webm', await fetchFile(inputVideoFile));
    await ffmpeg.run('-i', 'source.webm', 'transcoded.mp4');
    await fs.promises.writeFile(outputVideoFile, ffmpeg.FS('readFile', 'transcoded.mp4'));
    const duration = ((+new Date() - ts) / 1000) | 0;
    log.info(`Time to convert time in sec ${duration}`);

    // The transcoded file is uploaded to s3
    // A new file is created with extension. The source file is kept in s3
    const fullS3Path = `${filepath}/${filename}.mp4`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: fullS3Path,
      Body: createReadStream(outputVideoFile),
      Metadata: {
        'Content-Type': 'video/mp4',
      },
    }));

    log.info('file uploaded to s3', fullS3Path);

    await Promise.all([inputVideoFile, outputVideoFile].map(f => fs.promises.unlink(f)));

    await new Promise((res, rej) => {
      conn!.query(
        'UPDATE media_processing_info SET processing_status = ?, postprocess_info = ? WHERE qualified_file_path = ?',
        [MediaProcessingState.Processed, JSON.stringify({ durationInSec: duration, fullS3Path }), qualifiedKey],
        (err: MysqlError | null) => {
          if (err) rej(err);
          else res(1);
        });
    });

    await deleteMsgOnFinish();
  } catch (e) {
    if (qualifiedKey && conn) {
      await new Promise((res, rej) => {
        conn!.query(
          'UPDATE media_processing_info SET processing_status = ?, failure_reason = ? WHERE qualified_file_path = ?',
          [MediaProcessingState.Failed, (e as Error).message, qualifiedKey],
          (err: MysqlError | null) => {
            if (err) rej(err);
            else res(1);
          });
      });
    }

    log.err((e as Error).message);
    if (e instanceof IrrecoverableErr) {
      await deleteMsgOnFinish();
    }
    // don't throw
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
