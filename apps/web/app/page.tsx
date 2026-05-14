import { dummySnapshot, summarizeByAssetClass, summarizeSnapshot } from "@networth/shared";
import { AssetClassTable } from "../components/asset-class-table";
import { DashboardCard } from "../components/dashboard-card";
import { HoldingsTable } from "../components/holdings-table";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default function HomePage() {
  const summary = summarizeSnapshot(dummySnapshot);
  const assetClassTotals = summarizeByAssetClass(dummySnapshot);
  const asOf = timestampFormatter.format(new Date(dummySnapshot.timestampIso));

  return (
    <main className="page">
      <header className="header">
        <h1>Net Worth Tracker</h1>
        <p>As of {asOf} (dummy data scaffold)</p>
      </header>

      <section className="card-grid">
        <DashboardCard
          label="Net Worth"
          value={currencyFormatter.format(summary.netWorth)}
          tone="indigo"
          helperText="Assets minus liabilities"
        />
        <DashboardCard
          label="Total Assets"
          value={currencyFormatter.format(summary.totalAssets)}
          tone="emerald"
          helperText="Includes investment + cash + hard assets"
        />
        <DashboardCard
          label="Total Liabilities"
          value={currencyFormatter.format(summary.totalLiabilities)}
          emphasis="negative"
          tone="rose"
          helperText="Credit and debt balances"
        />
        <DashboardCard
          label="Unrealized Gain/Loss"
          value={currencyFormatter.format(summary.unrealizedGain)}
          emphasis={summary.unrealizedGain < 0 ? "negative" : "positive"}
          tone="amber"
          helperText="Based on available cost basis"
        />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Asset Class Breakdown</h2>
          <p className="panel-subtitle">Start simple, then drill down by class.</p>
          <AssetClassTable totals={assetClassTotals} />
        </article>
        <article className="panel">
          <h2>Holdings Detail</h2>
          <p className="panel-subtitle">Summary-level today, tax-lot detail later.</p>
          <HoldingsTable snapshot={dummySnapshot} />
        </article>
      </section>
    </main>
  );
}
