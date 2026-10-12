// ServiceCard.js - one service: name, category, duration, description, requirements and a Book button.
import { Button, Card, Tag, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

export default function ServiceCard({ service }) {
  return (
    <Card style={{ height: '100%' }} styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', gap: 8 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <Typography.Text strong>{service.name}</Typography.Text><Tag color="blue" style={{ margin: 0 }}>{service.category}</Tag>
      </div>
      <Typography.Text type="secondary">{service.durationMinutes} min</Typography.Text>
      <Typography.Paragraph style={{ margin: 0 }}>{service.description}</Typography.Paragraph>
      <Typography.Text type="secondary" style={{ flex: 1 }}>Requirements: {service.requirements}</Typography.Text>
      <Link to={`/patient/book-appointment?serviceId=${service._id}`}><Button type="primary" icon={<CalendarOutlined />}>Book</Button></Link>
    </Card>
  );
}
