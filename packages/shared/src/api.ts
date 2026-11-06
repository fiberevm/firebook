// Response shapes returned by the API, shared with the web app.

export type ApiError = {
  message?: string;
  error?: string | boolean;
};

export type ApiUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

export type ApiOrg = {
  id: string;
  name: string;
  plan: "none" | "starter" | "business";
  createdAt: string;
  updatedAt: string;
};

export type ApiCurrentUser = ApiUser & { organizations: ApiOrg[] };

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  active: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EntryType = "income" | "expense";

export type ApiEntry = {
  id: string;
  amount: number;
  currency: string;
  valueAtDate: number;
  type: EntryType;
  category: string | null;
  tags: string[];
  dateOfEntry: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
};

export type ApiOrgMember = {
  id: string;
  role: "admin" | "member";
  user: ApiUser;
  createdAt: string;
  updatedAt: string;
};

export type CurrencySum = { currency: string; sum: number; sumUsd: number };

export type Statement = {
  income: number;
  expenses: number;
  incomeByCurrency: CurrencySum[];
  expensesByCurrency: CurrencySum[];
};

export type DailySum = { date: string; sum: number };
export type DailyCurrencySum = { date: string; currency: string; sum: number; sumUsd: number };

export type DailyStatement = {
  incomePerDay: DailySum[];
  expensesPerDay: DailySum[];
  incomeByCurrencyPerDay: DailyCurrencySum[];
  expensesByCurrencyPerDay: DailyCurrencySum[];
};

export type ApiEntriesResponse = {
  entries: ApiEntry[];
  count: number;
  statement: Statement;
};

export type BreakdownInterval = "day" | "week" | "month";

// USD totals per time bucket, entry type and category.
// `period` is the UTC start of the bucket (YYYY-MM-DD); weeks start on Monday.
export type CategoryBreakdown = {
  interval: BreakdownInterval;
  rows: { period: string; type: EntryType; category: string | null; sumUsd: number }[];
};

// GET /auth/settings: the sign-in methods an instance offers
export type AuthSettings = {
  password: { enabled: boolean; signup: boolean };
  // single sign-on (OIDC), when configured
  sso: { name: string } | null;
};
