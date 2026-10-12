// ArchiveFlow.js - archive one record the safe way.
// 1. It first counts the upcoming appointments that depend on the record. If there are any, the "Archive blocked" warning shows
//    straight away (with a link to those appointments) and NO confirm dialog appears.
// 2. Otherwise it asks for a reason and archives. If the server still refuses (someone booked in between), the same warning shows.
// onCount() returns the list of the record's appointments, onArchive(reason) calls the API, link is the filtered appointments list.
import { useEffect, useState } from 'react';
import { Button, Modal, Typography, message } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import handleApiError from '../../utils/handleApiError';
import { ACTIVE_STATUSES } from '../../utils/appointmentRules';
import { todayString } from '../../utils/dateUtils';

const upcoming = (list) => list.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.date >= todayString()).length;

// The warning shown when something has upcoming appointments. title: "Archive blocked" or, for a role change, "Role change blocked".
export function BlockedModal({ open, title = 'Archive blocked', kind, count, link, onClose }) {
  return (
    <Modal open={open} title={<><WarningOutlined style={{ color: '#B7791F', marginRight: 8 }} />{title}</>} onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>}>
      <Typography.Paragraph>This {kind} has {count} upcoming appointment{count === 1 ? '' : 's'}.</Typography.Paragraph>
      <Typography.Paragraph>Cancel or complete them first, then try again. {link && <Link to={link} onClick={onClose}>View these appointments</Link>}</Typography.Paragraph>
    </Modal>
  );
}

export default function ArchiveFlow({ open, kind, name, children, onCount, onArchive, link, onClose, onDone }) {
  const [phase, setPhase] = useState(null), [count, setCount] = useState(0); // null | 'checking' | 'confirm' | 'blocked'
  useEffect(() => {
    if (!open) { setPhase(null); return undefined; }
    let live = true; setPhase('checking');
    onCount().then((list) => { if (!live) return; const n = upcoming(list); setCount(n); setPhase(n ? 'blocked' : 'confirm'); })
      .catch((e) => { if (live) { handleApiError(e); onClose(); } });
    return () => { live = false; };
  // The check runs again whenever the dialog opens or the record changes.
  }, [open, name]); // eslint-disable-line react-hooks/exhaustive-deps
  const archive = async (reason) => {
    try { await onArchive(reason); message.success(`${name} archived.`); onDone(); }
    catch (e) { if (e.code === 'HAS_DEPENDENCIES') { setCount(e.count || 1); setPhase('blocked'); } else { handleApiError(e); onClose(); } }
  };
  return (
    <>
      <ConfirmModal open={phase === 'confirm'} danger requireReason title={`Archive ${kind}?`} okText="Archive" onCancel={onClose} onConfirm={archive}>
        <Typography.Paragraph strong style={{ marginBottom: 4 }}>{name}</Typography.Paragraph>
        {children || <Typography.Text>It moves to the Archive and can be restored later.</Typography.Text>}
      </ConfirmModal>
      <BlockedModal open={phase === 'blocked'} kind={kind} count={count} link={link} onClose={onClose} />
    </>
  );
}
