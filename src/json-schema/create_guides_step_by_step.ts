/**
  * Create a step by step interactive demo by generating the text and properties of guides given the product details and demo objective
  */
export interface create_guides_step_by_step {
  /**
    * Ordered list of guide messages with it's properties to create the demo.
    */
  items: Array<
  /**
    * One single guide message and it's property
    */
  {
    /**
     *  Generated text of annotation / guides with rich formatting. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same. If key is present, richText must be present. This key can be an empty string or undefined if the guide is required to be hidden. This happens when the demo only shows clickable element but not the guide.
     */
    richText?: string;

    /**
      * Id of screen on which the annotation should be displayed. User would pass this value along side input image.
      */
    screenId: number;
    /**
      * Border color of selected candidate element from the images uploaded.
      */
    element: 'black' | 'red' | 'blue' | 'cyan';
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. Choose a custom text for the CTA to make the demo engaging. If the guide is hidden by making text value nullish, then this value is discarded.
      */
    nextButtonText?: string;
    /**
      * true if a screen should be skipped as it does not add any additional value to the demo. If skip is true then text, element and typeofGuide keys can have any valid values. Value of these keys are not used and will be discarded.
      */
    skip: boolean;
  }
  >;
}
