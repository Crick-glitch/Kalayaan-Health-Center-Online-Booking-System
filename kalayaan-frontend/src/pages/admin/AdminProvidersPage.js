// AdminProvidersPage.js - provider profiles (admin): Add provider, Edit, Archive (blocked while upcoming appointments exist).
// Archiving a provider also archives the linked doctor account; restoring brings both back. Schedules are edited on the Schedules page.
import { useState } from 'react';
import { Avatar, Button, Dropdown, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { InboxOutlined, MoreOutlined } from '@ant-design/icons';
import providerService from '../../services/providerService';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ArchiveFlow from '../../components/common/ArchiveFlow';
import ProviderFormDrawer from '../../components/providers/ProviderFormDrawer';
import scheduleSummary from '../../utils/scheduleSummary';
import { doctorName, initials } from '../../utils/formatters';

export default function AdminProvidersPage() {
  const list = useFetch(async () => { // each provider with its weekly schedule for the summary column
    const providers = await providerService.list(), details = await Promise.all(providers.map((p) => providerService.get(p._id)));
    return providers.map((p, i) => ({ ...p, template: (details[i].schedule && details[i].schedule.weeklyTemplate) || [] }));
  }, []);
  const [form, setForm] = useState(null), [archiveFor, setArchiveFor] = useState(null), rows = list.data || [];
  const columns = [
    { title: 'Provider', render: (_, p) => <Space><Avatar size={24}>{initials(p.user)}</Avatar><div>{doctorName(p)}<br /><Typography.Text type="secondary">{p.title || '—'}</Typography.Text></div></Space> },
    { title: 'Specialization', render: (_, p) => p.specialization || '—' },
    { title: 'Services', render: (_, p) => { const s = p.services || []; return <Space size={[4, 4]} wrap>{s.slice(0, 2).map((x) => <Tag key={x._id} style={{ margin: 0 }}>{x.name}</Tag>)}{s.length > 2 && <Tooltip title={s.slice(2).map((x) => x.name).join(', ')}><Tag style={{ margin: 0 }}>+{s.length - 2}</Tag></Tooltip>}{!s.length && '—'}</Space>; } },
    { title: 'Working days', render: (_, p) => scheduleSummary(p.template) },
    { title: 'Actions', align: 'right', render: (_, p) => (
      <Space size={4}><Button type="link" size="small" onClick={() => setForm({ provider: p })}>Edit</Button>
        <Dropdown trigger={['click']} menu={{ items: [{ key: 'archive', label: 'Archive', icon: <InboxOutlined />, danger: true, onClick: () => setArchiveFor(p) }] }}><Button size="small" icon={<MoreOutlined />} aria-label={`More actions for ${doctorName(p)}`} /></Dropdown></Space>) },
  ];
  return (
    <>
      <PageHeader title="Providers" description="Doctor profiles, services and schedules." actions={<Button type="primary" onClick={() => setForm({ provider: null })}>Add provider</Button>} />
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading providers..." empty={!rows.length} emptyText="No providers yet." emptyHint="Add a user with the Doctor role, then complete the profile here.">
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={false} />
      </AsyncBoundary>
      <ProviderFormDrawer open={!!form} provider={form && form.provider} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />
      <ArchiveFlow open={!!archiveFor} kind="provider" name={archiveFor ? doctorName(archiveFor) : ''} onCount={() => appointmentService.list({ providerId: archiveFor._id })} onArchive={(reason) => providerService.archive(archiveFor._id, reason)}
        link={archiveFor && `/admin/appointments?providerId=${archiveFor._id}`} onClose={() => setArchiveFor(null)} onDone={() => { setArchiveFor(null); list.reload(); }}>
        <Typography.Text>This also archives the doctor's account. Restoring the provider restores both.</Typography.Text>
      </ArchiveFlow>
    </>
  );
}
