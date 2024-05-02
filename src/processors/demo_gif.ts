import {deepcopy, getS3FileLocationFromURI} from '../utils';
import {s3} from '../singletons';
import { rmSync, existsSync, mkdirSync, createReadStream } from 'fs';
import {GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {Readable} from 'stream';
import fs, {createWriteStream} from 'fs';
import { v4 as uuid } from 'uuid';
import * as log from '../log';
import gm from 'gm';
import {CreateGifJobInfo} from '../api-contract';
import {TMsgAttrs} from '../types';


type IProps = CreateGifJobInfo & TMsgAttrs;

export default async function(utProps: TMsgAttrs): Promise<object> {
  const props = utProps as IProps;
  const start = +new Date();

  const tmpDir = `/tmp/f/${uuid()}`;
  log.info('Temp dir for gif processing', tmpDir);
  try {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, {recursive: true});

    const manifestSource = getS3FileLocationFromURI(props.manifestFilePath);
    
    const {Body: body0} = await s3.send(new GetObjectCommand({
      Bucket: manifestSource.bucketName,
      Key: manifestSource.fullFilePath,
    }));


    const chunks = [];
    const nBody = body0 as Readable;
    for await (const bodyChunk of nBody) {
      chunks.push(Buffer.from(bodyChunk));
    }
    const manifestStr = Buffer.concat(chunks).toString('utf-8');
    const manifest = JSON.parse(manifestStr);

    const screenAssets = (manifest.screenAssets || []);
    const thumbnails = screenAssets.map((asset: any) => asset.thumbnail).filter((_: string) => _);

    const ps: Array<Promise<any>> = [];
    for (let i = 0; i < thumbnails.length; i++) {
      ps.push(
        new Promise((resolve, reject) => {
          const mgSource = getS3FileLocationFromURI(thumbnails[i]);
          s3.send(new GetObjectCommand({
            Bucket: mgSource.bucketName,
            Key: mgSource.fullFilePath,
          })).then((resp) => {
            const body = resp.Body as Readable;
            const fileName = `${tmpDir}/thumb_${i}`;
            body.pipe(createWriteStream(fileName))
              .on('error', err => reject(err))
              .on('close', () => resolve(fileName));
          });
        }),
      );
    }

    let files = await Promise.all(ps);

    // background mask
    await new Promise((resolve, reject) => {
      gm(1440, 810)
        .define('gradient:direction=West')
        .out('gradient:#537895-#09203F')
        .write(`${tmpDir}/bg.png`, function(err: any) {
          if (err) reject(err);
          else resolve(1);
        });
    });

    // get original image sizes
    const sizes: Record<string, [number, number, number]> = {};
    const sizePs = [];
    for (const img of files) {
      const p = new Promise((resolve) => {
        gm(img)
          .size((err, size) => {
            if (!err) {
              sizes[img] = [size.width, size.height, size.width/size.height];
            }
            resolve(1);
          });
      });
      sizePs.push(p);
    }
    await Promise.all(sizePs);

    // scale down imgs
    const resizePs = [];
    for (const img of files) {
      const imgName = img.split('/').at(-1);
      const path = `${tmpDir}/${imgName}.png`;
      const p = new Promise((resolve, reject) => {
        const w = 1200;
        const h = 675;
        const ow = ( sizes[img] && sizes[img][0] ) ?? Number.POSITIVE_INFINITY;
        const ar = (sizes[img] && sizes[img][2]) ?? (16/9);
        const scaledW = Math.min(ow, w);
        const scaledH = (scaledW / ar);
        gm(img)
          .command('convert')
          .background('#000000ff')
          .resize(scaledW, scaledH)
          .in('-gravity', 'center')
          .extent(w, h)
          .write(path, function(err: any) {
            if (err) reject(err);
            else resolve(path);
          });
      });
      resizePs.push(p);
    }
    files = await Promise.all(resizePs);

    // add backdrop
    const finalPs: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const gmInst2: gm.State = (gm as any)();
      const path = `${tmpDir}/out_${i}.png`;
      const p = new Promise((resolve: (path: string) => void, reject) => {
        gmInst2
          .command('composite')
          .geometry('+120+68')
          .in(files[i])
          .in(`${tmpDir}/bg.png`)
          .write(path, function(err: any) {
            if (err) reject(err);
            else resolve(path);
          });
      });

      finalPs.push(p);
    }

    log.info('Creating gif');
    const finalFiles: string[] = await Promise.all(finalPs);
    const gmInstFinal: gm.State = (gm as any)();
    for (const file of finalFiles) {
      gmInstFinal.in(file);
    }
    const gifPath = `${tmpDir}/demo.gif`;
    await new Promise((resolve, reject) => {
      gmInstFinal.delay(150) // 1.5 seconds
        .write(gifPath, function(err: any){
          if (err) reject(err);
          else resolve(1);
        });
    });
    
    log.info('Uploading gif to ', props.gifFilePath);
    const dest = getS3FileLocationFromURI(props.gifFilePath);
    await s3.send(new PutObjectCommand({
      Bucket: dest.bucketName,
      Key: dest.fullFilePath,
      Body: createReadStream(gifPath),
      ContentType: 'image/gif',
    }));

    const updatedInfo: CreateGifJobInfo = deepcopy<CreateGifJobInfo>(props);
    updatedInfo.duration = `${Math.ceil((+new Date() - start) / 1000)}s`;
    return updatedInfo;
  }  finally {
    log.info('Deleting temp dir', tmpDir);
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      log.err('Can\'t delete temp dir', tmpDir);
    }
  }
}
