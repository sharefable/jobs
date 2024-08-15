export interface CreateNewDemoV1 {
  v: 1;
  type: 'create_demo';
  model: 'default';
  system_payload: {
    subtype: 'create_new' | 'add_to_existing';
    usecase: 'marketing' | 'product' | 'step-by-step-guide';
  };
  user_payload: {
    product_details: string,
    demo_objective: string;
    refsForMMV: string[];
  }
}
