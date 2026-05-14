import type { AccountType, AssetClass, NetWorthHistoryPoint, NetWorthSnapshot } from "@networth/shared";
import { prisma } from "./db";

const EMPTY_ASSET_CLASS_BREAKDOWN: Record<AssetClass, number> = {
  cash: 0,
  equity: 0,
  retirement: 0,
  alternative: 0,
  hard_asset: 0,
  liability: 0
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const decimalValue = value as { toNumber: () => number };
    return decimalValue.toNumber();
  }

  return 0;
}

function normalizeAssetClass(value: string): AssetClass {
  if (
    value === "cash" ||
    value === "equity" ||
    value === "retirement" ||
    value === "alternative" ||
    value === "hard_asset" ||
    value === "liability"
  ) {
    return value;
  }

  return "alternative";
}

function accountTypeFromAssetClass(assetClass: AssetClass): AccountType {
  if (assetClass === "cash") {
    return "checking";
  }

  if (assetClass === "equity") {
    return "brokerage";
  }

  if (assetClass === "retirement") {
    return "retirement";
  }

  if (assetClass === "liability") {
    return "liability";
  }

  if (assetClass === "hard_asset") {
    return "hard_asset";
  }

  return "betting";
}

function normalizeByAssetClass(jsonValue: unknown): Record<AssetClass, number> {
  if (!jsonValue || typeof jsonValue !== "object") {
    return { ...EMPTY_ASSET_CLASS_BREAKDOWN };
  }

  const raw = jsonValue as Record<string, unknown>;
  return {
    cash: toNumber(raw.cash),
    equity: toNumber(raw.equity),
    retirement: toNumber(raw.retirement),
    alternative: toNumber(raw.alternative),
    hard_asset: toNumber(raw.hard_asset),
    liability: toNumber(raw.liability)
  };
}

function normalizeByAccount(jsonValue: unknown): Record<string, number> {
  if (!jsonValue || typeof jsonValue !== "object") {
    return {};
  }

  const raw = jsonValue as Record<string, unknown>;
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, toNumber(value)]));
}

export interface PlaidConnectionSummary {
  id: string;
  institutionName: string;
  status: string;
  accountCount: number;
  supportedCount: number;
  unsupportedCount: number;
  lastSyncedAt: string | null;
}

export interface DashboardPortfolioData {
  snapshot: NetWorthSnapshot | null;
  history: NetWorthHistoryPoint[];
  accountLabels: Record<string, string>;
  connections: PlaidConnectionSummary[];
}

export async function getDashboardPortfolioData(userId: string): Promise<DashboardPortfolioData> {
  const [items, accounts, snapshots] = await Promise.all([
    prisma.plaidItem.findMany({
      where: { userId },
      include: {
        accounts: true
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.plaidAccount.findMany({
      where: { userId },
      include: {
        holdings: true
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: {
        timestamp: "asc"
      },
      take: 1500
    })
  ]);

  const connections: PlaidConnectionSummary[] = items.map((item) => {
    const accountCount = item.accounts.length;
    const supportedCount = item.accounts.filter((account) => account.isSupported).length;
    return {
      id: item.id,
      institutionName: item.institutionName ?? "Connected institution",
      status: item.status,
      accountCount,
      supportedCount,
      unsupportedCount: accountCount - supportedCount,
      lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null
    };
  });

  const accountLabels = Object.fromEntries(
    accounts.map((account) => [
      account.plaidAccountId,
      `${account.institutionName ?? "Institution"} • ${account.name}`
    ])
  );

  const history: NetWorthHistoryPoint[] = snapshots.map((snapshot) => ({
    timestampIso: snapshot.timestamp.toISOString(),
    netWorth: toNumber(snapshot.netWorth),
    byAssetClass: normalizeByAssetClass(snapshot.byAssetClass),
    byAccount: normalizeByAccount(snapshot.byAccount)
  }));

  if (accounts.length === 0) {
    return {
      snapshot: null,
      history,
      accountLabels,
      connections
    };
  }

  const snapshotAccounts = accounts.map((account) => {
    const accountAssetClass = normalizeAssetClass(account.assetClass);
    const holdings =
      account.holdings.length > 0
        ? account.holdings.map((holding) => ({
            id: holding.id,
            symbol: holding.symbol ?? undefined,
            name: holding.name,
            quantity: holding.quantity ? toNumber(holding.quantity) : undefined,
            price: holding.price ? toNumber(holding.price) : undefined,
            value: toNumber(holding.marketValue),
            costBasis: holding.costBasis ? toNumber(holding.costBasis) : undefined,
            dayChangePct: holding.dayChangePct ? toNumber(holding.dayChangePct) : undefined,
            assetClass: normalizeAssetClass(holding.assetClass)
          }))
        : [
            {
              id: `balance-${account.id}`,
              name: account.assetClass === "liability" ? "Outstanding Balance" : "Cash Balance",
              value: Math.abs(toNumber(account.currentBalance)),
              assetClass: accountAssetClass
            }
          ];

    return {
      id: account.plaidAccountId,
      institution: account.institutionName ?? "Institution",
      name: account.name,
      type: accountTypeFromAssetClass(accountAssetClass),
      holdings
    };
  });

  const snapshot: NetWorthSnapshot = {
    timestampIso: new Date().toISOString(),
    accounts: snapshotAccounts
  };

  return {
    snapshot,
    history,
    accountLabels,
    connections
  };
}
