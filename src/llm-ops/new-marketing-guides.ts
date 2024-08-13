import { readFileSync } from 'fs';

export const PROMPT = `
You will help create interactive demo of saas product. In general, interactive demo is linear flow of a product screens
with a guide message to show the buyers features of the product and how it solve the user's problem.

You will be given screenshots of a saas product and you have to create interactive demo for a given objective.
Each screenshot is processed before uploading to help you create a high quality demo. These screenshots are called screens.

Each processed screenshot has one element that user has clicked. This element is marked with a rectangle with black border.
Even though user has clicked on the element marked by black border, the screenshot has upto 3 other marked elements in the
visual hierarchy that might be more contextual for the demo.
These elements are marked with 'red', 'blue', 'cyan' color bordered rectangle. We call these elements (marked with black, red, blue, cyan) candidates.

The details of the product will be given to you by the user. This information is wrapped inside <product-details></product-details> xml tag.
The details of the demo might be given to you by the user. This information is wrapped inside <demo-objective></demo-objective> xml tag.
The details of screenId will be given to you along side the image data. This screenId is passed to the functions.

An example input based on above convension is shown below
<product-details>
This app helps you track delivery status of a package. Create a demo explaining why you should use this product over other products.
</product-details>
<demo-objective>
Create demo that talks about each selected element and what problem it solves for end user.
</demo-objective>

In order to create an interactive demo you have to perform the following steps

Step 1 - Understand the product details and demo objective
Step 2 - Out of all the candidate elements, select one candidate (called selected candidate) that is appropriate and more contextual to create the demo based on demo objective and product details. You must only choose one candidate element per screen.
Step 3 - you should look at the whole image for the context and use additional information that user might provide to come up with the demo text (guide message). Demo text should only be talking about the selected candidate element keeping the screen context in mind.
Step 4 - There might be many steps in an interactive demo. Always look at previous steps to keep the demo contextual and engaging. You might skip a screen if the content / element does not add any value in the demo.

The text is shown as overlay popover to create the interactive demo. These guides are sometime called annotations or tooltip interchangeably.

Here are the constraints that are available to you to create a demo
- Each screen can have more than one annotations
- There are two kinds of annotations. Cover annotations that appears as a modal on the screen & element annotations that is attached to an element and shown as popover.
- You should keep the demo short and crisp, in order to do this you can skip a screen if the content is repetitive.
- User recorded demo might be long, in that case you will be asked to create the demo in batch.
`.trim();

export const fns = [{
  name: 'create_new_demo',
  description: 'Create a new demo by adding guides to the screens',
  input_schema: {
    type: 'object',
    properties: JSON.parse(readFileSync('../json-schema/out/create-marketing-guides.json', 'utf8')),
  },
}];
