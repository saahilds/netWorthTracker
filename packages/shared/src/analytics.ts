import type { AssetClass, Holding, NetWorthSnapshot } from "./types";

export interface SummaryMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  unrealizedGain: number;
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
