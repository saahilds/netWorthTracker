import type { NetWorthSnapshot } from "./types";

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
          assetClass: "liability"
        }
      ]
    }
  ]
};
