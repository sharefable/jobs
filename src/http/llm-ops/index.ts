import {Express, Request, Response} from 'express';
import { LLMResp, LLMOpsBase, RouterForTypeOfDemoCreation, CreateNewDemoV1, ThemeForGuideV1, RefForMMV, PostProcessDemoV1 } from './contract';
import { anthropic } from './anthropic';
import { req as api } from '../../api';
import { ApiResp, ErrorCode, LLMOps, LLMOpsStatus, ReqNewLLMRun, ReqUpdateLLMRun, ResponseStatus } from 'api-contract';
import {ImageBlockParam, MessageParam, TextBlockParam, Usage} from '@anthropic-ai/sdk/resources';
import PROMPTS, {PromptDetails, normalizeWhitespace} from './prompts';
import {APIError} from '@anthropic-ai/sdk';
import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {Readable} from 'stream';
import { captureException } from '@sentry/node';

export const s3 = new S3Client({ region: 'ap-south-1' });
const S3_BUCKET = 'pvt-mics';

interface LLMOpsData {
  ip: LLMOpsBase;
  systemPrompt: any;
  noOfPrevMsgsAddedInThread: number;
  messages: MessageParam[];
  err?: any;
  opMeta: any;
}

async function getImageBase64DataFromUrl(req: Request, url: string): Promise<string | null> {
  if (url.startsWith('/')) url = url.substring(1);
  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: url,
    };
    const {Body: body0} = await s3.send(new GetObjectCommand(params));

    const chunks = [];
    const nBody = body0 as Readable;
    for await (const bodyChunk of nBody) {
      chunks.push(Buffer.from(bodyChunk));
    }
    const base64Data = Buffer.concat(chunks).toString('base64');
    return base64Data;
  } catch (error) {
    req.log.fatal(`Error while getting base64 data from s3 url ${url}: ${(error as Error).stack}`);
    return null;
  }
}

async function getImgsForPrompt(req: Request, refsForMMV: RefForMMV[]) {
  const msgs: MessageParam['content'] = (await Promise.all(refsForMMV.map(
    async img => getImageBase64DataFromUrl(req, img.url).then(base64Data => ({
      ...img,
      data:base64Data,
    })),
  ))).flatMap(img => [{
    type: 'text',
    text: `Image Id: ${img.id}${img.moreInfo ? `\n\n${img.moreInfo}` : ''}`,
  }, {
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.type ?? 'image/png',
      data: img.data,
    },
  }]) as (TextBlockParam | ImageBlockParam)[];

  const msgsReducted: any = refsForMMV.flatMap(img => [{
    type: 'text',
    text: `Image Id: ${img.id}`,
  }, {
    type: 'image',
    __type: 'image-reducted',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: ['reducted'],
      __source: `s3://${S3_BUCKET}/${img.url}`,
    },
  }]);

  return {
    msgs,
    msgsReducted,
  };
}

// TODO before appending existing msgs -- check for prompt caching
async function callLLM(req: Request, prompt: PromptDetails, options: {
  // This is saved in db, when base64 data is sent to llm, we don't store that in db, we store the file location instead
  userMsgRawReducted?: any
  userMsgRaw: MessageParam['content']
}): Promise<LLMResp> {
  const body = req.body as LLMOpsBase;

  const opsData = {} as LLMOpsData;
  opsData.ip = body;
  opsData.systemPrompt = prompt;
  opsData.messages = [];
  const run = await api<ReqNewLLMRun, LLMOps>('/f/llmrun', 'POST', {
    threadId: body.thread,
    entityId: body.entityId,
    data: opsData,
    meta: {},
  }, req.headers.authorization as string);


  let existingThreadMsgs: MessageParam[] = [];
  let noOfPrevMsgsAddedInThread = 0;
  if (PROMPTS.RouterNewDemo.shouldAppendThreadMsgs) {
    const existingRuns = await api<null, LLMOps[]>(
      `/f/llmruns/${encodeURIComponent(body.thread)}`,
      'GET',
      null,
      req.headers.authorization as string,
    );
    existingThreadMsgs = existingRuns
      .filter(existingRun => existingRun.status === LLMOpsStatus.Successful)
      .flatMap(existingRun => (existingRun.data as LLMOpsData).messages);
    noOfPrevMsgsAddedInThread = existingThreadMsgs.length;
  }

  const msgLog: MessageParam[] = [];
  const userMessage: MessageParam = {
    role: 'user',
    content: options.userMsgRaw,
  };
  msgLog.push({
    role: 'user',
    content: options.userMsgRawReducted || options.userMsgRaw,
  });

  const llmResp: LLMResp = {
    err: null,
    data: null,
  };
  const outputMeta = { } as {
    usage: Usage;
    stopReason: string | null;
    dtInSec: number;
  };
  try {
    const t1 = +new Date();
    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      tools: prompt.fns,
      system: prompt.system,
      temperature: 0.5,
      tool_choice: {
        type: 'any',
      },
      messages: [
        ...existingThreadMsgs,
        userMessage,
      ],
    });

    llmResp.data = {
      role: msg.role,
      content: msg.content,
    };
    msgLog.push(llmResp.data);
    outputMeta.usage = msg.usage;
    outputMeta.stopReason = msg.stop_reason;
    outputMeta.dtInSec = Math.ceil((+new Date() - t1) / 1000);
  } catch (e) {
    llmResp.err = {
      stack: (e as Error).stack,
    };
    req.log.fatal(`LLM origin failed. ${llmResp.err.stack}`);

    if (e instanceof APIError) {
      req.log.fatal(`Anthropic error. [${e.status}] ${e.name} : ${JSON.stringify(e.headers || {}, null, 2)}`);
      llmResp.err.status = e.status;
      llmResp.err.name = e.name;
      llmResp.err.headers = e.headers;
    }
  }

  await api<ReqUpdateLLMRun, LLMOps>('/f/updatellmrun', 'POST', {
    id: run.id,
    status: llmResp.err ? LLMOpsStatus.Failure : LLMOpsStatus.Successful,
    data: {
      ...run.data,
      noOfPrevMsgsAddedInThread,
      messages: msgLog,
      err: llmResp.err,
      opMeta: outputMeta,
    },
  },
  req.headers.authorization as string);

  return llmResp;
}

