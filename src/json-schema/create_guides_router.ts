/**
  * Decide what kind of demo to create based on demo objective given by user. Interactive demo can be categorized broadly in 3 types.
  *
  * Interactive demos for marketing, that are hosted on website landing pages to showcase the product. Here the demo talks about the use case of the product and how it help buyers.
  * Interactive demos for product onbording and feature showcase are for feature announcements on various channel (mail / linkedin etc) or for user onboarding.
  * Step by step interactive demos are used as help center article as a how to articale.
  */
export interface create_guides_router {
  /**
    * Category of demo to create.
    * If the demo category is not 'marketing', 'product' or 'step-by-step' then pass 'na'
    */
  categoryOfDemo: 'marketing' | 'product' | 'step-by-step' | 'na';
  /**
    * Figure out functional requirement from user given objective. This data is forwarded to future tool calls to create a demo. Generate this requiment in such a way so that the chained tool calls can use this data. Functional requirement includes but not limited to tone of the demo, language to use in the demo, if the demo should be verbose or to the point etc.
    */
  functionalRequirement: string;
  /**
    * Figure out look and feel requirement for the demo (guides) from given user objective. If the requirement is not clear from user's demo objective, then suggest a contrasting, clean, beautiful & modern look and feel requirement for the demo.
    */
  lookAndFeelRequirement: string;
  /**
    * For demos with many steps, content can be divided into modules or sections, similar to chapters of a book, to improve navigation and consumption. The end users can navigate to a module of their choice and switch between modules at any point in time. Figure out demo module requirement from the user objective and product details. If the requirement is not clear then do not populate this key.
    */
  moduleRequirement?: string;
  /**
    * If the type is 'na', then suggest a category of demo
    */
  suggestedCategoryOfDemo?: string;
}
