export type AssetClass =
  | "cash"
  | "equity"
  | "retirement"
  | "alternative"
  | "hard_asset"
  | "liability";

export type AccountType =
  | "checking"
  | "brokerage"
  | "retirement"
  | "betting"
  | "liability"
  | "hard_asset";

export interface Holding {
  id: string;
  symbol?: string;
  name: string;
  quantity?: number;
  price?: number;
  value: number;
  costBasis?: number;
  assetClass: AssetClass;
}

export interface Account {
  id: string;
  institution: string;
  name: string;
  type: AccountType;
  holdings: Holding[];
}

export interface NetWorthSnapshot {
  timestampIso: string;
  accounts: Account[];
}
