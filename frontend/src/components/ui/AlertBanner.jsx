import React, { useState } from 'react';

const VARIANTS = {
  error: {
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    color: '#b91c1c',
    icon: '\u26A0\uFE0F',
  },
  success: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    icon: '\u2705',
  },
  warning: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#a16207',
    icon: '\u26A0\uFE0F',
  },
  info: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    icon: '\u2139\uFE0F',
  },
};

const AlertBanner = ({ variant = 'info', children, dismissable = false, style, ...props }) => {
  const [dismissed, setDismissed] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.info;

  if (dismissed) return null;

  return (
    <div
      role="alert"
      style={{
        background: v.background,
        border: v.border,
        color: v.color,
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        fontSize: '0.85rem',
        fontWeight: 500,
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        ...style,
      }}
      {...props}
    >
      <span aria-hidden="true" style={{ flexShrink: 0 }}>{v.icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {dismissable && (
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'inherit', fontSize: '1rem', padding: '0 0.25rem',
            flexShrink: 0, fontWeight: 700,
          }}
          aria-label="Dismiss"
        >
          \u00D7
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
