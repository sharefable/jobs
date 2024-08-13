export interface demo_guides {
  /**
    * Ordered list of guide messages
    */
  items: Array<
  /**
    * One singular guide message
    */
  {
    /**
      * Generated text of annotation / guides
      */
    text: string;
    /**
      * Border color of selected candidate element from the images uploaded. For cover annotaion the value does not hold any relevance, any from the list can be passed.
      */
    element: 'black' | 'red' | 'blue' | 'cyan';
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
