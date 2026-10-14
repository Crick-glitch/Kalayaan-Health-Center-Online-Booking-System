// UserDetailsPage.js - one user (admin): breadcrumb, name with role and status tags, tabs Info and Appointments.
// A patient's tab lists their appointments; a doctor's lists the appointments with them; other roles have none.
import { Breadcrumb, Descriptions, Space, Table, Tabs, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router-dom';
import userService from '../../services/userService';
import appointmentService from '../../services/appointmentService';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { tablePager } from '../../components/common/AppPagination';
import StatusBadge from '../../components/common/StatusBadge';
import { formatLong, formatTimeRange, toDateString } from '../../utils/dateUtils';
import { apptDoctor, fullName, roleLabel } from '../../utils/formatters';

export default function UserDetailsPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(async () => {
    const u = await userService.get(id); let appts = [];
    if (u.role === 'patient') appts = await appointmentService.list({ patientId: u._id });
    else if (u.role === 'doctor') { const p = (await providerService.list()).find((x) => x.userId === u._id || (x.user && x.user._id === u._id)); if (p) appts = await appointmentService.list({ providerId: p._id }); }
    return { u, appts };
  }, [id]);
  const u = data && data.u, e = (u && u.emergencyContact) || {};
  const columns = [
    { title: 'Reference', render: (_, a) => <Link to={`/admin/appointments/${a._id}`}>{a.referenceNo}</Link> }, { title: 'Service', render: (_, a) => a.service && a.service.name },
    { title: u && u.role === 'doctor' ? 'Patient' : 'Physician', render: (_, a) => (u && u.role === 'doctor' ? fullName(a.patient) : apptDoctor(a)) },
    { title: 'Date and time', render: (_, a) => `${formatLong(a.date)} · ${formatTimeRange(a.startTime, a.endTime)}` }, { title: 'Status', render: (_, a) => <StatusBadge status={a.status} /> },
  ];
  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading employee..." empty={!u} emptyText="Employee not found.">
      {u && <>
        <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: <Link to="/admin/employees">Employees</Link> }, { title: fullName(u) }]} />
        <Space wrap align="center" style={{ marginBottom: 16 }}>
          <Typography.Title level={2} style={{ margin: 0, color: '#0B2545' }}>{fullName(u)}</Typography.Title>
          <Tag color="blue">{roleLabel(u.role)}</Tag><StatusBadge type="account" status={u.accountStatus} />{u.isArchived && <Tag>Archived</Tag>}
        </Space>
        <Tabs items={[
          { key: 'info', label: 'Info', children: <Descriptions bordered column={{ xs: 1, sm: 2 }} items={[
            { label: 'Email', children: u.email }, { label: 'Contact number', children: u.contactNumber || '—' }, { label: 'Date of birth', children: formatLong(u.dateOfBirth) }, { label: 'Sex', children: u.sex || '—' },
            { label: 'Address', span: 2, children: u.address || '—' }, ...(u.role === 'patient' ? [{ label: 'Emergency contact', span: 2, children: e.name ? `${e.name} (${e.relationship}) · ${e.contactNumber}` : '—' }] : []),
            { label: 'Created', children: formatLong(toDateString(u.createdAt)) }, { label: 'Last login', children: u.lastLoginAt ? formatLong(toDateString(u.lastLoginAt)) : 'Never' }]} /> },
          { key: 'appointments', label: `Appointments (${data.appts.length})`, children: ['patient', 'doctor'].includes(u.role)
            ? <Table rowKey="_id" size="small" columns={columns} dataSource={[...data.appts].sort((a, b) => (`${a.date} ${a.startTime}` < `${b.date} ${b.startTime}` ? 1 : -1))} scroll={{ x: 'max-content' }} pagination={tablePager(data.appts.length)} locale={{ emptyText: 'No appointments yet.' }} />
            : <Typography.Text type="secondary">This role has no appointments.</Typography.Text> },
        ]} />
      </>}
    </AsyncBoundary>
  );
}
