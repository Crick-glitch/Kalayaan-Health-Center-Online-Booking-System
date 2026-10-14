// UsersPage.js - the Employees page (admin): Admin, Receptionist and Physician accounts. Patients have their own page.
// Search, Role and Status filters, sortable columns, 10 per page. The list is loaded once (up to 500 accounts) and searched, sorted and paged in the browser.
// Row actions: View, Edit, Status, Archive. A role is chosen when the account is created and never changes afterwards.
// You cannot change your own status or archive yourself (the API refuses, so those buttons are hidden).
import { useState } from 'react';
import { Avatar, Button, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import userService from '../../services/userService';
import appointmentService from '../../services/appointmentService';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { tablePager } from '../../components/common/AppPagination';
import StatusBadge from '../../components/common/StatusBadge';
import ChoiceModal from '../../components/common/ChoiceModal';
import ArchiveFlow from '../../components/common/ArchiveFlow';
import UserFormDrawer from '../../components/users/UserFormDrawer';
import handleApiError from '../../utils/handleApiError';
import { formatLong, toDateString } from '../../utils/dateUtils';
import { fullName, initials, roleLabel } from '../../utils/formatters';

const ROLES = ['admin', 'receptionist', 'doctor'].map((r) => ({ value: r, label: roleLabel(r) }));
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }];

export default function UsersPage() {
  const { user: me } = useAuth(), list = useFetch(() => userService.list({ limit: 500 }), []);
  const [q, setQ] = useState(''), [role, setRole] = useState(), [status, setStatus] = useState();
  const [form, setForm] = useState(null), [statusFor, setStatusFor] = useState(null), [archiveFor, setArchiveFor] = useState(null);
  const term = q.trim().toLowerCase();
  const rows = ((list.data && list.data.users) || []).filter((u) => u.role !== 'patient' && (!role || u.role === role) && (!status || u.accountStatus === status) && (!term || `${fullName(u)} ${u.email}`.toLowerCase().includes(term)));
  const changeStatus = async (value) => { try { await userService.setStatus(statusFor._id, value); message.success('Status changed.'); setStatusFor(null); list.reload(); } catch (e) { handleApiError(e); setStatusFor(null); } };
  // Appointments that would block archiving: for a physician, the ones with them.
  const countFor = async (u) => {
    if (u.role === 'doctor') { const p = (await providerService.list()).find((x) => x.userId === u._id || (x.user && x.user._id === u._id)); return p ? appointmentService.list({ providerId: p._id }) : []; }
    return [];
  };
  const columns = [
    { title: 'Name', sorter: (a, b) => fullName(a).localeCompare(fullName(b)), render: (_, u) => <Space><Avatar size={24}>{initials(u)}</Avatar><div>{fullName(u)}<br /><Typography.Text type="secondary">{u.email}</Typography.Text></div></Space> },
    { title: 'Role', sorter: (a, b) => a.role.localeCompare(b.role), render: (_, u) => <Tag color="blue">{roleLabel(u.role)}</Tag> },
    { title: 'Status', sorter: (a, b) => a.accountStatus.localeCompare(b.accountStatus), render: (_, u) => <StatusBadge type="account" status={u.accountStatus} /> },
    { title: 'Created', defaultSortOrder: 'descend', sorter: (a, b) => (a.createdAt < b.createdAt ? -1 : 1), render: (_, u) => formatLong(toDateString(u.createdAt)) },
    { title: 'Actions', align: 'right', render: (_, u) => (
      <Space size={4}><Link to={`/admin/employees/${u._id}`}>View</Link><Button type="link" size="small" onClick={() => setForm({ user: u })}>Edit</Button>
        {u._id !== me._id && <><Button type="link" size="small" onClick={() => setStatusFor(u)}>Status</Button><Button type="link" size="small" danger onClick={() => setArchiveFor(u)}>Archive</Button></>}</Space>) },
  ];
  return (
    <>
      <PageHeader title="Employees" description="Manage Admin, Receptionist and Physician accounts and their access." actions={<Button type="primary" onClick={() => setForm({ user: null })}>Add employee</Button>} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search by name or email" aria-label="Search employees" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
        <Select allowClear placeholder="Role" aria-label="Filter by role" style={{ width: 160 }} value={role} onChange={setRole} options={ROLES} />
        <Select allowClear placeholder="Status" aria-label="Filter by status" style={{ width: 160 }} value={status} onChange={setStatus} options={STATUSES} />
      </Space>
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading employees..." empty={!rows.length} emptyText="No employees found." emptyHint="Try different filters, or add an employee.">
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={tablePager(rows.length)} />
      </AsyncBoundary>
      <UserFormDrawer open={!!form} user={form && form.user} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />
      <ChoiceModal open={!!statusFor} title="Change status" label="New status" okText="Change status" current={statusFor && statusFor.accountStatus} options={STATUSES} onConfirm={changeStatus} onCancel={() => setStatusFor(null)}>
        {statusFor && <>{fullName(statusFor)} is <strong>{statusFor.accountStatus}</strong>. Inactive and suspended employees cannot log in.</>}
      </ChoiceModal>
      <ArchiveFlow open={!!archiveFor} kind="employee" name={archiveFor ? fullName(archiveFor) : ''} onCount={() => countFor(archiveFor)} onArchive={(reason) => userService.archive(archiveFor._id, reason)}
        link={archiveFor && archiveFor.role === 'doctor' ? '/admin/appointments' : undefined} onClose={() => setArchiveFor(null)} onDone={() => { setArchiveFor(null); list.reload(); }}>
        {archiveFor && archiveFor.role === 'doctor' && <Typography.Text>This also archives the physician's profile. Restoring the account restores both.</Typography.Text>}
      </ArchiveFlow>
    </>
  );
}