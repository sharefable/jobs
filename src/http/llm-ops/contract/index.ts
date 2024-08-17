/* This file is created in jobs and via gen it's distributed to other systems. */
/* Only update this file in jobs. */

import { MessageParam } from '@anthropic-ai/sdk/resources';

export interface LLMOpsBase {
  v: number;
  type: 'create_demo' | 'create_demo_router';
  model: 'default';
  thread: string;
  entityId?: number;
}

export interface RouterForTypeOfDemoCreation extends LLMOpsBase {
  v: 1;
  type: 'create_demo_router';
  user_payload: {
    demo_objective: string;
  }
}

export interface CreateNewDemoV1 extends LLMOpsBase {
  v: 1;
  type: 'create_demo';
  user_payload: {
    usecase: 'marketing' | 'product' | 'step-by-step-guide';
    totalBatch: number;
    currentBatch: number;
    product_details: string,
    demo_objective: string;
    refsForMMV: string[];
  }
}

export interface LLMResp {
  err: {
    stack?: string;
    isAnthropcErr?: boolean;
    status?: number;
    name?: string;
    headers?: any
  } | null;
  data: MessageParam | null;
}
