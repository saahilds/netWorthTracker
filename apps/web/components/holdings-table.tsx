import { flattenHoldings } from "@networth/shared";
import type { NetWorthSnapshot } from "@networth/shared";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

interface HoldingsTableProps {
  snapshot: NetWorthSnapshot;
}

export function HoldingsTable({ snapshot }: HoldingsTableProps) {
  const holdings = flattenHoldings(snapshot);

  return (
    <table>
      <thead>
        <tr>
          <th>Holding</th>
          <th>Symbol</th>
          <th>Market Value</th>
          <th>Cost Basis</th>
          <th>Gain/Loss</th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((holding) => {
          const gainLoss = holding.costBasis ? holding.value - holding.costBasis : null;

          return (
            <tr key={holding.id}>
              <td>{holding.name}</td>
              <td>{holding.symbol ?? "-"}</td>
              <td>{currencyFormatter.format(holding.value)}</td>
              <td>
                {holding.costBasis ? currencyFormatter.format(holding.costBasis) : "-"}
              </td>
              <td className={gainLoss && gainLoss < 0 ? "negative" : "positive"}>
                {gainLoss === null ? "-" : currencyFormatter.format(gainLoss)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
