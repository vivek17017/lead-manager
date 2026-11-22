
export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Call",
  "Other"
] as const;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Lost"
] as const;

export type LeadSource = typeof LEAD_SOURCES[number];

export type LeadStatus = typeof LEAD_STATUSES[number];

// Full record returned by PostgreSQL through Express
export type Lead = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

// Data users are allowed to enter or edit
export type LeadInput = Pick<
  Lead,
  "name" | "email" | "phone" |
  "company" | "source" | "status"
>;

// API responses

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type LeadsResponse = {
  count: number;
  leads: Lead[];
  pagination: PaginationInfo;
};


export type SaveLeadResponse = {
  message: string;
  lead: Lead;
};

export type DeleteLeadResponse = {
  message: string;
  id: string;
};

export type LeadStats = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  lost: number;
};

export type LeadStatsResponse = {
  stats: LeadStats;
};
