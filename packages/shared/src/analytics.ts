import type {
  Account,
  AssetClass,
  Holding,
  NetWorthHistoryPoint,
  NetWorthSnapshot
} from "./types";

export interface SummaryMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  unrealizedGain: number;
}

export interface TopMover {
  id: string;
  symbol?: string;
  name: string;
  institution: string;
  value: number;
  dayChangePct: number;
}

export interface TopMovers {
  gainers: TopMover[];
  losers: TopMover[];
}

const EMPTY_CLASS_BREAKDOWN: Record<AssetClass, number> = {
  cash: 0,
  equity: 0,
  retirement: 0,
  alternative: 0,
  hard_asset: 0,
  liability: 0
};

export function flattenHoldings(snapshot: NetWorthSnapshot): Holding[] {
  return snapshot.accounts.flatMap((account) => account.holdings);
}

export function summarizeSnapshot(snapshot: NetWorthSnapshot): SummaryMetrics {
  const holdings = flattenHoldings(snapshot);
  const totalAssets = holdings
    .filter((holding) => holding.assetClass !== "liability")
    .reduce((sum, holding) => sum + holding.value, 0);
  const totalLiabilities = holdings
    .filter((holding) => holding.assetClass === "liability")
    .reduce((sum, holding) => sum + holding.value, 0);
  const unrealizedGain = holdings.reduce((sum, holding) => {
    if (!holding.costBasis) {
      return sum;
    }

    return sum + (holding.value - holding.costBasis);
  }, 0);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    unrealizedGain
  };
}

export function summarizeByAssetClass(
  snapshot: NetWorthSnapshot
): Record<AssetClass, number> {
  return flattenHoldings(snapshot).reduce((totals, holding) => {
    totals[holding.assetClass] += holding.value;
    return totals;
  }, { ...EMPTY_CLASS_BREAKDOWN });
}

export function summarizeByAccount(snapshot: NetWorthSnapshot): Record<string, number> {
  return snapshot.accounts.reduce<Record<string, number>>((totals, account) => {
    totals[account.id] = account.holdings.reduce((sum, holding) => {
      if (holding.assetClass === "liability") {
        return sum - holding.value;
      }

      return sum + holding.value;
    }, 0);
    return totals;
  }, {});
}

export function accountLabels(snapshot: NetWorthSnapshot): Record<string, string> {
  return snapshot.accounts.reduce<Record<string, string>>((labels, account) => {
    labels[account.id] = `${account.institution} • ${account.name}`;
    return labels;
  }, {});
}

function moversFromAccount(account: Account): TopMover[] {
  return account.holdings
    .filter((holding) => typeof holding.dayChangePct === "number")
    .map((holding) => ({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      institution: account.institution,
      value: holding.value,
      dayChangePct: holding.dayChangePct as number
    }));
}

export function topMovers(snapshot: NetWorthSnapshot, count = 3): TopMovers {
  const movers = snapshot.accounts.flatMap(moversFromAccount);
  const stockFirst = movers.sort((left, right) => {
    const leftScore = left.symbol ? 1 : 0;
    const rightScore = right.symbol ? 1 : 0;
    return rightScore - leftScore;
  });

  const gainers = [...stockFirst]
    .filter((mover) => mover.dayChangePct >= 0)
    .sort((left, right) => right.dayChangePct - left.dayChangePct)
    .slice(0, count);

  const losers = [...stockFirst]
    .filter((mover) => mover.dayChangePct < 0)
    .sort((left, right) => left.dayChangePct - right.dayChangePct)
    .slice(0, count);

  return { gainers, losers };
}

export type TrendRangeKey = "1D" | "5D" | "1M" | "YTD" | "1Y" | "5Y" | "MAX";

export function filterHistoryByRange(
  history: NetWorthHistoryPoint[],
  range: TrendRangeKey
): NetWorthHistoryPoint[] {
  if (range === "MAX") {
    return history;
  }

  const lastTimestamp = history.at(-1)?.timestampIso;
  if (!lastTimestamp) {
    return history;
  }

  const end = new Date(lastTimestamp).getTime();
  const day = 24 * 60 * 60 * 1000;

  const startByRange: Record<Exclude<TrendRangeKey, "MAX">, number> = {
    "1D": end - day,
    "5D": end - day * 5,
    "1M": end - day * 31,
    YTD: Date.UTC(new Date(lastTimestamp).getUTCFullYear(), 0, 1),
    "1Y": end - day * 365,
    "5Y": end - day * 365 * 5
  };

  const start = startByRange[range];
  return history.filter((point) => new Date(point.timestampIso).getTime() >= start);
}
