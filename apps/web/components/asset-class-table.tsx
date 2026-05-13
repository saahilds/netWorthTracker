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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

interface AssetClassTableProps {
  totals: Record<AssetClass, number>;
}

export function AssetClassTable({ totals }: AssetClassTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Asset Class</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {DISPLAY_ORDER.map((assetClass) => {
          const value = totals[assetClass];
          return (
            <tr key={assetClass}>
              <td>{ASSET_CLASS_LABELS[assetClass]}</td>
              <td>{currencyFormatter.format(value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
