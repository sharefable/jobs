/**
  * List of all possible capabilities for demo creation / edit given a user message.
  */
export interface base_root_router {
  /**
      * `action` key contains list of capabilities that are supported at this point in time. Here is a description of each and every action in details
      *
      * update_demo_content: Requests that involve changing major content of the demo or require change in more that one annotation.
      *
      * update_annotation_content: Request related to modifying the text for a single annotation.
      *
      * update_theme: Request related to visual appearance or styling of the demo.
      */
  action: 'na'
  | 'update_demo_content'
  | 'update_annotation_content'
  | 'update_theme';
  
  /**
      * If user has requested an action that is not supported by `action` key above, then assign 'na' for `action` key. In that case `notSupportedMsg` would contain a user centric message of what's possible. This message is shown tot he user
      */
  notSupportedMsg?: string;
}
  