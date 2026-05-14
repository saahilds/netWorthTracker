"use client";

import type { AssetClass } from "@networth/shared";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  cash: "#10b981",
  equity: "#6366f1",
  retirement: "#0ea5e9",
  alternative: "#f59e0b",
  hard_asset: "#ec4899",
  liability: "#ef4444"
};

interface AssetClassPieChartProps {
  totals: Record<AssetClass, number>;
}

export function AssetClassPieChart({ totals }: AssetClassPieChartProps) {
  const chartData = (Object.keys(totals) as AssetClass[])
    .map((assetClass) => ({
      assetClass,
      label: ASSET_CLASS_LABELS[assetClass],
      value: totals[assetClass]
    }))
    .filter((entry) => entry.value > 0);

  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius={72}
            outerRadius={112}
            paddingAngle={2}
            cornerRadius={7}
          >
            {chartData.map((entry) => (
              <Cell
                key={`slice-${entry.assetClass}`}
                fill={ASSET_CLASS_COLORS[entry.assetClass]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
            contentStyle={{ borderRadius: "0.75rem", borderColor: "#cbd5e1" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-legend-grid">
        {chartData.map((entry) => (
          <div key={entry.assetClass} className="chart-legend-item">
            <span
              className="chart-legend-dot"
              style={{ backgroundColor: ASSET_CLASS_COLORS[entry.assetClass] }}
            />
            <span>{entry.label}</span>
            <strong>{currencyFormatter.format(entry.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
