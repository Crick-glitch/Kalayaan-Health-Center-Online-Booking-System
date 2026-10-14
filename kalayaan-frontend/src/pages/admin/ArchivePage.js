// ArchivePage.js - everything that was archived, with Restore (admin). Records are never deleted: archiving hides them, restoring brings them back.
// Tabs: Employees (Admin, Receptionist, Physician), Patients, Services and Appointments. A physician profile and its account share one row (restoring one restores both).
// A restore can be refused (for example an active service already uses the name): the API's message is shown as an error toast.
import { useState } from 'react';
import { Button, Descriptions, Drawer, Grid, Input, Segmented, Space, Table, Tag, Typography, message } from 'antd';
import { SearchOutlined, UndoOutlined } from '@ant-design/icons';
import archiveService from '../../services/archiveService';
import userService from '../../services/userService';
import providerService from '../../services/providerService';
import serviceService from '../../services/serviceService';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { tablePager } from '../../components/common/AppPagination';
import ConfirmModal from '../../components/common/ConfirmModal';
import handleApiError from '../../utils/handleApiError';
import { statusLabel } from '../../config/constants';
import { formatDateTime, formatLong, formatTimeRange } from '../../utils/dateUtils';
import { roleLabel } from '../../utils/formatters';

const TYPES = { employee: 'Employee', patient: 'Patient', service: 'Service', appointment: 'Appointment' };
const RESTORE = { user: userService.restore, provider: providerService.restore, service: serviceService.restore, appointment: appointmentService.restore };
// The API sends user | provider | service | appointment. The page groups them: a physician profile and any non-patient account are Employees.
const kindOf = (r) => (r.type === 'provider' || (r.type === 'user' && (r.record || {}).role !== 'patient') ? 'employee' : r.type === 'user' ? 'patient' : r.type);
const typeText = (r) => (r.type === 'provider' ? 'Physician' : r.type === 'user' && kindOf(r) === 'employee' ? roleLabel(r.record.role) : TYPES[kindOf(r)]);
// A few facts about the archived record, for the read-only drawer.
const facts = (r) => {
  const d = r.record || {};
  if (r.type === 'user') return [['Email', d.email], ['Role', roleLabel(d.role)], ['Account status', d.accountStatus]];
  if (r.type === 'provider') return [['Title', d.title || '—'], ['Specialization', d.specialization || '—']];
  if (r.type === 'service') return [['Category', d.category], ['Duration', `${d.durationMinutes} min`], ['Requirements', d.requirements || '—']];
  return [['Reference', d.referenceNo], ['Date and time', `${formatLong(d.date)} · ${formatTimeRange(d.startTime, d.endTime)}`], ['Status', statusLabel(d.status)]];
};

export default function ArchivePage() {
  const list = useFetch(() => archiveService.list(), []), wide = !!Grid.useBreakpoint().sm;
  const [type, setType] = useState('all'), [q, setQ] = useState(''), [view, setView] = useState(null), [restoreFor, setRestoreFor] = useState(null);
  const all = (list.data && list.data.rows) || [], term = q.trim().toLowerCase();
  const rows = all.filter((r) => (type === 'all' || kindOf(r) === type) && (!term || r.name.toLowerCase().includes(term)));
  const count = (k) => (k === 'all' ? all.length : all.filter((r) => kindOf(r) === k).length);
  const restore = async () => {
    try { await RESTORE[restoreFor.type](restoreFor._id); message.success(`${restoreFor.name} restored.`); setRestoreFor(null); list.reload(); }
    catch (e) { handleApiError(e); setRestoreFor(null); } // for example "Cannot restore: an active service already has this name."
  };
  const columns = [
    { title: 'Type', render: (_, r) => <Tag>{typeText(r)}</Tag> }, { title: 'Name', dataIndex: 'name' },
    { title: 'Archived', render: (_, r) => formatDateTime(r.archivedAt) }, { title: 'Archived by', render: (_, r) => r.archivedBy || '—' },
    { title: 'Reason', width: 220, render: (_, r) => <Typography.Text ellipsis={{ tooltip: r.reason }} style={{ maxWidth: 200 }}>{r.reason || '—'}</Typography.Text> },
    { title: 'Actions', align: 'right', render: (_, r) => <Space size={4}><Button type="link" size="small" onClick={() => setView(r)}>View</Button><Button size="small" icon={<UndoOutlined />} onClick={() => setRestoreFor(r)}>Restore</Button></Space> },
  ];
  return (
    <>
      <PageHeader title="Archive" description="Archived records are hidden, never deleted. Restore one to bring it back." />
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented value={type} onChange={setType} options={[{ value: 'all', label: `All (${count('all')})` }, { value: 'employee', label: `Employees (${count('employee')})` }, { value: 'patient', label: `Patients (${count('patient')})` }, { value: 'service', label: `Services (${count('service')})` }, { value: 'appointment', label: `Appointments (${count('appointment')})` }]} />
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search the archive" aria-label="Search the archive" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
      </Space>
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading the archive..." empty={!rows.length} emptyText="Nothing archived." emptyHint="Archived employees, patients, services and appointments appear here.">
        <Table rowKey={(r) => `${r.type}-${r._id}`} columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={tablePager(rows.length)} />
      </AsyncBoundary>
      <Drawer open={!!view} onClose={() => setView(null)} width={wide ? 480 : '100%'} title={view ? view.name : ''} destroyOnClose>
        {view && <Descriptions column={1} bordered size="small" items={[{ label: 'Type', children: typeText(view) }, ...facts(view).map(([label, children]) => ({ label, children })),
          { label: 'Archived', children: formatDateTime(view.archivedAt) }, { label: 'Archived by', children: view.archivedBy || '—' }, { label: 'Reason', children: view.reason || '—' }]} />}
      </Drawer>
      <ConfirmModal open={!!restoreFor} title={`Restore this ${restoreFor ? TYPES[kindOf(restoreFor)].toLowerCase() : 'record'}?`} okText="Restore" onConfirm={restore} onCancel={() => setRestoreFor(null)}>
        {restoreFor && <><strong>{restoreFor.name}</strong><div>{restoreFor.type === 'provider' ? 'The linked physician account is restored too.' : 'It returns to its normal list.'}</div></>}
      </ConfirmModal>
    </>
  );
}