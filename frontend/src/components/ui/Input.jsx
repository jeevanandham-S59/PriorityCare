import React from 'react';

const Input = ({
  label,
  error,
  helperText,
  required = false,
  id,
  className = '',
  style,
  type = 'text',
  ...props
}) => {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="form-group" style={style}>
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
          {required && <span style={{ color: 'var(--priority-critical)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      {type === 'select' ? (
        <select
          id={inputId}
          className={`form-control ${error ? 'form-control--error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          required={required}
          {...props}
        />
      ) : type === 'textarea' ? (
        <textarea
          id={inputId}
          className={`form-control ${error ? 'form-control--error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          required={required}
          {...props}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          className={`form-control ${error ? 'form-control--error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          required={required}
          {...props}
        />
      )}
      {error && (
        <div id={errorId} className="form-field-error" role="alert">
          {error}
        </div>
      )}
      {helperText && !error && (
        <div id={helperId} className="form-field-helper">
          {helperText}
        </div>
      )}
    </div>
  );
};

const Checkbox = ({ label, id, error, style, ...props }) => {
  const inputId = id || `checkbox-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label className="form-check" htmlFor={inputId} style={style}>
      <input id={inputId} type="checkbox" className="form-check-input" {...props} />
      <span className="form-check-label">{label}</span>
      {error && <span className="form-field-error" style={{ marginLeft: '0.5rem' }}>{error}</span>}
    </label>
  );
};

export { Checkbox };
export default Input;
