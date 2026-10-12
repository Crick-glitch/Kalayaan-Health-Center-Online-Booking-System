// ConfirmModal.js - confirmation for important actions, with an optional (or required) reason.
// onConfirm(reason) should return a promise; the buttons stay disabled while it runs, so double clicks do nothing.
import { useEffect, useState } from 'react';
import { Button, Input, Modal, Typography } from 'antd';

export default function ConfirmModal({ open, title, children, okText = 'Confirm', danger, withReason, requireReason, reasonLabel = 'Reason', onConfirm, onCancel }) {
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  const submit = async () => {
    if (requireReason && reason.trim().length < 5) { setError('Enter at least 5 characters.'); return; }
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} title={title} width={480} maskClosable={false} onCancel={busy ? undefined : onCancel}
      footer={[<Button key="cancel" onClick={onCancel} disabled={busy}>Cancel</Button>, <Button key="ok" type="primary" danger={danger} loading={busy} onClick={submit}>{okText}</Button>]}>
      {children}
      {(withReason || requireReason) && (
        <div style={{ marginTop: 16 }}>
          <label htmlFor="confirm-reason">{requireReason && <span style={{ color: '#C0392B' }}>* </span>}{reasonLabel}{!requireReason && ' (optional)'}</label>
          <Input.TextArea id="confirm-reason" rows={3} value={reason} status={error ? 'error' : undefined} onChange={(e) => { setReason(e.target.value); setError(''); }} />
          {error && <Typography.Text type="danger">{error}</Typography.Text>}
        </div>
      )}
    </Modal>
  );
}
