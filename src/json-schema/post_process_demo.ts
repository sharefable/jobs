/**
  * Once a demo is created, post process a demo to adjust guide text, create intro / outro guide or create modules. The current state of demo is wrapped inside \<demo-state> xml tag. This demo state is immutable.
  */
export interface post_process_demo {
  /**
    * Short title of demo preferrably less than 36 char
    */
  title: string;
  /**
    * A description of the demo less than 250 char. This description should be talk about what the demo is showing based on user objective.
    */
  description: string;
  /**
    * Introductory guide for the whole demo. This is a key guide that improves engagement. 
    */
  demo_intro_guide: {
    /**
     * Rich Text of the intro guide. This is in plain text without html tags. Generate the text in such a way so that the viwewers of this demo understands the value of the demo. You might refer to \<product-information> and \<demo-objective> to get a sense of the content of the demo. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same.
     */
    richText: string;
    /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. That's how user progresses through the demo. The text of this next CTA by defualt is Next. Configure the next button text to make the demo more engaging.
      */
    nextButtonText: string;
  },
  /**
    * Concluding guide to end the demo. This is a key guide that improves conversion.
    */
  demo_outro_guide: {
    /**
     *  Generate this guide such a way so that the viewers of the demo know what their next step is. You might refer to \<product-information> and \<demo-objective> to get a sense of the content of the demo. Text of the intro guide. This is in rich text format. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same.
     */
    richText: string;
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
      * id of guide from the current demo state (mentioned in \</demo-state>) from where the module starts. Two modules can't have same moduleStartIndex. The first module should start with 0.
      */
    moduleStartIndex: number;
    /**
      * Optional introductory guide for the current module. Only populate this if the module has more than 6 steps. Do not populate this for the first module.
      */
    module_intro_guide?: {
      /**
       * This introductory guide talks about what the module the contains. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same.
       */
      richText: string;
      /**
      * In each guide there is a `next` Call To Action (CTA) button that user clicks to go to the next guide. That's how user progresses through the demo. The text of this next CTA by defualt is Next. Configure the next button text to make the demo more engaging.
      */
      nextButtonText: string;
    },
  }>;
  /**
    * Optionally update current demos state's content. If no content of current demo state gets changed then this would be an empty array.
    */
  updateCurrentDemoStateContent: Array<{
    /**
      * id of the guide that's is getting updated from \<demo-state>. This id must be present in \<demo-state>
      */
    id: number;
    /**
      * Update guide text from demo state referenced by id. If no text change is required then omit this key. The rich text formatting abides by the constraints of rich text formatting mentioned in the system prompt. The text content of text and richText is exactly the same. If text is present, richText must be present.
      */
    richText?: string;
    /**
      * Update guide CTA text from demo state referenced by id. If no text change is required then omit this key.
      */
    nextButtonText?: string;
  }>
}
