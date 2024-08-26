/**
  * Suggest a guide theme for a given user preference
  */
export interface suggest_guide_theme {
  /**
    * Primary color gets applied to CTA as background color for primary CTA and border color as secondary CTA. CTA text color is auto determined. Primary color format must be in hex. Example: #ffffff
    */
  primaryColor: string;
  /**
    * Font color is the guide text color. Font color format must be in hex. Example: #ffffff
    * Example: #ffffff
    */
  fontColor: string;
  /**
    * Background color gets applied on the background of guide container. This guide container spans over guide text and guide CTAs. Choice of background color must provide enough contrast. Background color format must be in hex. Example: #ffffff
    */
  backgroundColor: string;
  /**
    * Border radius of the guide container. This border radius also gets applied to CTAs. This value must be a number, it's applyed in px. Exmaple if borderRadius is 8,the 8px border radius is applied.
    */
  borderRadius: number;
  /**
    * Border color of the guide container. This color is applied with 1px stroke. Border color format must be in hex. Example: #ffffff.
    */
  borderColor: string;
}
