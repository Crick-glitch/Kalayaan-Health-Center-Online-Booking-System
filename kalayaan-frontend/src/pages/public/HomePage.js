// HomePage.js - a compact intro (not a hero): one heading, two buttons, clinic info, three services, how booking works.
import { Button, Card, Col, Descriptions, Row, Steps, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import clinic from '../../config/clinic';
import serviceService from '../../services/serviceService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ServiceCard from '../../components/common/ServiceCard';

const STEPS = [['Book', 'Choose a service, doctor and time.'], ['Staff confirms', 'The health center reviews your request.'], ['Arrived', 'Arrive and the front desk marks you as arrived.'], ['Consultation', 'See your doctor.'], ['Completed', 'The doctor records your visit.']];

export default function HomePage() {
  const { data, loading, error, reload } = useFetch(() => serviceService.list(), []);
  return (
    <>
      <Card style={{ marginBottom: 24 }}><Row gutter={[32, 16]} align="middle">
        <Col xs={24} md={14}>
          <Typography.Title level={2} style={{ color: '#0B2545', marginTop: 0 }}>Book your visit online</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 16 }}>Choose a service and a doctor, pick a time that works for you, and {clinic.shortName} Health Center confirms it.</Typography.Paragraph>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link to="/patient/book-appointment"><Button type="primary" size="large" icon={<CalendarOutlined />}>Book Appointment</Button></Link><Link to="/services"><Button size="large">View Services</Button></Link></div>
        </Col>
        <Col xs={24} md={10}><Descriptions column={1} items={[{ label: 'Hours', children: clinic.hours }, { label: 'Address', children: clinic.address }, { label: 'Phone', children: clinic.phone }]} /></Col>
      </Row></Card>
      <Typography.Title level={4} style={{ color: '#0B2545' }}>Popular services</Typography.Title>
      <AsyncBoundary loading={loading} error={error} onRetry={reload} empty={!data || !data.length} emptyText="No services yet." loadingText="Loading services...">
        <Row gutter={[16, 16]}>{(data || []).slice(0, 3).map((s) => <Col key={s._id} xs={24} md={8}><ServiceCard service={s} /></Col>)}</Row>
      </AsyncBoundary>
      <Card title="How booking works" style={{ marginTop: 24 }}><Steps size="small" responsive current={-1} items={STEPS.map(([title, description]) => ({ title, description }))} /></Card>
    </>
  );
}
