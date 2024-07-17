export type TMsgAttrs = Record<string, string | null | undefined>;

export interface Campaign {
  id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  status: string;
  name: string;
  parent_campaign_id: number |null;
  client_id: number |null;
}

export interface Lead {
  email: string;
  first_name: string;
  last_name: string;
}

export interface ContactPropertyPayload {
  email: string;
  ctaClickRate: number;
  demoCompletion: number;
  totalTimeSpent: number;
  demoUniqueViews: number;
  demoTotalViews: number;
  lastActiveAt: number,
}

export interface Event {
  event: string;
  payload: ContactPropertyPayload | ActivityTimeline;
}

export interface ActivityTimeline {
  email: string;
  totalTimeSpent: number;
  activityUrl: string,
  demoName: string,
  completionPercentage: number;
  ourEventId: string;
}

export enum CobaltEvents {
  REFRESH_CONTACT_PROPERTIES='REFRESH_CONTACT_PROPERTIES',
  ACTIVITY_ON_DEMO='ACTIVITY_ON_DEMO',
}

export interface LeadAccessInfoOfTour {
  [key: string]: any
  ctaClickRate: number;
  demoCompletion: number;
  totalTimeSpent: number;
  demoUniqueViews: number;
  demoTotalViews: number;
  lastActiveAt: number,
  activityUrl: string,
  demoName: string,
  orgId: number
}