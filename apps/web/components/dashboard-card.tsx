interface DashboardCardProps {
  label: string;
  value: string;
  emphasis?: "positive" | "negative";
  tone?: "indigo" | "emerald" | "rose" | "amber";
  helperText?: string;
}

export function DashboardCard({
  label,
  value,
  emphasis,
  tone = "indigo",
  helperText
}: DashboardCardProps) {
  return (
    <article className={`card card-tone-${tone}`}>
      <h3 className="card-label">{label}</h3>
      <p className={emphasis}>{value}</p>
      {helperText ? <span className="card-helper-text">{helperText}</span> : null}
    </article>
  );
}
