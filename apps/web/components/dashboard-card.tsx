interface DashboardCardProps {
  label: string;
  value: string;
  emphasis?: "positive" | "negative";
}

export function DashboardCard({ label, value, emphasis }: DashboardCardProps) {
  return (
    <article className="card">
      <h3>{label}</h3>
      <p className={emphasis}>{value}</p>
    </article>
  );
}
