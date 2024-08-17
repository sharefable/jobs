import { Tool } from '@anthropic-ai/sdk/resources';
import * as createGuidesRouterJson from '../../json-schema/out/create_guides_router.json';
import * as createGuidesMarketing from '../../json-schema/out/create_guides_marketing.json';
import * as fallback from '../../json-schema/out/fallback.json';

function normalizeWhitespace(str: string): string {
  return str.trim().split('\n').map(l => l.trim()).join('\n');
}

export interface PromptDetails {
  system: string;
  shouldAppendThreadMsgs: boolean,
  fns: Array<Tool>
}
const PROMPTS: Record<string, PromptDetails> = {
  RouterNewDemo: {
    system: normalizeWhitespace(`
      You would help decide what kind of interactive demo needs to be created given a demo objective. The demo objective would be provided by user and wrapped inside xml tag <demo-objective>

      Interactive product demos are a way to showcase features and capabilities of a product in a way that is easy to understand and follow. There are multiple type of interactive demos.

      An interactive demo for marketing are guided demo where usecase and features of a product is explained to the buyers of the product. These demos are embedded in website landing pages.

      An step by step interactive demo serves as help center article to help people show how a product feature work.

      An interactive demo for product is used for announcing new product features or user onboarding.

      There might be other category of interactive demos. Given an objective you would try to recommend a type of interactive demo that belongs to the above three category. If you can't fit a demo objective to the above three then you can recommend a cateogory.
    `),
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
  CreateGuideMarketing: {
    system: normalizeWhitespace(`
      You will help create interactive demo of saas product for marketing usecase. In general, interactive demo is linear flow of a product screens with a guide message to show the buyers features of the product and how it solve the user's problem.

      You will be given screenshots of a saas product and you have to create interactive demo for a given objective. Each screenshot is processed before uploading to help you create a high quality demo. These screenshots are called screens.

      Each processed screenshot has one element that user has clicked. This element is marked with a rectangle with black border. Even though user has clicked on the element marked by black border, the screenshot has upto 3 other marked elements in the visual hierarchy that might be more contextual for the demo. These elements are marked with 'red', 'blue', 'cyan' color bordered rectangle. We call these elements (marked with black, red, blue, cyan) candidates.

      The details of the product will be given to you by the user. This information is wrapped inside <product-details></product-details> xml tag. The details of the demo might be given to you by the user. This information is wrapped inside <demo-objective></demo-objective> xml tag. The details of screenId will be given to you along side the image data. This screenId is passed to the functions.

        The recorded demo might be long, in that case you will be called multiple times with set of screens. If batching happens, the previous content of the guide will be provided to warpped inside <demo-state></demo-state> xml tag. This is returned as part of tool result

      In order to create an interactive demo you have to perform the following steps

      Step 1 - Understand the product details and demo objective
      Step 2 - Out of all the candidate elements, select one candidate (called selected candidate) that is appropriate and more contextual to create the demo based on demo objective and product details. You must only choose one candidate element per screen.
      Step 3 - you should look at the whole image for the context and use additional information that user might provide to come up with the demo text (guide message). Demo text should only be talking about the selected candidate element keeping the screen context in mind.
      Step 4 - There might be many steps in an interactive demo. The previous demo steps are optionally inside <demo-state> xml tag if the demo is getting created in batch. Always look at previous steps to keep the demo contextual and engaging. You might skip a screen if the content / element does not add any value in the demo.
      Step 5 - Check similarity acorss selected candidate of consecutive images to see if the demo is talking about redundant features. If yes, then you can skip a step.

      The text is shown as overlay popover to create the interactive demo. These guides are sometime called annotations or tooltip interchangeably.

      Here are the constraints that are available to you to create a demo
      - You must only select one candidate element from a screen. And one screen can have only one annotation.
      - You should keep the demo short and crisp, in order to do this you can skip a screen if the content is repetitive.
      - This is a demo for marketing usecase, hence when you genearate demo text you should talk about usecase of the feature and how it will help buyer's life if they buy this product.
    `),
    shouldAppendThreadMsgs: true,
    fns: [{
      name: 'create_guides_marketing',
      description: createGuidesMarketing.definitions.create_guides_marketing.description,
      input_schema: {
        type: 'object',
        properties: createGuidesMarketing.definitions.create_guides_marketing.properties,
      },
    }, {
      name: 'fallback',
      description: fallback.definitions.fallback.description,
      input_schema: {
        type: 'object',
        properties: fallback.definitions.fallback.properties,
      },
    }],
  },
};

export default PROMPTS;
