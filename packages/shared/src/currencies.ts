// kept free of zod so the web app can import it without bundling the schemas
export const SUPPORTED_CURRENCIES = ["usd", "sol", "eth", "bnb", "pol"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
