// UsersPage.js - all user accounts (admin). Search, Role and Status filters, sortable columns, 10 per page.
// The small clinic list is loaded once (up to 500 users) and searched, sorted and paged in the browser, so sorting covers every user.
// Row menu: Change status, Change role, Archive. You cannot change your own role, status or archive state (the API refuses, so the menu hides them).
import { useState } from 'react';
import { Avatar, Button, Dropdown, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { InboxOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import userService from '../../services/userService';
import appointmentService from '../../services/appointmentService';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import ChoiceModal from '../../components/common/ChoiceModal';
import ArchiveFlow, { BlockedModal } from '../../components/common/ArchiveFlow';
import UserFormDrawer from '../../components/users/UserFormDrawer';
import handleApiError from '../../utils/handleApiError';
import { formatLong, toDateString } from '../../utils/dateUtils';
import { fullName, initials, roleLabel } from '../../utils/formatters';

const ROLES = ['patient', 'doctor', 'receptionist', 'admin'].map((r) => ({ value: r, label: roleLabel(r) }));
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }];

export default function UsersPage() {
  const { user: me } = useAuth(), list = useFetch(() => userService.list({ limit: 500 }), []);
  const [q, setQ] = useState(''), [role, setRole] = useState(), [status, setStatus] = useState();
  const [form, setForm] = useState(null), [statusFor, setStatusFor] = useState(null), [roleFor, setRoleFor] = useState(null), [archiveFor, setArchiveFor] = useState(null), [blocked, setBlocked] = useState(null);
  const term = q.trim().toLowerCase();
  const rows = ((list.data && list.data.users) || []).filter((u) => (!role || u.role === role) && (!status || u.accountStatus === status) && (!term || `${fullName(u)} ${u.email}`.toLowerCase().includes(term)));
  const changeStatus = async (value) => { try { await userService.setStatus(statusFor._id, value); message.success('Status changed.'); setStatusFor(null); list.reload(); } catch (e) { handleApiError(e); setStatusFor(null); } };
  const changeRole = async (value) => {
    try { await userService.setRole(roleFor._id, value); message.success('Role changed.'); setRoleFor(null); list.reload(); }
    catch (e) { if (e.code === 'HAS_DEPENDENCIES') { setBlocked({ user: roleFor, count: e.count }); setRoleFor(null); } else { handleApiError(e); setRoleFor(null); } }
  };
  // Appointments that would block archiving: as a patient, or (for a doctor) as the provider.
  const countFor = async (u) => {
    if (u.role === 'patient') return appointmentService.list({ patientId: u._id });
    if (u.role === 'doctor') { const p = (await providerService.list()).find((x) => x.userId === u._id || (x.user && x.user._id === u._id)); return p ? appointmentService.list({ providerId: p._id }) : []; }
    return [];
  };
  const columns = [
    { title: 'Name', sorter: (a, b) => fullName(a).localeCompare(fullName(b)), render: (_, u) => <Space><Avatar size={24}>{initials(u)}</Avatar><div>{fullName(u)}<br /><Typography.Text type="secondary">{u.email}</Typography.Text></div></Space> },
    { title: 'Role', sorter: (a, b) => a.role.localeCompare(b.role), render: (_, u) => <Tag color="blue">{roleLabel(u.role)}</Tag> },
    { title: 'Status', sorter: (a, b) => a.accountStatus.localeCompare(b.accountStatus), render: (_, u) => <StatusBadge type="account" status={u.accountStatus} /> },
    { title: 'Created', defaultSortOrder: 'descend', sorter: (a, b) => (a.createdAt < b.createdAt ? -1 : 1), render: (_, u) => formatLong(toDateString(u.createdAt)) },
    { title: 'Actions', align: 'right', render: (_, u) => (
      <Space size={4}><Link to={`/admin/users/${u._id}`}>View</Link><Button type="link" size="small" onClick={() => setForm({ user: u })}>Edit</Button>
        {u._id !== me._id && <Dropdown trigger={['click']} menu={{ items: [
          { key: 'status', label: 'Change status', onClick: () => setStatusFor(u) }, { key: 'role', label: 'Change role', onClick: () => setRoleFor(u) },
          { key: 'archive', label: 'Archive', icon: <InboxOutlined />, danger: true, onClick: () => setArchiveFor(u) }] }}>
          <Button size="small" icon={<MoreOutlined />} aria-label={`More actions for ${fullName(u)}`} /></Dropdown>}</Space>) },
  ];
  return (
    <>
      <PageHeader title="Users" description="Manage accounts, roles and access." actions={<Button type="primary" onClick={() => setForm({ user: null })}>Add user</Button>} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search by name or email" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
        <Select allowClear placeholder="Role" aria-label="Filter by role" style={{ width: 160 }} value={role} onChange={setRole} options={ROLES} />
        <Select allowClear placeholder="Status" aria-label="Filter by status" style={{ width: 160 }} value={status} onChange={setStatus} options={STATUSES} />
      </Space>
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading users..." empty={!rows.length} emptyText="No users found." emptyHint="Try different filters, or add a user.">
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }} />
      </AsyncBoundary>
      <UserFormDrawer open={!!form} user={form && form.user} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />
      <ChoiceModal open={!!statusFor} title="Change status" label="New status" okText="Change status" current={statusFor && statusFor.accountStatus} options={STATUSES} onConfirm={changeStatus} onCancel={() => setStatusFor(null)}>
        {statusFor && <>{fullName(statusFor)} is <strong>{statusFor.accountStatus}</strong>. Inactive and suspended users cannot log in.</>}
      </ChoiceModal>
      <ChoiceModal open={!!roleFor} title="Change role" label="New role" okText="Change role" current={roleFor && roleFor.role} options={ROLES} onConfirm={changeRole} onCancel={() => setRoleFor(null)}>
        {roleFor && <>{fullName(roleFor)} is a <strong>{roleLabel(roleFor.role)}</strong>. Changing to Doctor creates an empty provider profile; changing away from Doctor archives it. This is blocked while the user has upcoming appointments.</>}
      </ChoiceModal>
      <BlockedModal open={!!blocked} title="Role change blocked" kind="user" count={blocked && blocked.count} link={blocked && `/admin/appointments?${blocked.user.role === 'doctor' ? 'providerId' : 'patientId'}=${blocked.user._id}`} onClose={() => setBlocked(null)} />
      <ArchiveFlow open={!!archiveFor} kind="user" name={archiveFor ? fullName(archiveFor) : ''} onCount={() => countFor(archiveFor)} onArchive={(reason) => userService.archive(archiveFor._id, reason)}
        link={archiveFor && `/admin/appointments?patientId=${archiveFor._id}`} onClose={() => setArchiveFor(null)} onDone={() => { setArchiveFor(null); list.reload(); }} />
    </>
  );
}
