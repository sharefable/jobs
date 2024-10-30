import {Express, Request, Response} from 'express';
import {ReqGenerateAudio, RespGenerateAudio} from './contract';
import CachedData from '../cached-data';
import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {Readable} from 'stream';
import {captureException} from '@sentry/node';
import {ApiResp, ReqDeductCredit, RespUploadUrl, ResponseStatus, SubscriptionCreditType} from '../api-contract';
import Handlebars from 'handlebars';
import OpenAI from 'openai';
import { req as api } from '../api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY as string,
});

interface AnnotationConfig extends Record<string, any> {
  displayText: string;
  refId: string;
} 
type AnnotationMap = Record<string, AnnotationConfig>;

export const s3 = new S3Client({ region: process.env.AWS_ASSET_FILE_S3_BUCKET_REGION });

const cache = new CachedData<AnnotationMap>(async (fileKey: string) => {
  const {Body: body0} = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_ASSET_FILE_S3_BUCKET as string,
    Key: fileKey,
  }));

  const chunks: Buffer[] = [];
  const nBody = body0 as Readable;
  for await (const bodyChunk of nBody) {
    chunks.push(Buffer.from(bodyChunk));
  }
  const fileStr = Buffer.concat(chunks).toString('utf-8');
  const fileJson = JSON.parse(fileStr);

  // We want to convert the tour/index.json to a key value pair for easy lookup
  const formattedData: AnnotationMap = {};
  for (const [screenId, anns] of Object.entries(fileJson.entities)) {
    for (const ann of Object.values((anns as any).annotations)) {
      formattedData[`${screenId}/${(ann as AnnotationConfig).refId}`] = ann as AnnotationConfig;
    }
  }
  return formattedData;
});

// TODO don't perform if quilly credit is not enough
export default function addHttpListeners(app: Express) {
  app.post('/v1/f/aud/gen', async (req: Request, res: Response) => {
    const body = req.body as ReqGenerateAudio;
    try {
      const anns = await cache.get(body.indexUri, body.invalid_key, req.log.info);
      const ann = anns.data[body.entityUri];
      if (!ann) throw new Error('Incorrect entity');
      if (!ann.displayText) throw new Error('Display text is not present');

      const displayText = ann.displayText;
      const gen = Handlebars.compile(displayText);
      const generatedText = gen(body.vars);

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: body.voice,
        input: generatedText,
      });
      const contentType = 'audio/mpeg';
      const buffer = await mp3.arrayBuffer();
      const mediaBuffer = new Uint8Array(buffer);

      // get presigned url
      const presigned = await api<null, RespUploadUrl>(
        `/f/getuploadlink?te=${btoa(contentType)}`,
        'GET',
        null,
        req.headers.authorization as string,
      );

      const uploadedMediaSrc = presigned.url.split('?')[0];
      await fetch(presigned.url, {
        method: 'PUT',
        body: mediaBuffer,
        headers: { 'Content-Type': contentType },
      });

      const charLen = displayText.length;
      const per1kChar = Math.ceil(charLen / 1000);
      api<ReqDeductCredit, null>('/f/deductcredit', 'POST', {
        // https://sharefable.slack.com/archives/C04998WM23F/p1729171341630929?thread_ts=1729170927.545179&cid=C04998WM23F
        deductBy: Math.ceil(per1kChar * 0.5),
        creditType: SubscriptionCreditType.AI_CREDIT,
      },
      req.headers.authorization as string);

      return res.status(200).send({
        status: ResponseStatus.Success,
        data: {
          url: uploadedMediaSrc,
          mediaType: 'audio/mpeg',
        },
      } as ApiResp<RespGenerateAudio>);
    } catch(e) {
      req.log.error(`Error while getting data for ${body.entityUri} from cache. Msg=[${(e as Error).message}]`);
      req.log.error((e as Error).stack);
      captureException(e);
      return res.status(500).json({
        status: ResponseStatus.Failure,
        errStr: 'Can\'t generate audio',
      } as ApiResp<any>);
    }
  });
}
