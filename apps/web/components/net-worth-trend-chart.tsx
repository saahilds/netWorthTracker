"use client";

import type { AssetClass, NetWorthHistoryPoint, TrendRangeKey } from "@networth/shared";
import { filterHistoryByRange } from "@networth/shared";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  cash: "Cash",
  equity: "Equity",
  retirement: "Retirement",
  alternative: "Alternative",
  hard_asset: "Hard Asset",
  liability: "Liability"
};

const RANGE_OPTIONS: TrendRangeKey[] = ["1D", "5D", "1M", "YTD", "1Y", "5Y", "MAX"];

const NET_WORTH_COLOR = "#0f172a";

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  cash: "#10b981",
  equity: "#6366f1",
  retirement: "#0ea5e9",
  alternative: "#f59e0b",
  hard_asset: "#ec4899",
  liability: "#ef4444"
};

const ACCOUNT_LINE_COLORS = [
  "#334155",
  "#1d4ed8",
  "#047857",
  "#7c3aed",
  "#be185d",
  "#ea580c",
  "#0f766e",
  "#9f1239"
];

interface NetWorthTrendChartProps {
  history: NetWorthHistoryPoint[];
  accountLabels: Record<string, string>;
}

function accountColor(accountId: string, accountIds: string[]): string {
  const index = accountIds.indexOf(accountId);
  return ACCOUNT_LINE_COLORS[index % ACCOUNT_LINE_COLORS.length];
}

function formatXAxisLabel(timestampIso: string, range: TrendRangeKey): string {
  const date = new Date(timestampIso);
  if (range === "1D") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  if (range === "5Y" || range === "MAX") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit"
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export function NetWorthTrendChart({ history, accountLabels }: NetWorthTrendChartProps) {
  const [range, setRange] = useState<TrendRangeKey>("1M");
  const [showNetWorth, setShowNetWorth] = useState(true);
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<AssetClass[]>([
    "equity",
    "retirement"
  ]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(["acct-schwab"]);

  const accountIds = useMemo(() => Object.keys(accountLabels), [accountLabels]);
  const filteredHistory = useMemo(() => filterHistoryByRange(history, range), [history, range]);

  const chartData = useMemo(
    () =>
      filteredHistory.map((point) => ({
        timestampIso: point.timestampIso,
        label: formatXAxisLabel(point.timestampIso, range),
        netWorth: point.netWorth,
        ...Object.fromEntries(
          (Object.keys(point.byAssetClass) as AssetClass[]).map((assetClass) => [
            `asset_${assetClass}`,
            point.byAssetClass[assetClass]
          ])
        ),
        ...Object.fromEntries(
          Object.entries(point.byAccount).map(([accountId, value]) => [
            `account_${accountId}`,
            value
          ])
        )
      })),
    [filteredHistory, range]
  );

  const toggleAssetClass = (assetClass: AssetClass) => {
    setSelectedAssetClasses((current) =>
      current.includes(assetClass)
        ? current.filter((value) => value !== assetClass)
        : [...current, assetClass]
    );
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId]
    );
  };

  return (
    <div className="chart-shell">
      <div className="range-toggle-row">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            className={`range-toggle ${range === option ? "range-toggle-active" : ""}`}
            onClick={() => setRange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="line-toggle-sections">
        <div className="line-toggle-group">
          <span>Core</span>
          <label>
            <input
              checked={showNetWorth}
              onChange={(event) => setShowNetWorth(event.target.checked)}
              type="checkbox"
            />
            Net Worth
          </label>
        </div>
        <div className="line-toggle-group">
          <span>Asset Class</span>
          {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((assetClass) => (
            <label key={assetClass}>
              <input
                checked={selectedAssetClasses.includes(assetClass)}
                onChange={() => toggleAssetClass(assetClass)}
                type="checkbox"
              />
              {ASSET_CLASS_LABELS[assetClass]}
            </label>
          ))}
        </div>
        <div className="line-toggle-group">
          <span>Accounts</span>
          {accountIds.map((accountId) => (
            <label key={accountId}>
              <input
                checked={selectedAccounts.includes(accountId)}
                onChange={() => toggleAccount(accountId)}
                type="checkbox"
              />
              {accountLabels[accountId]}
            </label>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={330}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" minTickGap={18} stroke="#64748b" />
          <YAxis
            stroke="#64748b"
            tickFormatter={(value) => currencyFormatter.format(value)}
            width={95}
          />
          <Tooltip
            formatter={(value: number) => currencyFormatter.format(value)}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.timestampIso
                ? new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: range === "1D" ? "short" : undefined
                  }).format(new Date(payload[0].payload.timestampIso))
                : ""
            }
            contentStyle={{ borderRadius: "0.75rem", borderColor: "#cbd5e1" }}
          />
          <Legend />
          {showNetWorth ? (
            <Line
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke={NET_WORTH_COLOR}
              strokeWidth={2.6}
              dot={false}
            />
          ) : null}
          {selectedAssetClasses.map((assetClass) => (
            <Line
              key={assetClass}
              type="monotone"
              dataKey={`asset_${assetClass}`}
              name={ASSET_CLASS_LABELS[assetClass]}
              stroke={ASSET_CLASS_COLORS[assetClass]}
              strokeWidth={1.8}
              dot={false}
            />
          ))}
          {selectedAccounts.map((accountId) => (
            <Line
              key={accountId}
              type="monotone"
              dataKey={`account_${accountId}`}
              name={accountLabels[accountId]}
              stroke={accountColor(accountId, accountIds)}
              strokeWidth={1.6}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
