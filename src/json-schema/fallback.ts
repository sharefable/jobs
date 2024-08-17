/**
  * Fallback tools call if no other tool calling is possible. This sometimes is a natural course of event when user messages, you call tool_use, user replies with state as tool_result and you resort to a courtesy reply, in that case it's likely that no other tool call will matches hence fallback is called with proper reason.
  */
export interface fallback {
  /**
    * In case fallback tool is called, pass a reason why fallback has been called and not any other tools that are attached. 
    */
  reason: string;
  /**
    * Optional response that is outside of fallback
    */
  additionalResponse?: string;
}
