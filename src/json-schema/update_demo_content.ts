/**
  * Update content of an interactive demo by updating the text and nextButtonText of an annotation / guide
  */
export interface update_demo_content {
  /**
      * Ordered list of guide/annotation messages with it's properties to create the demo.
      */
  items: Array<
  /**
      * One single guide message and it's property
      */
  {
    /**
       *  Generated text of annotation / guides with rich formatting. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same. If key is present, richText must be present. This key can be an empty string or undefined if the guide is required to be hidden. This happens when the demo only shows clickable element but not the guide.
       */
    richText: string;
  
    /**
        * Id of annotation for which text should be updated. User would pass this value along side input image.
        */
    id: number;
    /**
        * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. Choose a custom text for the CTA to make the demo engaging. If the guide is hidden by making text value nullish, then this value is discarded.
        */
    nextButtonText: string;
  }
  >;
}
  
