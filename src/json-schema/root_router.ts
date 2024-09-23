/**
  * List of all possible capabilities / skills that are available to you. This is only used for determining if user's intent could be performed by any of the skills that are mentioned below (hence it act's like a router). User might ask something that is not possible yet, in that case the skill must have 'na' value.
  */
export interface root_router {
  /**
    * `skill` key contains list of capabilities that are supported at this point in time. Here is a description of each and every skill in details
    *
    * update_annotation_content: Select this skill if user wants to change properties of single annotation / guide in the demo. For example, user might indicate changing a single annotation by mentioning they want to change the current guide / first guide / last guide of the demo. 
    *
    * update_demo_content: Select this skill if user wants to change all or some guides in the demo. Ideally you would choose this skill if the user's request might span more than one guide in the demo. For example, if user wants to change the language of the demo / tone of the demo / ask you to personalize demo then you'd know that the whole demo might be changed.
    *
    * update_theme: Select this skill when user wants to change the visual property (theme / scheme) of guides in the demo.
    *
    * 'na': Select this skill in case you are not sure what user wants or if you don't find an relevant skill for user's intent.
    */
  skill: 'na'
  | 'update_demo_content'
  | 'update_annotation_content'
  | 'update_theme';

  /**
    * If user has requested an action that is not supported by `skill` key above, then assign 'na' for `skill` key. In that case `notSupportedMsg` would contain a user centric message of what's possible. This message is displayed to the user.
    */
  notSupportedMsg?: string;
}
