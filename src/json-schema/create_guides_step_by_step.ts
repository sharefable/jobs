export interface create_guides_step_by_step {
  /**
    * Ordered list of guide messages
    */
  items: Array<
  /**
    * One singular guide message
    */
  {
    /**
      * Generated text of annotation / guides. Key text can be an empty string or undefined if the guide is required to be hidden. This happens when the demo only shows clickable element but not the guide. Key text must be present, if typeOfGuide is cover.
      */
    text?: string;
    /**
      * Id of screen on which the annotation should be displayed
      */
    screenId: number;
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
