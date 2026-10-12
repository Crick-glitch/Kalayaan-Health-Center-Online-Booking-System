// AdminServicesPage.js - the service catalog (admin): Add service, Edit, Archive (blocked while upcoming appointments exist).
import { useState } from 'react';
import { Button, Dropdown, Space, Table, Tag, Typography } from 'antd';
import { InboxOutlined, MoreOutlined } from '@ant-design/icons';
import serviceService from '../../services/serviceService';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ArchiveFlow from '../../components/common/ArchiveFlow';
import ServiceFormDrawer from '../../components/services/ServiceFormDrawer';

export default function AdminServicesPage() {
  const list = useFetch(() => serviceService.list(), []), [form, setForm] = useState(null), [archiveFor, setArchiveFor] = useState(null), rows = list.data || [];
  const columns = [
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) }, { title: 'Category', render: (_, s) => <Tag>{s.category}</Tag> },
    { title: 'Duration', sorter: (a, b) => a.durationMinutes - b.durationMinutes, render: (_, s) => `${s.durationMinutes} min` },
    { title: 'Requirements', width: 280, render: (_, s) => <Typography.Text ellipsis={{ tooltip: s.requirements }} style={{ maxWidth: 260 }}>{s.requirements || '—'}</Typography.Text> },
    { title: 'Actions', align: 'right', render: (_, s) => (
      <Space size={4}><Button type="link" size="small" onClick={() => setForm({ service: s })}>Edit</Button>
        <Dropdown trigger={['click']} menu={{ items: [{ key: 'archive', label: 'Archive', icon: <InboxOutlined />, danger: true, onClick: () => setArchiveFor(s) }] }}><Button size="small" icon={<MoreOutlined />} aria-label={`More actions for ${s.name}`} /></Dropdown></Space>) },
  ];
  return (
    <>
      <PageHeader title="Services" description="What patients can book at the health center." actions={<Button type="primary" onClick={() => setForm({ service: null })}>Add service</Button>} />
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading services..." empty={!rows.length} emptyText="No services yet." emptyHint="Add the first service.">
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={{ pageSize: 10, hideOnSinglePage: true }} />
      </AsyncBoundary>
      <ServiceFormDrawer open={!!form} service={form && form.service} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />
      <ArchiveFlow open={!!archiveFor} kind="service" name={archiveFor ? archiveFor.name : ''} onCount={() => appointmentService.list({ serviceId: archiveFor._id })} onArchive={(reason) => serviceService.archive(archiveFor._id, reason)}
        link={archiveFor && `/admin/appointments?serviceId=${archiveFor._id}`} onClose={() => setArchiveFor(null)} onDone={() => { setArchiveFor(null); list.reload(); }} />
    </>
  );
}
