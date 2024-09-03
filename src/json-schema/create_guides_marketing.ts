/**
  * Create a interactive demo for marketing by generating the text and properties of guides given the product details and demo objective
  */
export interface create_guides_marketing {
  /**
    * Ordered list of guide messages with it's properties to create the demo.
    */
  items: Array<
  /**
    * One single guide message and it's property
    */
  {
    /**
     *  Generated text of annotation / guides with rich formatting. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same.
     */
    richText: string;

    /**
      * Border color of selected candidate element from the images uploaded.
      */
    element: 'cyan' | 'red' | 'blue' | 'yellow';
    /**
      * Id of screen on which the annotation should be displayed. User would pass this value along side input image.
      */
    screenId: number;
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. That's how user progresses through the demo. The text of this next CTA by defualt is Next. Configure the next button text to make the demo more engaging.
      */
    nextButtonText?: string;
    /**
      * true if a screen should be skipped as it does not add any additional value to the demo. If skip is true then text, element and typeofGuide keys can have any valid values. Value of these keys are not used and will be discarded.
      */
    skip: boolean;
  }
  >;
}
