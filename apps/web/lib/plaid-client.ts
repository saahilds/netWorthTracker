import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { env, hasPlaidCredentials } from "./env";

const products = [
  Products.Auth,
  Products.Transactions,
  Products.Investments,
  Products.Liabilities
];

export function getPlaidProducts(): Products[] {
  return products;
}

export function getPlaidClient(): PlaidApi {
  if (!hasPlaidCredentials()) {
    throw new Error("Plaid credentials are missing. Set PLAID_CLIENT_ID and PLAID_SECRET.");
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID ?? "",
        "PLAID-SECRET": env.PLAID_SECRET ?? ""
      }
    }
  });

  return new PlaidApi(configuration);
}

export function defaultPlaidCountryCodes(): CountryCode[] {
  return [CountryCode.Us];
}
