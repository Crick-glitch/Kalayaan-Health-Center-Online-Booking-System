// ConfirmModal.js - confirmation for important actions, with an optional (or required) reason.
// onConfirm(reason) should return a promise; the buttons stay disabled while it runs, so double clicks do nothing.
import { useEffect, useState } from 'react';
import { Button, Input, Modal, Typography } from 'antd';
import { textProblem } from '../../utils/validators';

export default function ConfirmModal({ open, title, children, okText = 'Confirm', danger, withReason, requireReason, reasonLabel = 'Reason', onConfirm, onCancel }) {
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [touched, setTouched] = useState(false);
  const problem = error || (requireReason && touched ? textProblem(reason, 5, 500) : ''); // checked while typing
  useEffect(() => { if (open) { setReason(''); setError(''); setTouched(false); } }, [open]);
  const submit = async () => {
    if (requireReason && reason.trim().length < 5) { setTouched(true); setError('Enter at least 5 characters.'); return; }
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
          <Input.TextArea id="confirm-reason" rows={3} maxLength={500} value={reason} status={problem ? 'error' : undefined} onChange={(e) => { setReason(e.target.value); setTouched(true); setError(''); }} />
          {problem && <Typography.Text type="danger">{problem}</Typography.Text>}
        </div>
      )}
    </Modal>
  );
}
