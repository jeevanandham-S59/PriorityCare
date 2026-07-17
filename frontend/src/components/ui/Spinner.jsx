import React from 'react';

const Spinner = ({ text = 'Loading...', size = 'md', style }) => {
  const dim = size === 'sm' ? 20 : size === 'lg' ? 48 : 32;
  const border = size === 'sm' ? 2 : size === 'lg' ? 4 : 3;
  return (
    <div
      role="status"
      aria-label={text}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '0.75rem', padding: '2rem',
        ...style,
      }}
    >
      <div
        style={{
          width: dim, height: dim, border: `${border}px solid var(--border-color)`,
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{text}</span>
    </div>
  );
};

export default Spinner;
