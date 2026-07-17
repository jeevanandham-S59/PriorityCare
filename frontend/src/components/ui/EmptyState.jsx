import React from 'react';

const EmptyState = ({ icon, title, description, action }) => (
  <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
    {icon && <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>}
    <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '0.5rem', color: 'var(--text-main)' }}>
      {title || 'No items found'}
    </h3>
    {description && (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: '1.5rem' }}>{action}</div>}
  </div>
);

export default EmptyState;
