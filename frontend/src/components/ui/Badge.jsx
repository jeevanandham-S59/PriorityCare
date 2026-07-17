import React from 'react';

const PRIORITY_CLASSES = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

const STATUS_STYLES = {
  pending: { bg: '#fef9c3', color: '#a16207', label: 'Pending Review' },
  assigned: { bg: '#e0f2fe', color: '#0369a1', label: 'Scheduled' },
  confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
  completed: { bg: '#f1f5f9', color: '#475569', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' },
};

const Badge = ({ children, variant, className = '', style, ...props }) => {
  const cls = variant && PRIORITY_CLASSES[variant] ? PRIORITY_CLASSES[variant] : '';
  return (
    <span className={`badge ${cls} ${className}`} style={style} {...props}>
      {children}
    </span>
  );
};

const StatusBadge = ({ status, style, ...props }) => {
  const st = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className="badge"
      style={{ background: st.bg, color: st.color, ...style }}
      {...props}
    >
      {st.label}
    </span>
  );
};

const PriorityDot = ({ level }) => {
  const colors = {
    Critical: 'var(--priority-critical)',
    High: 'var(--priority-high)',
    Medium: 'var(--priority-medium)',
    Low: 'var(--priority-low)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: colors[level] || colors.Low,
        marginRight: '0.5rem',
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
};

export { StatusBadge, PriorityDot, PRIORITY_CLASSES, STATUS_STYLES };
export default Badge;
