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