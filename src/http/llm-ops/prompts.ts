import { Tool } from '@anthropic-ai/sdk/resources';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as createGuidesRouterJson from '../../json-schema/out/create_guides_router.json';
import * as createGuidesMarketing from '../../json-schema/out/create_guides_marketing.json';
import * as createGuidesStepbystep from '../../json-schema/out/create_guides_step_by_step.json';
import * as suggestGuideTheme from '../../json-schema/out/suggest_guide_theme.json';
import * as fallback from '../../json-schema/out/fallback.json';

export function normalizeWhitespace(str: string): string {
  return str.trim().split('\n').map(l => l.trim()).join('\n');
}

export interface PromptDetails {
  system: string;
  shouldAppendThreadMsgs: boolean,
  fns: Array<Tool>
}


const PROMPTS: Record<string, PromptDetails> = {
  RouterNewDemo: {
    system: readFileSync(join(__dirname, './prompts/new-demo-router.md'), 'utf8'),
    shouldAppendThreadMsgs: false,
    fns: [{
      name: 'create_guides_router',
      description: createGuidesRouterJson.definitions.create_guides_router.description,
      input_schema: {
        type: 'object',
        properties: createGuidesRouterJson.definitions.create_guides_router.properties,
      },
    }],
  },
  CreateDemoMarketing: {
    system: readFileSync(join(__dirname, './prompts/new-demo-marketing.md'), 'utf8'),
    shouldAppendThreadMsgs: false,
    fns: [{
      name: 'create_guides_marketing',
      description: createGuidesMarketing.definitions.create_guides_marketing.description,
      input_schema: {
        type: 'object',
        properties: createGuidesMarketing.definitions.create_guides_marketing.properties,
      },
    }],
  },
  CreateDemoStepByStep: {
    system: readFileSync(join(__dirname, './prompts/new-demo-marketing.md'), 'utf8'),
    shouldAppendThreadMsgs: false,
    fns: [{
      name: 'create_guides_marketing',
      description: createGuidesStepbystep.definitions.create_guides_step_by_step.description,
      input_schema: {
        type: 'object',
        properties: createGuidesStepbystep.definitions.create_guides_step_by_step.properties,
      },
    }],
  },
  SuggestGuideTheme: {
    system: readFileSync(join(__dirname, './prompts/guide-theme.md'), 'utf8'),
    shouldAppendThreadMsgs: false,
    fns: [{
      name: 'create_guides_marketing',
      description: suggestGuideTheme.definitions.suggest_guide_theme.description,
      input_schema: {
        type: 'object',
        properties: suggestGuideTheme.definitions.suggest_guide_theme.properties,
      },
    }],
  },
};

export default PROMPTS;
