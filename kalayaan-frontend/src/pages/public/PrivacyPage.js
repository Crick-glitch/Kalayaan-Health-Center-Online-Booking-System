// PrivacyPage.js - plain privacy notice for this school project.
import { Typography } from 'antd';
import clinic from '../../config/clinic';
import PageHeader from '../../components/common/PageHeader';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title="Privacy notice" description={`How ${clinic.name} handles your information.`} />
      <Typography.Title level={5}>What we collect</Typography.Title>
      <Typography.Paragraph>Your name, contact details, address, date of birth and emergency contact when you register, plus the details of your appointments.</Typography.Paragraph>
      <Typography.Title level={5}>How we use it</Typography.Title>
      <Typography.Paragraph>Only to book, confirm and complete your appointments, and to show you updates inside the app. Staff and doctors see only what they need for their work.</Typography.Paragraph>
      <Typography.Title level={5}>Passwords</Typography.Title>
      <Typography.Paragraph>Passwords are stored in a scrambled (hashed) form and are never shown to anyone.</Typography.Paragraph>
      <Typography.Title level={5}>Account messages</Typography.Title>
      <Typography.Paragraph>Your email address may be used to send account verification and password recovery codes through the configured email provider.</Typography.Paragraph>
      <Typography.Title level={5}>Demonstration data</Typography.Title>
      <Typography.Paragraph>This project includes fictional sample accounts and appointment records for demonstration. Do not enter real patient information in the demo deployment.</Typography.Paragraph>
      <Typography.Paragraph type="secondary">Questions? Call {clinic.phone}.</Typography.Paragraph>
    </div>
  );
}