async function createDemoRouter(req: Request) {
  const body = req.body as RouterForTypeOfDemoCreation;
  return callLLM(
    req,
    PROMPTS.RouterNewDemo,
    {
      userMsgRaw: `
        <product-details>
          ${body.user_payload.product_details}
        </product_details>

        <demo-objective>
          ${body.user_payload.demo_objective}
        </demo-objective>
      `,
    },
  );
}

async function createDemoPerUsecase(req: Request) {
  const body = req.body as CreateNewDemoV1;
  let prompt: PromptDetails;
  if (body.user_payload.usecase === 'marketing') prompt = PROMPTS.CreateDemoMarketing;
  if (body.user_payload.usecase === 'step-by-step-guide')  prompt = PROMPTS.CreateDemoStepByStep;
  if (body.user_payload.usecase === 'product')  prompt = PROMPTS.CreateDemoStepByStep;
  else prompt = PROMPTS.CreateDemoMarketing;

  const { msgs, msgsReducted } = await getImgsForPrompt(req, body.user_payload.refsForMMV);

  msgs.push({
    type: 'text',
    text: normalizeWhitespace(`
      <product-details>
        ${body.user_payload.product_details}
      </product-details>

      <demo-objective>
        ${body.user_payload.demo_objective}
      </demo-objective>

      ${body.user_payload.demoState && (`
        <demo-state>
          ${body.user_payload.demoState}
        </demo-state>
      `)}
    `),
  });
  msgsReducted.push(msgs.at(-1));

  return callLLM(
    req,
    prompt,
    {
      userMsgRawReducted: msgsReducted,
      userMsgRaw: msgs,
    },
  );
}

async function suggestTheme(req: Request)  {
  const body = req.body as ThemeForGuideV1;
  const prompt: PromptDetails = PROMPTS.SuggestGuideTheme;

  const { msgs, msgsReducted } = await getImgsForPrompt(req, body.user_payload.refsForMMV);

  msgs.push({
    type: 'text',
    text: normalizeWhitespace(`
      <theme-objective>
        ${body.user_payload.theme_objective}
      </theme-objective>
    `),
  });

  return callLLM(
    req,
    prompt,
    {
      userMsgRawReducted: msgsReducted,
      userMsgRaw: msgs,
    },
  );
}

async function postProcess(req: Request) {
  const body = req.body as PostProcessDemoV1;
  return callLLM(
    req,
    PROMPTS.PostProcessDemo,
    {
      userMsgRaw: `
        <product-details>
          ${body.user_payload.product_details}
        </product_details>

        <demo-objective>
          ${body.user_payload.demo_objective}
        </demo-objective>

        <module-recommendations>
          ${body.user_payload.module_recommendations}
        </module-recommendations>

        <demo-state>
          ${body.user_payload.demo_state}
        </demo-state>
      `,
    },
  );
}

export default function addLlmOpsHttpListeners(app: Express) {
  app.post('/v1/f/llmops', async (req: Request, res: Response) => {
    const body = req.body as LLMOpsBase;

    let llmResp: LLMResp;
    try {
      if (body.type === 'create_demo_router') llmResp = await createDemoRouter(req);
      else if (body.type === 'create_demo_per_usecase') llmResp = await createDemoPerUsecase(req);
      else if (body.type === 'theme_suggestion_for_guides') llmResp = await suggestTheme(req);
      else if (body.type === 'post_process_demo') llmResp = await postProcess(req);
      else
        return res.status(404).json({
          status: ResponseStatus.Failure,
          data: null,
          errStr: 'Handler not found',
          errCode: ErrorCode.NotFound,
        } as ApiResp<null>);
    } catch (e) {
      req.log.fatal(`Error while calling llm handler. ${(e as Error).stack}`);
      captureException(e);
      return res.status(500).json({
        status: ResponseStatus.Failure,
        data: null,
        errStr: 'Error from handler',
      } as ApiResp<null>);
    }

    if (llmResp.err) {
      captureException(new Error(`LLM response failed. ${JSON.stringify(llmResp.err)}`));
      return res.status(llmResp.err.status!).json({
        status: ResponseStatus.Failure,
        data: llmResp,
        errStr: llmResp.err.name,
      } as ApiResp<LLMResp>);
    } else {
      return res.status(200).json({
        status: ResponseStatus.Success,
        data: llmResp,
      } as ApiResp<LLMResp>);
    }
  });
}
