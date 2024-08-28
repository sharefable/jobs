/* This file is created in jobs and via gen it's distributed to other systems. */
/* Only update this file in jobs. */

import { MessageParam } from '@anthropic-ai/sdk/resources';

export interface LLMOpsBase {
  v: number;
  type: 'create_demo_per_usecase'
  | 'demo_metadata'
  | 'create_demo_router'
  | 'theme_suggestion_for_guides'
  | 'post_process_demo';
  model: 'default';
  thread: string;
  entityId?: number;
}

export interface RouterForTypeOfDemoCreation extends LLMOpsBase {
  v: 1;
  type: 'create_demo_router';
  user_payload: {
    demo_objective: string;
    product_details: string;
  }
}

export interface DemoMetadata extends LLMOpsBase {
  v: 1;
  type: 'demo_metadata';
  user_payload: {
    demo_objective: string;
    product_details: string;
    refsForMMV: Array<RefForMMV>;
    metReq: 'user_intent' | 'product_enablement'
  }
}

export interface RefForMMV {
  id: number;
  moreInfo?: string;
  url: string;
  type?: 'image/png' | 'image/jpeg' | undefined;
  // TODO write is as part of moreInfo itself
  // isFromPreviousBatch?: boolean;
  data?: string;
}

export interface CreateNewDemoV1 extends LLMOpsBase {
  v: 1;
  type: 'create_demo_per_usecase';
  user_payload: {
    usecase: 'marketing' | 'product' | 'step-by-step-guide';
    totalBatch: number;
    currentBatch: number;
    demoState?: string;
    req: string;
    product_details: string,
    demo_objective: string;
    functional_requirement?: string;
    refsForMMV: Array<RefForMMV>;
  }
}

export interface ThemeForGuideV1 extends LLMOpsBase {
  v: 1;
  type: 'theme_suggestion_for_guides';
  user_payload: {
    theme_objective: string;
    refsForMMV: Array<RefForMMV>;
  }
}

export interface PostProcessDemoV1 extends LLMOpsBase {
  v: 1;
  type: 'post_process_demo';
  user_payload: {
    demo_state: string;
    module_recommendations: string;
    product_details: string,
    demo_objective: string;
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
