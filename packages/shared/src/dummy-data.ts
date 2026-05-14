import type { NetWorthHistoryPoint, NetWorthSnapshot } from "./types";

export const dummySnapshot: NetWorthSnapshot = {
  timestampIso: "2026-05-13T19:30:00.000Z",
  accounts: [
    {
      id: "acct-chase",
      institution: "Chase",
      name: "Total Checking",
      type: "checking",
      holdings: [
        {
          id: "cash-chase",
          name: "USD Cash",
          value: 12650.45,
          assetClass: "cash"
        }
      ]
    },
    {
      id: "acct-schwab",
      institution: "Schwab",
      name: "Taxable Brokerage",
      type: "brokerage",
      holdings: [
        {
          id: "h-vti",
          symbol: "VTI",
          name: "Vanguard Total Stock Market ETF",
          quantity: 45,
          price: 292.42,
          value: 13158.9,
          costBasis: 11880.0,
          dayChangePct: 0.92,
          assetClass: "equity"
        },
        {
          id: "h-msft",
          symbol: "MSFT",
          name: "Microsoft Corp.",
          quantity: 12,
          price: 425.8,
          value: 5109.6,
          costBasis: 4500.0,
          dayChangePct: 2.38,
          assetClass: "equity"
        }
      ]
    },
    {
      id: "acct-robinhood",
      institution: "Robinhood",
      name: "Individual Investing",
      type: "brokerage",
      holdings: [
        {
          id: "h-nvda",
          symbol: "NVDA",
          name: "NVIDIA Corp.",
          quantity: 8,
          price: 928.2,
          value: 7425.6,
          costBasis: 5400.0,
          dayChangePct: -1.47,
          assetClass: "equity"
        }
      ]
    },
    {
      id: "acct-transamerica",
      institution: "Transamerica",
      name: "401(k)",
      type: "retirement",
      holdings: [
        {
          id: "h-retirement-fund",
          name: "Target Date Fund",
          value: 39225.17,
          costBasis: 31200.0,
          dayChangePct: 0.16,
          assetClass: "retirement"
        }
      ]
    },
    {
      id: "acct-kalshi",
      institution: "Kalshi",
      name: "Prediction Market",
      type: "betting",
      holdings: [
        {
          id: "h-kalshi-cash",
          name: "Cash Balance",
          value: 2100.0,
          dayChangePct: -0.22,
          assetClass: "alternative"
        }
      ]
    },
    {
      id: "acct-car",
      institution: "KBB",
      name: "Tesla Model 3",
      type: "hard_asset",
      holdings: [
        {
          id: "h-car",
          name: "Vehicle Estimated Value",
          value: 24500.0,
          dayChangePct: -0.04,
          assetClass: "hard_asset"
        }
      ]
    },
    {
      id: "acct-credit",
      institution: "Chase",
      name: "Credit Card Balance",
      type: "liability",
      holdings: [
        {
          id: "h-cc-balance",
          name: "Current Statement Balance",
          value: 1840.32,
          dayChangePct: 1.9,
          assetClass: "liability"
        }
      ]
    }
  ]
};

const ACCOUNT_BASE_VALUES: Record<string, number> = {
  "acct-chase": 12650.45,
  "acct-schwab": 18268.5,
  "acct-robinhood": 7425.6,
  "acct-transamerica": 39225.17,
  "acct-kalshi": 2100,
  "acct-car": 24500,
  "acct-credit": -1840.32
};

const ASSET_CLASS_BASE_VALUES: NetWorthHistoryPoint["byAssetClass"] = {
  cash: 12650.45,
  equity: 25584.1,
  retirement: 39225.17,
  alternative: 2100,
  hard_asset: 24500,
  liability: 1840.32
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function createByAccountValue(daysAgo: number, intradayIndex: number): Record<string, number> {
  const trend = 0.0006 * daysAgo;
  return {
    "acct-chase": roundCurrency(ACCOUNT_BASE_VALUES["acct-chase"] + Math.sin(daysAgo / 16) * 150),
    "acct-schwab": roundCurrency(
      ACCOUNT_BASE_VALUES["acct-schwab"] * (1 - trend) + Math.sin(daysAgo / 7) * 850
    ),
    "acct-robinhood": roundCurrency(
      ACCOUNT_BASE_VALUES["acct-robinhood"] * (1 - trend * 1.4) + Math.cos(daysAgo / 5) * 520
    ),
    "acct-transamerica": roundCurrency(
      ACCOUNT_BASE_VALUES["acct-transamerica"] * (1 - trend * 0.55) + Math.sin(daysAgo / 28) * 620
    ),
    "acct-kalshi": roundCurrency(
      ACCOUNT_BASE_VALUES["acct-kalshi"] + Math.cos(daysAgo / 10) * 130
    ),
    "acct-car": roundCurrency(
      ACCOUNT_BASE_VALUES["acct-car"] * (1 + daysAgo * 0.00002)
    ),
    "acct-credit": roundCurrency(
      ACCOUNT_BASE_VALUES["acct-credit"] - Math.sin((daysAgo + intradayIndex) / 8) * 120
    )
  };
}

function createByAssetClassValue(
  byAccount: Record<string, number>
): NetWorthHistoryPoint["byAssetClass"] {
  return {
    cash: roundCurrency(byAccount["acct-chase"]),
    equity: roundCurrency(byAccount["acct-schwab"] + byAccount["acct-robinhood"]),
    retirement: roundCurrency(byAccount["acct-transamerica"]),
    alternative: roundCurrency(byAccount["acct-kalshi"]),
    hard_asset: roundCurrency(byAccount["acct-car"]),
    liability: roundCurrency(Math.abs(byAccount["acct-credit"]))
  };
}

function toHistoryPoint(timestamp: Date, daysAgo: number, intradayIndex: number): NetWorthHistoryPoint {
  const byAccount = createByAccountValue(daysAgo, intradayIndex);
  const byAssetClass = createByAssetClassValue(byAccount);
  const netWorth = roundCurrency(
    byAssetClass.cash +
      byAssetClass.equity +
      byAssetClass.retirement +
      byAssetClass.alternative +
      byAssetClass.hard_asset -
      byAssetClass.liability
  );

  return {
    timestampIso: timestamp.toISOString(),
    byAccount,
    byAssetClass,
    netWorth
  };
}

function buildDailyHistory(referenceTimestamp: string): NetWorthHistoryPoint[] {
  const reference = new Date(referenceTimestamp);
  const history: NetWorthHistoryPoint[] = [];
  for (let daysAgo = 1825; daysAgo >= 1; daysAgo -= 1) {
    const timestamp = new Date(reference.getTime() - daysAgo * DAY_IN_MS);
    timestamp.setUTCHours(20, 0, 0, 0);
    history.push(toHistoryPoint(timestamp, daysAgo, 0));
  }
  return history;
}

function buildIntradayHistory(referenceTimestamp: string): NetWorthHistoryPoint[] {
  const reference = new Date(referenceTimestamp);
  const history: NetWorthHistoryPoint[] = [];
  const dayStart = new Date(reference);
  dayStart.setUTCHours(13, 30, 0, 0);

  for (let index = 0; index <= 12; index += 1) {
    const timestamp = new Date(dayStart.getTime() + index * THIRTY_MIN_MS);
    const daysAgo = 0;
    history.push(toHistoryPoint(timestamp, daysAgo, index));
  }

  return history;
}

export const dummyNetWorthHistory: NetWorthHistoryPoint[] = [
  ...buildDailyHistory(dummySnapshot.timestampIso),
  ...buildIntradayHistory(dummySnapshot.timestampIso)
];
