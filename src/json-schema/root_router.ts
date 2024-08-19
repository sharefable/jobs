/**
  * List of all possible capabilities for demo creation / edit given a user message.
  */
export interface root_router {
  /**
    * `action` key contains list of capabilities that are supported at this point in time. Here is a description of each and every action in details
    *
    * create_new_demo: Create a new of demo from scratch or switch type of demos. Interactive demos could be of type marketing or product or step-by-step guide. This action enables creating a particular type of demo or switching from one demo type to another by creating a new demo type from scratch.
    *
    * categorize_demo_into_modules: Once a demo is created, if it's a large demo then it can be broken down to smaller sections called demo modules. User can use these modules to navigate from one to another. Think demo modules as an youtube capter in a large module.
    *
    * cud_demo_guides: Create or delete demo guides or update demo guide properties. Once the demo is created based on user query it might be required to add additional information in the demo or shorten the demo based or even update existing demo guide properties.
    *
    * change_demo_guide_ui: Change the look and feel of demo guide by adjusting visual properties.
    */
  action: 'na'
  | 'create_new_demo'
  | 'categorize_demo_into_modules'
  | 'cud_demo_guides'
  | 'change_demo_guide_ui';

  /**
    * If user has requested an action that is not supported by `action` key above, then assign 'na' for `action` key. In that case `notSupportedMsg` would contain a user centric message of what's possible. This message is shown tot he user
    */
  notSupportedMsg?: string;
}
