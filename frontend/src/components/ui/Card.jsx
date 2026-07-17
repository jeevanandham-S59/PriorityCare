import React from 'react';

const Card = ({ children, className = '', accent, hover = false, style, ...props }) => (
  <div
    className={`card ${hover ? 'action-card' : ''} ${className}`}
    style={{
      ...(accent ? { borderLeft: `4px solid ${accent === 'primary' ? 'var(--primary)' : 'var(--accent)'}` } : {}),
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

export default Card;
