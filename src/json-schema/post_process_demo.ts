/**
  * Once a demo is created, post process a demo to adjust guide text, create intro / outro guide or create modules. The current state of demo is wrapped inside \<demo-state> xml tag. This demo state is immutable.
  */
export interface post_process_demo {
  /**
    * Intro guide for the whole demo
    */
  demo_intro_guide: {
  /**
    * Text of the intro guide, this text should be summarize the whole demo based on product & demo objective.
    */
    text: string;
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. That's how user progresses through the demo. The text of this next CTA by defualt is Next. Configure the next button text to make the demo more engaging.
      */
    nextButtonText: string;
  },
  /**
    * Outro guide for the whole demo
    */
  demo_outro_guide: {
  /**
    * Text of the outro guide, this text should discuss about the next step.
    */
    text: string;
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. For the outro guide this CTA could be an external CTA where the demo viweres would go once they finish the demo.
      */
    nextButtonText: string;
  },
  /**
    * Modules of the demo. If no modules are being created this would be an empty array.
    */
  modules: Array<{
    /**
      * A short name of the module preferrably less than 36 chars.  
      */
    name:string;
    /**
      * A short description of the module. Preferrably less than 120 chars.
      */
    description: string;
    /**
      * id of guide from the current demo state (mentioned in \</demo-state>) from where the module starts. Two modules can't have same moduleStartIndex.
      */
    moduleStartIndex: number;
    /**
      * Optional intro guide for the current module.
      */
    module_intro_guide?: {
      /**
    * Text of the intro guide, this text should be summarize the whole module.
    */
      text: string;
      /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. That's how user progresses through the demo. The text of this next CTA by defualt is Next. Configure the next button text to make the demo more engaging.
      */
      nextButtonText: string;
    },
    /**
    * Optional outro guide for the current module
    */
    module_outro_guide?: {
      /**
    * Text of the outro guide, this text should discuss about what's shown what to expect next.
    */
      text: string;
      /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. For the outro guide this CTA could be an external CTA where the demo viweres would go once they finish the demo.
      */
      nextButtonText: string;
    },
  }>;
  /**
    * Optionally update current demos state's content. If no content of current demo state gets changed then this would be an empty array.
    */
  updateCurrentDemoStateContent: Array<{
    /**
      * id of the guide that's is getting updated. If an entry is made here, either text or nextButtonText (or both) must be present
      */
    id: number;
    /**
      * Update guide text from demo state referenced by id. If no text change is required then omit this key.
      */
    text?: string;
    /**
      * Update guide CTA text from demo state referenced by id. If no text change is required then omit this key.
      */
    nextButtonText?: string;
  }>
}
