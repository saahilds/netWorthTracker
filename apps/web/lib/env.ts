import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_REDIRECT_URI: z.string().optional(),
  PLAID_WEBHOOK_URL: z.string().optional(),
  SYNC_JOB_SECRET: z.string().optional(),
  APP_ENCRYPTION_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

export function hasPlaidCredentials(): boolean {
  return Boolean(env.PLAID_CLIENT_ID && env.PLAID_SECRET);
}

export function hasOAuthProviderConfigured(): boolean {
  return Boolean(
    (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) ||
      (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)
  );
}
