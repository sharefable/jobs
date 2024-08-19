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
      * Generated text of annotation / guides. Key text can be an empty string or undefined if the guide is required to be hidden. This happens when the demo only shows clickable element but not the guide. Key text must be present, if typeOfGuide is cover.
      */
    text?: string;
    /**
      * Id of screen on which the annotation should be displayed. User would pass this value along side input image.
      */
    screenId: number;
    /**
      * Border color of selected candidate element from the images uploaded. For cover annotaion the value does not hold any relevance, any from the list can be passed.
      */
    element: 'black' | 'red' | 'blue' | 'cyan';
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. If the guide is hidden by making text value nullish, then this value is discarded.
      */
    nextButtonText?: string;
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. That's how user progresses through the demo. The text of this next CTA by defualt is Next. Configure the next button text to make the demo more engaging.
      */
    /**
      * Type of the annotation. Can either be cover or element. Cover annotation are shown as modal and are not attached to an element. If typeOfGuide is modal then any value of element key can be choosen as for cover annotation element value is discarded. Element annotation are shown as tooltip. If typeOfGuide is element then a proper value of element must be choosen.
      */
    typeOfGuide: 'cover' | 'element';
    /**
      * true if a screen should be skipped as it does not add any additional value to the demo. If skip is true then text, element and typeofGuide keys can have any valid values. Value of these keys are not used and will be discarded.
      */
    skip: boolean;
  }
  >;
}
