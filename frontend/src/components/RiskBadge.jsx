/**
 * Risk Badge Component
 * Color-coded risk level indicator with pulsing emergency animation
 */
import './RiskBadge.css';

const riskConfig = {
  low: { label: 'Low Risk', icon: '✓' },
  medium: { label: 'Medium Risk', icon: '⚠' },
  high: { label: 'High Risk', icon: '⚡' },
  emergency: { label: 'Emergency', icon: '🚨' },
};

const RiskBadge = ({ level, size = 'md' }) => {
  const config = riskConfig[level] || riskConfig.low;

  return (
    <span className={`badge badge-${level} risk-badge-${size}`} id={`risk-badge-${level}`}>
      <span className="risk-badge-icon">{config.icon}</span>
      {config.label}
    </span>
  );
};

export default RiskBadge;
