import React from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', loading = false }) => (
  <Modal open={open} onClose={onClose} title={title || 'Confirm'} size="sm">
    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
      {message}
    </p>
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
      <Button variant="secondary" onClick={onClose} fullWidth disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant={variant} onClick={onConfirm} fullWidth loading={loading}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

export default ConfirmDialog;
