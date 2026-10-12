// ProviderCard.js - one doctor: initials avatar, specialization, up to 3 service tags, and View profile / Book buttons.
import { Avatar, Button, Card, Tag, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { initials } from '../../utils/formatters';

export default function ProviderCard({ provider, profilePath, readOnly }) {
  const u = provider.user || {}, services = provider.services || [];
  return (
    <Card style={{ height: '100%' }} styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', gap: 12 } }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Avatar size={48} style={{ background: '#0E7C86' }}>{initials(u)}</Avatar>
        <div><Typography.Text strong>Dr. {u.firstName} {u.lastName}</Typography.Text><br /><Typography.Text type="secondary">{provider.specialization}{provider.title ? ` · ${provider.title}` : ''}</Typography.Text></div>
      </div>
      <div style={{ flex: 1 }}>{services.slice(0, 3).map((s) => <Tag key={s._id}>{s.name}</Tag>)}{services.length > 3 && <Tag>+{services.length - 3}</Tag>}</div>
      {!readOnly && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to={profilePath}><Button>View profile</Button></Link>
        <Link to={`/patient/book-appointment?providerId=${provider._id}`}><Button type="primary" icon={<CalendarOutlined />}>Book</Button></Link>
      </div>}
    </Card>
  );
}
