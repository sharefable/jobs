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
    * If the type is 'na', then suggest a category of demo
    */
  suggestedCategoryOfDemo?: string;
}
