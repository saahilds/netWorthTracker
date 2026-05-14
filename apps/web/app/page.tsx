import {
  accountLabels as sharedAccountLabels,
  dummyNetWorthHistory,
  dummySnapshot,
  summarizeByAssetClass,
  summarizeSnapshot,
  topMovers
} from "@networth/shared";
import { AssetClassPieChart } from "../components/asset-class-pie-chart";
import { AssetClassTable } from "../components/asset-class-table";
import { SignInButton, SignOutButton } from "../components/auth-buttons";
import { DashboardCard } from "../components/dashboard-card";
import { DailyMovers } from "../components/daily-movers";
import { HoldingsTable } from "../components/holdings-table";
import { NetWorthTrendChart } from "../components/net-worth-trend-chart";
import { PlaidConnectionPanel } from "../components/plaid-connection-panel";
import { getAuthSession } from "../lib/auth";
import { getDashboardPortfolioData } from "../lib/portfolio-data";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

const UNSUPPORTED_PLACEHOLDERS = ["Kalshi", "WEX", "HealthEquity", "Transamerica"];

export default async function HomePage() {
  const session = await getAuthSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const sessionUser = session?.user;

  if (!userId) {
    return (
      <main className="page">
        <section className="panel panel-span-wide auth-panel">
          <h1>Connect your accounts and track live net worth</h1>
          <p className="panel-subtitle">
            Sign in to begin onboarding, connect Plaid institutions, and sync balances,
            transactions, and holdings.
          </p>
          <SignInButton />
        </section>
      </main>
    );
  }

  const portfolioData = await getDashboardPortfolioData(userId);
  const snapshot = portfolioData.snapshot ?? dummySnapshot;
  const history = portfolioData.history.length > 0 ? portfolioData.history : dummyNetWorthHistory;
  const labelsByAccount =
    Object.keys(portfolioData.accountLabels).length > 0
      ? portfolioData.accountLabels
      : sharedAccountLabels(snapshot);

  const summary = summarizeSnapshot(snapshot);
  const assetClassTotals = summarizeByAssetClass(snapshot);
  const movers = topMovers(snapshot, 3);
  const asOf = timestampFormatter.format(new Date(snapshot.timestampIso));

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>Net Worth Tracker</h1>
          <p>
            As of {asOf}
            {portfolioData.snapshot ? "" : " (demo fallback while you onboard Plaid)"}
          </p>
        </div>
        <div className="header-actions">
          <p className="header-email">{sessionUser?.email ?? "Signed in"}</p>
          <SignOutButton />
        </div>
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
        <PlaidConnectionPanel
          connections={portfolioData.connections}
          unsupportedInstitutionPlaceholders={UNSUPPORTED_PLACEHOLDERS}
        />
        <article className="panel panel-span-wide">
          <h2>Net Worth Trend</h2>
          <p className="panel-subtitle">
            Hoverable performance chart with selectable time ranges and lines.
          </p>
          <NetWorthTrendChart history={history} accountLabels={labelsByAccount} />
        </article>
        <article className="panel">
          <h2>Asset Class Pie</h2>
          <p className="panel-subtitle">Hover slices for exact allocation values.</p>
          <AssetClassPieChart totals={assetClassTotals} />
        </article>
        <article className="panel">
          <h2>Asset Class Breakdown</h2>
          <p className="panel-subtitle">Start simple, then drill down by class.</p>
          <AssetClassTable totals={assetClassTotals} />
        </article>
        <article className="panel">
          <h2>Daily Leaderboard</h2>
          <p className="panel-subtitle">
            Top 3 positive and negative movers by daily percentage change.
          </p>
          <DailyMovers movers={movers} />
        </article>
        <article className="panel panel-span-wide">
          <h2>Holdings Detail</h2>
          <p className="panel-subtitle">Summary-level today, tax-lot detail later.</p>
          <HoldingsTable snapshot={snapshot} />
        </article>
      </section>
    </main>
  );
}
