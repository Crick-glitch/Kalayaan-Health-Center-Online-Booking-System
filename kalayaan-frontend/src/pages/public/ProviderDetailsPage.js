// ProviderDetailsPage.js - one doctor: bio, services offered, weekly working hours and a Book button.
import { Avatar, Button, Card, Col, Row, Table, Tag, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { formatTimeRange } from '../../utils/dateUtils';
import { initials } from '../../utils/formatters';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProviderDetailsPage() {
  const { id } = useParams(), { data, loading, error, reload } = useFetch(() => providerService.get(id), [id]);
  const p = data && data.provider, tpl = (data && data.schedule && data.schedule.weeklyTemplate) || [];
  const rows = DAYS.map((name, day) => { const d = tpl.find((x) => x.day === day); return { key: day, day: name, hours: d ? formatTimeRange(d.startTime, d.endTime) : 'Not working', brk: d && d.break && d.break.startTime ? formatTimeRange(d.break.startTime, d.break.endTime) : '—' }; });
  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading provider..." empty={!p} emptyText="Provider not found.">
      {p && <>
        <PageHeader title={`Dr. ${p.user.firstName} ${p.user.lastName}`} description={`${p.specialization}${p.title ? ` · ${p.title}` : ''}`}
          actions={<Link to={`/patient/book-appointment?providerId=${p._id}`}><Button type="primary" icon={<CalendarOutlined />}>Book with this provider</Button></Link>} />
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}><Card title="Weekly working hours"><Table size="middle" pagination={false} scroll={{ x: 'max-content' }} dataSource={rows} columns={[{ title: 'Day', dataIndex: 'day' }, { title: 'Hours', dataIndex: 'hours' }, { title: 'Break', dataIndex: 'brk' }]} /></Card></Col>
          <Col xs={24} lg={10}>
            <Card title="About" style={{ marginBottom: 16 }}><Avatar size={56} style={{ background: '#0E7C86', marginBottom: 12 }}>{initials(p.user)}</Avatar><Typography.Paragraph style={{ margin: 0 }}>{p.bio}</Typography.Paragraph></Card>
            <Card title="Services offered">{(p.services || []).map((s) => <Tag key={s._id}>{s.name}</Tag>)}</Card>
          </Col>
        </Row>
      </>}
    </AsyncBoundary>
  );
}
