export type LinkRecord = {
  slug: string;
  title: string;
  destination: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  createdBy: string | null;
  importedFrom: string | null;
  bitlyEngagements: number | null;
  clicks: number;
};

export type NamedStat = { name: string; clicks: number };
export type DayStat = { day: string; clicks: number };

export type ClickStats = {
  total: number;
  byDay: DayStat[];
  countries: NamedStat[];
  referrers: NamedStat[];
};

export type LibraryStats = {
  counts: { links: number; active: number; clicks: number; last7Days: number };
  clicks: ClickStats;
  topLinks: LinkRecord[];
};

export type Role = "owner" | "member";

export type SessionUser = {
  email: string;
  name: string;
  role: Role;
  simulated: boolean;
  fromConfig: boolean;
};

export type LinkPage = {
  links: LinkRecord[];
  total: number;
};

export type Brand = {
  name: string;
  color: string;
  logoUrl: string;
  homeUrl: string;
  showPoweredBy: boolean;
};

export type PublicConfig = {
  brand: Brand;
  signIn: { password: boolean; google: boolean };
  shortBase: string;
  timeZone: string;
};

export type TeamMember = {
  email: string;
  name: string;
  role: Role;
  hasPassword: boolean;
  createdAt: string | null;
  fromConfig: boolean;
};
