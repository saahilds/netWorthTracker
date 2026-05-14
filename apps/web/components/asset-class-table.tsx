import type { AssetClass } from "@networth/shared";

const DISPLAY_ORDER: AssetClass[] = [
  "cash",
  "equity",
  "retirement",
  "alternative",
  "hard_asset",
  "liability"
];

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  cash: "Cash",
  equity: "Equities",
  retirement: "Retirement",
  alternative: "Alternative",
  hard_asset: "Hard Assets",
  liability: "Liabilities"
};

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  cash: "#10b981",
  equity: "#6366f1",
  retirement: "#0ea5e9",
  alternative: "#f59e0b",
  hard_asset: "#ec4899",
  liability: "#ef4444"
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

interface AssetClassTableProps {
  totals: Record<AssetClass, number>;
}

export function AssetClassTable({ totals }: AssetClassTableProps) {
  const absoluteTotal = DISPLAY_ORDER.reduce((sum, assetClass) => sum + totals[assetClass], 0);

  return (
    <table>
      <thead>
        <tr>
          <th>Asset Class</th>
          <th>Share</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {DISPLAY_ORDER.map((assetClass) => {
          const value = totals[assetClass];
          const percent = absoluteTotal === 0 ? 0 : (value / absoluteTotal) * 100;
          return (
            <tr key={assetClass}>
              <td>
                <span className={`asset-pill asset-pill-${assetClass}`}>
                  {ASSET_CLASS_LABELS[assetClass]}
                </span>
              </td>
              <td>
                <div className="progress-meter">
                  <span
                    className="progress-fill"
                    style={{
                      width: `${Math.max(percent, 1)}%`,
                      backgroundColor: ASSET_CLASS_COLORS[assetClass]
                    }}
                  />
                </div>
                <span className="progress-label">{percent.toFixed(1)}%</span>
              </td>
              <td>{currencyFormatter.format(value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
