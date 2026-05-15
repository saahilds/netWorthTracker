import type { TopMovers } from "@networth/shared";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

interface DailyMoversProps {
  movers: TopMovers;
}

export function DailyMovers({ movers }: DailyMoversProps) {
  const formatPercent = (value: number) => {
    const decimal = value / 100;
    return value > 0 ? `+${percentFormatter.format(decimal)}` : percentFormatter.format(decimal);
  };

  return (
    <div className="leaderboard-grid">
      <article className="leaderboard-card leaderboard-card-gainers">
        <h3>Top Gainers</h3>
        <ol>
          {movers.gainers.map((mover) => (
            <li key={mover.id}>
              <div>
                <strong>{mover.symbol ?? mover.name}</strong>
                <span>{mover.institution}</span>
              </div>
              <div>
                <strong className="positive">{formatPercent(mover.dayChangePct)}</strong>
                <span>{currencyFormatter.format(mover.value)}</span>
              </div>
            </li>
          ))}
        </ol>
      </article>
      <article className="leaderboard-card leaderboard-card-losers">
        <h3>Top Losers</h3>
        <ol>
          {movers.losers.map((mover) => (
            <li key={mover.id}>
              <div>
                <strong>{mover.symbol ?? mover.name}</strong>
                <span>{mover.institution}</span>
              </div>
              <div>
                <strong className="negative">{formatPercent(mover.dayChangePct)}</strong>
                <span>{currencyFormatter.format(mover.value)}</span>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
