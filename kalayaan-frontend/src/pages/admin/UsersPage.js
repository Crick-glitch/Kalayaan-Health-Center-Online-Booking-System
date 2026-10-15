// UsersPage.js - the Employees page (admin): Admin, Receptionist and Physician accounts. Patients have their own page.
// This page also manages the physician profiles (title, specialization, bio, services), so there is no separate Physicians page for the admin.
// Search, Role and Status filters, sortable columns, 10 per page. The list is loaded once (up to 500 accounts) and searched, sorted and paged in the browser.
// Click a name to open the employee's details. Row actions: Edit, Profile (physicians only), Status, Archive.
// On a wide screen the table fits the page with no horizontal scrollbar; only a narrow screen scrolls sideways.
// A role is chosen when the account is created and never changes afterwards.
// Adding a Physician opens the profile form straight away, so the profile is completed in one flow. Archiving a physician also archives the profile.
// You cannot change your own status or archive yourself (the API refuses, so those buttons are hidden).
// /admin/employees?role=doctor opens the page already filtered to Physicians (the dashboard links use it).
import { useState } from 'react';
import { Avatar, Button, Grid, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
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
import ProviderFormDrawer from '../../components/providers/ProviderFormDrawer';
import handleApiError from '../../utils/handleApiError';
import { formatLong, toDateString } from '../../utils/dateUtils';
import { fullName, initials, roleLabel } from '../../utils/formatters';

const ROLES = ['admin', 'receptionist', 'doctor'].map((r) => ({ value: r, label: roleLabel(r) }));
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }];
const profileOf = (providers, u) => providers.find((x) => x.userId === u._id || (x.user && x.user._id === u._id)); // the physician profile that belongs to an account

export default function UsersPage() {
  const { user: me } = useAuth(), [params] = useSearchParams(), desktop = !!Grid.useBreakpoint().xl;
  // Employees and their physician profiles are loaded together (employees only, so a long patient list never pushes them out).
  const list = useFetch(async () => {
    const [groups, providers] = await Promise.all([Promise.all(['admin', 'receptionist', 'doctor'].map((r) => userService.list({ role: r, limit: 500 }))), providerService.list()]);
    return { users: groups.flatMap((d) => d.users), providers };
  }, []);
  const startRole = params.get('role'), [q, setQ] = useState(''), [role, setRole] = useState(ROLES.some((r) => r.value === startRole) ? startRole : undefined), [status, setStatus] = useState();
  const [form, setForm] = useState(null), [profileFor, setProfileFor] = useState(null), [statusFor, setStatusFor] = useState(null), [archiveFor, setArchiveFor] = useState(null);
  const providers = (list.data && list.data.providers) || [], term = q.trim().toLowerCase();
  const rows = ((list.data && list.data.users) || []).filter((u) => u.role !== 'patient' && (!role || u.role === role) && (!status || u.accountStatus === status) && (!term || `${fullName(u)} ${u.email}`.toLowerCase().includes(term)));
  const changeStatus = async (value) => { try { await userService.setStatus(statusFor._id, value); message.success('Status changed.'); setStatusFor(null); list.reload(); } catch (e) { handleApiError(e); setStatusFor(null); } };
  // Appointments that would block archiving: for a physician, the ones with them.
  const countFor = async (u) => {
    if (u.role === 'doctor') { const p = profileOf(await providerService.list(), u); return p ? appointmentService.list({ providerId: p._id }) : []; }
    return [];
  };
  // After a new Physician account is added, open the profile form so the profile is completed right away.
  const saved = async (user, wasNew) => {
    setForm(null); list.reload();
    if (wasNew && user && user.role === 'doctor') { try { const p = profileOf(await providerService.list(), user); if (p) setProfileFor(p); } catch (e) { /* the Profile button is still on the row */ } }
  };
  const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const columns = [
    { title: 'Name', sorter: (a, b) => fullName(a).localeCompare(fullName(b)), render: (_, u) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar size={28} style={{ flex: '0 0 auto' }}>{initials(u)}</Avatar>
        <div style={{ minWidth: 0 }}><div style={ellipsis}><Link to={`/admin/employees/${u._id}`}>{fullName(u)}</Link></div><div style={ellipsis} title={u.email}><Typography.Text type="secondary">{u.email}</Typography.Text></div></div>
      </div>) },
    { title: 'Role', width: 210, sorter: (a, b) => a.role.localeCompare(b.role), render: (_, u) => {
      const p = u.role === 'doctor' ? profileOf(providers, u) : null, incomplete = u.role === 'doctor' && (!p || !p.specialization || !((p.services || []).length));
      return <div style={{ minWidth: 0 }}><Tag color="blue" style={{ margin: 0 }}>{roleLabel(u.role)}</Tag>
        {incomplete && <div style={{ marginTop: 4 }}><Tag color="orange" style={{ margin: 0 }}>Profile incomplete</Tag></div>}
        {p && !incomplete && <div style={ellipsis} title={p.specialization}><Typography.Text type="secondary">{p.specialization}</Typography.Text></div>}</div>; } },
    { title: 'Status', width: 120, sorter: (a, b) => a.accountStatus.localeCompare(b.accountStatus), render: (_, u) => <StatusBadge type="account" status={u.accountStatus} /> },
    { title: 'Created', width: 160, defaultSortOrder: 'descend', sorter: (a, b) => (a.createdAt < b.createdAt ? -1 : 1), render: (_, u) => formatLong(toDateString(u.createdAt)) },
    { title: 'Actions', width: 230, align: 'right', render: (_, u) => (
      <Space size={0} style={{ whiteSpace: 'nowrap' }}><Button type="link" size="small" onClick={() => setForm({ user: u })}>Edit</Button>
        {u.role === 'doctor' && profileOf(providers, u) && <Button type="link" size="small" onClick={() => setProfileFor(profileOf(providers, u))}>Profile</Button>}
        {u._id !== me._id && <><Button type="link" size="small" onClick={() => setStatusFor(u)}>Status</Button><Button type="link" size="small" danger onClick={() => setArchiveFor(u)}>Archive</Button></>}</Space>) },
  ];
  return (
    <>
      <PageHeader title="Employees" description="Manage Admin, Receptionist and Physician accounts, their access and physician profiles." actions={<Button type="primary" onClick={() => setForm({ user: null })}>Add employee</Button>} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search by name or email" aria-label="Search employees" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
        <Select allowClear placeholder="Role" aria-label="Filter by role" style={{ width: 160 }} value={role} onChange={setRole} options={ROLES} />
        <Select allowClear placeholder="Status" aria-label="Filter by status" style={{ width: 160 }} value={status} onChange={setStatus} options={STATUSES} />
      </Space>
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading employees..." empty={!rows.length} emptyText="No employees found." emptyHint="Try different filters, or add an employee.">
        <Table rowKey="_id" columns={columns} dataSource={rows} tableLayout="fixed" scroll={desktop ? undefined : { x: 900 }} pagination={tablePager(rows.length)} />
      </AsyncBoundary>
      <UserFormDrawer open={!!form} user={form && form.user} onClose={() => setForm(null)} onSaved={(u) => saved(u, !(form && form.user))} />
      <ProviderFormDrawer open={!!profileFor} provider={profileFor} onClose={() => setProfileFor(null)} onSaved={() => { setProfileFor(null); list.reload(); }} />
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