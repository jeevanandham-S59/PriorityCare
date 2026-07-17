import React from 'react';

const PageHeader = ({ title, subtitle, actions, style }) => (
  <div
    style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem',
      ...style,
    }}
  >
    <div>
      <h1 style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export default PageHeader;
