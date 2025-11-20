interface StatCardProps {
  label: string;
  value: string;
  subLabel: string;
  trend: number;
}

const StatCard = ({ label, value, subLabel, trend }: StatCardProps) => {
  const isPositive = trend >= 0;

  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <div className="stat-card__value-row">
        <p className="stat-card__value">{value}</p>
        <span className={`stat-card__trend ${isPositive ? 'up' : 'down'}`}>
          {isPositive ? '+' : ''}
          {trend}%
        </span>
      </div>
      <p className="stat-card__sublabel">{subLabel}</p>
    </div>
  );
};

export default StatCard;

