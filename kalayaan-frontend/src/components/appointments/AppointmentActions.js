// AppointmentActions.js - the buttons a user may press for one appointment. The list comes from getAvailableActions()
// (the same rules the API enforces). Cancel and Reject ask for a reason first. Used by every role's lists and dashboards.
// compact (table rows): forward steps stay as buttons, everything else goes into a "More actions" menu.
import { useState } from 'react';
import { Button, Dropdown, Space, Typography, message } from 'antd';
import { CheckCircleOutlined, CloseOutlined, InboxOutlined, LoginOutlined, MoreOutlined, StopOutlined, SwapOutlined, TeamOutlined } from '@ant-design/icons';
import appointmentService from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import RescheduleModal from './RescheduleModal';
import handleApiError from '../../utils/handleApiError';
import { getAvailableActions } from '../../utils/appointmentRules';
import { formatLong, formatTimeRange } from '../../utils/dateUtils';

export default function AppointmentActions({ appointment: a, onDone, onOpen, hide = [], compact }) {
  const { user } = useAuth(), [modal, setModal] = useState(null); // 'cancel' | 'reject' | 'archive' | 'resched' (patient request) | 'move' (staff, direct) | null
  const has = (k) => getAvailableActions(a, user).includes(k) && !hide.includes(k);
  const run = async (fn, ok) => { try { await fn(); message.success(ok); } catch (e) { handleApiError(e); } setModal(null); onDone(); };
  const status = (s, ok, extra) => run(() => appointmentService.setStatus(a._id, { status: s, ...extra }), ok);
  // [key, label, options]: primary ones are the forward steps; go() is what the button does.
  const all = [
    ['confirm', 'Confirm', { primary: true, icon: <CheckCircleOutlined />, go: () => status('Confirmed', 'Appointment confirmed.') }],
    ['checkIn', 'Check In', { primary: true, icon: <LoginOutlined />, go: () => status('Checked In', 'Patient checked in.') }],
    ['startConsultation', 'Start Consultation', { primary: true, icon: <TeamOutlined />, go: () => status('In Consultation', 'Consultation started.') }],
    ['complete', 'Complete', { primary: true, go: () => onOpen && onOpen(a) }],
    ['applyReschedule', 'Apply', { primary: true, go: () => run(() => appointmentService.reschedule(a._id, { action: 'apply' }), 'Reschedule applied.') }],
    ['rejectReschedule', 'Reject', { danger: true, go: () => setModal('reject') }],
    ['requestReschedule', 'Request Reschedule', { icon: <SwapOutlined />, go: () => setModal('resched') }],
    ['reschedule', 'Reschedule', { icon: <SwapOutlined />, go: () => setModal('move') }],
    ['noShow', 'No Show', { danger: true, icon: <StopOutlined />, go: () => status('No Show', 'Marked as No Show.') }],
    ['archive', 'Archive', { icon: <InboxOutlined />, go: () => setModal('archive') }],
    ['cancel', user.role === 'patient' || a.status === 'Confirmed' ? 'Cancel' : 'Decline', { danger: true, icon: <CloseOutlined />, go: () => setModal('cancel') }],
  ].filter(([key]) => has(key));
  const inline = compact ? all.filter(([, , o]) => o.primary) : all, more = compact ? all.filter(([, , o]) => !o.primary) : [];
  return (
    <>
      <Space size={4} wrap>
        {inline.map(([key, label, o]) => <Button key={key} size="small" type={o.primary ? 'primary' : 'default'} danger={o.danger} icon={o.icon} onClick={o.go}>{label}</Button>)}
        {more.length > 0 && <Dropdown trigger={['click']} menu={{ items: more.map(([key, label, o]) => ({ key, label, icon: o.icon, danger: o.danger, onClick: o.go })) }}>
          <Button size="small" icon={<MoreOutlined />} aria-label="More actions" />
        </Dropdown>}
      </Space>
      <ConfirmModal open={modal === 'cancel' || modal === 'reject'} danger requireReason title={modal === 'reject' ? 'Reject reschedule request?' : 'Cancel this appointment?'} okText={modal === 'reject' ? 'Reject request' : 'Cancel appointment'}
        onCancel={() => setModal(null)} onConfirm={(reason) => (modal === 'reject' ? run(() => appointmentService.reschedule(a._id, { action: 'reject', reason }), 'Reschedule rejected.') : status('Cancelled', 'Appointment cancelled.', { reason }))}>
        <Typography.Text>{a.service && a.service.name} · {formatLong(a.date)} · {formatTimeRange(a.startTime, a.endTime)}</Typography.Text>
      </ConfirmModal>
      <ConfirmModal open={modal === 'archive'} requireReason title="Archive this appointment?" okText="Archive" onCancel={() => setModal(null)} onConfirm={(reason) => run(() => appointmentService.archive(a._id, reason), 'Appointment archived.')}>
        <Typography.Text>{a.referenceNo} · {a.service && a.service.name} · {formatLong(a.date)}. It moves to the Archive and can be restored later.</Typography.Text>
      </ConfirmModal>
      {has('requestReschedule') && <RescheduleModal appointment={a} open={modal === 'resched'} onClose={() => setModal(null)} onDone={() => { setModal(null); onDone(); }} />}
      {has('reschedule') && <RescheduleModal direct appointment={a} open={modal === 'move'} onClose={() => setModal(null)} onDone={() => { setModal(null); onDone(); }} />}
    </>
  );
}
