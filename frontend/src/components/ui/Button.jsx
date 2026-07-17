import React from 'react';

const VARIANTS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
  ghost: 'btn btn-ghost',
};

const SIZES = {
  sm: { padding: '0.35rem 0.75rem', fontSize: '0.8rem' },
  md: { padding: '0.55rem 1.15rem', fontSize: '0.9rem' },
  lg: { padding: '0.7rem 1.5rem', fontSize: '1rem' },
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  className = '',
  fullWidth = false,
  ...props
}) => (
  <button
    type={type}
    className={`${VARIANTS[variant] || VARIANTS.primary} ${className}`}
    style={{
      ...SIZES[size] || SIZES.md,
      ...(fullWidth ? { width: '100%' } : {}),
      ...(loading ? { pointerEvents: 'none', opacity: 0.8 } : {}),
      ...style,
    }}
    disabled={disabled || loading}
    onClick={onClick}
    {...props}
  >
    {loading && <SpinnerIcon />}
    {children}
  </button>
);

const SpinnerIcon = () => (
  <span
    style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
      marginRight: '0.5rem',
      verticalAlign: 'middle',
    }}
    aria-hidden="true"
  />
);

export default Button;
