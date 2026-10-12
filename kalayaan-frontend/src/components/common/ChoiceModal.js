// ChoiceModal.js - "pick one option, then confirm" (change a user's status or role). OK stays disabled until the choice differs from the current one.
import { useEffect, useState } from 'react';
import { Modal, Select, Typography } from 'antd';

export default function ChoiceModal({ open, title, label, options, current, okText = 'Save', children, onConfirm, onCancel }) {
  const [value, setValue] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setValue(null); }, [open]);
  const go = async () => { setBusy(true); try { await onConfirm(value); } finally { setBusy(false); } };
  return (
    <Modal open={open} title={title} okText={okText} confirmLoading={busy} okButtonProps={{ disabled: !value || value === current }} maskClosable={false} onOk={go} onCancel={busy ? undefined : onCancel}>
      {children && <Typography.Paragraph>{children}</Typography.Paragraph>}
      <label htmlFor="choice-select" style={{ display: 'block', marginBottom: 4 }}>{label}</label>
      <Select id="choice-select" style={{ width: '100%' }} placeholder="Choose..." value={value} onChange={setValue} options={options.map((o) => ({ ...o, disabled: o.value === current }))} />
    </Modal>
  );
}
