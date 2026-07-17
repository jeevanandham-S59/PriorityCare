import React, { useEffect, useRef } from 'react';

const Modal = ({ open, onClose, title, children, footer, size = 'md', ...props }) => {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    contentRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = size === 'sm' ? '440px' : size === 'lg' ? '720px' : '560px';

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '1rem',
      }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
      {...props}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className="card"
        style={{
          width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto',
          padding: 0, animation: 'modalIn 0.2s ease',
        }}
      >
        <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.25rem', margin: 0, color: 'var(--primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.25rem 0.5rem', fontSize: '1.2rem', lineHeight: 1, borderRadius: '4px' }}
            aria-label="Close dialog"
          >
            \u00D7
          </button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
