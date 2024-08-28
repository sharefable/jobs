/**
  * Get demo metadata from the uploaded screens. Prompt would mention what metadata are required. You have to populate the relevant fields based on the prompt.
  */
export interface demo_metadata {
  /**
    * Product has features that help users solve a problem. Look at all the screens and figure out what the product enables for the end user to achieve. The perspective of this text should be from product end. product_enablement contains detailed list of such enablement. This data is passed to subsequent llm call.
    */
  product_enablement?: string;
  /**
    * User intent based on the screens that are uploaded. This text should be details of what user is trying to achieve based on the uploaded screens.
    */
  user_intent?: string;
}
