import {Express, Request, Response} from 'express';
import { LLMResp, LLMOpsBase, RouterForTypeOfDemoCreation } from './contract';
import { anthropic } from './anthropic';
import { req as api } from '../../api';
import { ApiResp, ErrorCode, LLMOps, LLMOpsStatus, ReqNewLLMRun, ReqUpdateLLMRun, ResponseStatus } from 'api-contract';
import {MessageParam, Usage} from '@anthropic-ai/sdk/resources';
import PROMPTS, {PromptDetails} from './prompts';
import {APIError} from '@anthropic-ai/sdk';

interface LLMOpsData {
  ip: LLMOpsBase;
  systemPrompt: any;
  noOfPrevMsgsAddedInThread: number;
  messages: MessageParam[];
  err?: any;
  opMeta: any;
}

async function callLLM(req: Request, prompt: PromptDetails, options: {
  userMsgRaw: string
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
  msgLog.push(userMessage);

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
      userMsgRaw: `<demo-objective>${body.user_payload.demo_objective}</demo-objective>`,
    },
  );
}

export default function addLlmOpsHttpListeners(app: Express) {
  app.post('/v1/f/llmops', async (req: Request, res: Response) => {
    const body = req.body as LLMOpsBase;

    let llmResp: LLMResp;
    try {
      if (body.type === 'create_demo_router') llmResp = await createDemoRouter(req);
      // if (body.type === 'create_demo') createNewDemo(req);
      else
        return res.status(404).json({
          status: ResponseStatus.Failure,
          data: null,
          errStr: 'Handler not found',
          errCode: ErrorCode.NotFound,
        } as ApiResp<null>);
    } catch (e) {
      req.log.fatal(`Error while calling llm handler. ${(e as Error).stack}`);
      return res.status(500).json({
        status: ResponseStatus.Failure,
        data: null,
        errStr: 'Error from handler',
      } as ApiResp<null>);
    }

    if (llmResp.err) {
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
