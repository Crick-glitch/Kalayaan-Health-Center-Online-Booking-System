// PatientHistoryDrawer.js - read-only record of one patient: details plus their appointments (newest first).
// The API limits a doctor to appointments with themselves. basePath is the portal ("/staff", "/doctor", "/admin") used for the View links.
import { Drawer, Descriptions, Grid, List, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../common/AsyncBoundary';
import StatusBadge from '../common/StatusBadge';
import { formatLong, formatTimeRange } from '../../utils/dateUtils';
import { apptDoctor, fullName } from '../../utils/formatters';

export default function PatientHistoryDrawer({ open, patient: p, onClose, basePath }) {
  const wide = !!Grid.useBreakpoint().sm;
  const hist = useFetch(() => (open && p ? appointmentService.list({ patientId: p._id }) : Promise.resolve([])), [open, p && p._id]);
  const rows = [...(hist.data || [])].sort((x, y) => (`${x.date} ${x.startTime}` < `${y.date} ${y.startTime}` ? 1 : -1));
  const e = (p && p.emergencyContact) || {};
  return (
    <Drawer open={open} onClose={onClose} width={wide ? 480 : '100%'} title={p ? fullName(p) : 'Patient'} destroyOnClose>
      {p && <>
        <Descriptions column={1} size="small" bordered items={[
          { label: 'Date of birth', children: formatLong(p.dateOfBirth) }, { label: 'Sex', children: p.sex || '—' }, { label: 'Contact', children: p.contactNumber }, { label: 'Email', children: p.email }, { label: 'Address', children: p.address || '—' },
          ...(e.name ? [{ label: 'Emergency contact', children: `${e.name} (${e.relationship}) · ${e.contactNumber}` }] : [])]} />
        <Typography.Title level={5} style={{ color: '#0B2545', marginTop: 24 }}>Appointments</Typography.Title>
        <AsyncBoundary loading={hist.loading} error={hist.error} onRetry={hist.reload} loadingText="Loading history..." empty={!rows.length} emptyText="No appointments yet." emptyHint="Visits will appear here.">
          <List dataSource={rows} renderItem={(a) => (
            <List.Item key={a._id}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space wrap><Link to={`${basePath}/appointments/${a._id}`} onClick={onClose}>{a.referenceNo}</Link><StatusBadge status={a.status} /></Space>
                <Typography.Text>{a.service && a.service.name} · {apptDoctor(a)}</Typography.Text>
                <Typography.Text type="secondary">{formatLong(a.date)} · {formatTimeRange(a.startTime, a.endTime)}</Typography.Text>
              </Space>
            </List.Item>)} />
        </AsyncBoundary>
      </>}
    </Drawer>
  );
}
