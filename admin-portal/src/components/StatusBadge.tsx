interface StatusBadgeProps {
  status?: string;
}

const StatusBadge = ({ status = 'pending' }: StatusBadgeProps) => {
  const normalized = status.toLowerCase();
  return <span className={`status-badge status-badge--${normalized}`}>{status}</span>;
};

export default StatusBadge;

