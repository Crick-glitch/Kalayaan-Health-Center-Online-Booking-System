// AboutPage.js - who we are and how to find us.
import { Alert, Card, Col, Descriptions, Row, Typography } from 'antd';
import clinic from '../../config/clinic';
import PageHeader from '../../components/common/PageHeader';

export default function AboutPage() {
  return (
    <>
      <PageHeader title={`About ${clinic.name}`} description="A community health center for the whole barangay." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}><Card title="Our service">
          <Typography.Paragraph>{clinic.name} offers family medicine, dental, pediatric and women's health consultations, along with preventive care and screening.</Typography.Paragraph>
          <Typography.Paragraph style={{ margin: 0 }}>Patients can book online. Staff confirm each request, and your doctor completes the visit.</Typography.Paragraph>
        </Card></Col>
        <Col xs={24} md={10}><Card title="Visit us"><Descriptions column={1} items={[{ label: 'Hours', children: clinic.hours }, { label: 'Address', children: clinic.address }, { label: 'Phone', children: clinic.phone }]} /></Card></Col>
      </Row>
      <Alert style={{ marginTop: 16 }} type="info" showIcon message="Account security" description="Email verification and password recovery are available when the clinic's SMTP email delivery is configured." />
    </>
  );
}
