// RegisterPage.js - patient registration. Field errors show beside the inputs; submit shows a processing state.
import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input, Row, Select, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import PasswordChecklist from '../../components/forms/PasswordChecklist';
import { live, rules } from '../../utils/validators';

const MAP = { emergencyName: ['emergencyContact', 'name'], emergencyNumber: ['emergencyContact', 'contactNumber'] }; // API field names -> form fields
const col = { xs: 24, md: 12 };

export default function RegisterPage() {
  const [form] = Form.useForm(), navigate = useNavigate(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async (v) => {
    setBusy(true); setError('');
    try {
      const result = await authService.register({ ...v, dateOfBirth: v.dateOfBirth.format('YYYY-MM-DD'), agreement: !!v.agreement });
      if (result.verified) { message.success('Account created. You can log in now.'); navigate('/login'); return; } // email verification is switched off
      navigate(`/verify-account?identifier=${encodeURIComponent(result.identifier)}`, { state: { developmentCode: result.developmentCode } });
    } catch (e) {
      if (e.fieldErrors) form.setFields(Object.entries(e.fieldErrors).map(([name, msg]) => ({ name: MAP[name] || name, errors: [msg] })));
      else setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Card>
        <Typography.Title level={4} style={{ color: '#0B2545', marginTop: 0 }}>Create a patient account</Typography.Title>
        <Typography.Paragraph type="secondary">Fields marked with * are required.</Typography.Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" {...live} onFinish={submit} scrollToFirstError>
          <Divider orientation="left" orientationMargin={0}>Personal information</Divider>
          <Row gutter={16}>
            <Col {...col}><Form.Item label="First name" name="firstName" rules={rules.name} hasFeedback><Input autoComplete="given-name" /></Form.Item></Col>
            <Col {...col}><Form.Item label="Middle name (optional)" name="middleName" rules={rules.optionalName} hasFeedback><Input autoComplete="additional-name" /></Form.Item></Col>
            <Col {...col}><Form.Item label="Last name" name="lastName" rules={rules.name} hasFeedback><Input autoComplete="family-name" /></Form.Item></Col>
            <Col {...col}><Form.Item label="Date of birth" name="dateOfBirth" rules={rules.dob}><DatePicker style={{ width: '100%' }} format="MMMM D, YYYY" disabledDate={(d) => d.isAfter(dayjs())} /></Form.Item></Col>
            <Col {...col}><Form.Item label="Sex" name="sex" rules={[{ required: true, message: 'Select an option.' }]}><Select options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }]} /></Form.Item></Col>
          </Row>
          <Divider orientation="left" orientationMargin={0}>Contact</Divider>
          <Row gutter={16}>
            <Col {...col}><Form.Item label="Contact number" name="contactNumber" rules={rules.phone} hasFeedback><Input inputMode="tel" placeholder="09XXXXXXXXX" /></Form.Item></Col>
            <Col {...col}><Form.Item label="Email" name="email" rules={rules.email} hasFeedback><Input autoComplete="email" /></Form.Item></Col>
            <Col span={24}><Form.Item label="Address" name="address" rules={rules.address}><Input.TextArea rows={2} placeholder="House number, street, barangay, city" /></Form.Item></Col>
          </Row>
          <Divider orientation="left" orientationMargin={0}>Emergency contact</Divider>
          <Row gutter={16}>
            <Col {...col}><Form.Item label="Name" name={['emergencyContact', 'name']} rules={rules.name}><Input /></Form.Item></Col>
            <Col {...col}><Form.Item label="Relationship" name={['emergencyContact', 'relationship']} rules={[{ required: true, message: 'Enter the relationship.' }]}><Input /></Form.Item></Col>
            <Col {...col}><Form.Item label="Contact number" name={['emergencyContact', 'contactNumber']} dependencies={['contactNumber']} rules={[...rules.phone, ...rules.differentFrom('contactNumber', 'Use a different number from your own.')]}><Input inputMode="tel" placeholder="09XXXXXXXXX" /></Form.Item></Col>
          </Row>
          <Divider orientation="left" orientationMargin={0}>Account</Divider>
          <Row gutter={16}>
            <Col {...col}><Form.Item label="Password" name="password" rules={rules.password}><Input.Password autoComplete="new-password" /></Form.Item><PasswordChecklist /></Col>
            <Col {...col}><Form.Item label="Confirm password" name="confirm" dependencies={['password']} rules={rules.confirm()}><Input.Password autoComplete="new-password" /></Form.Item></Col>
          </Row>
          <Form.Item name="agreement" valuePropName="checked" rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('You must agree to continue.'))) }]}>
            <Checkbox>I agree to the <Link to="/privacy" target="_blank">Privacy Notice</Link>.</Checkbox>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}><Button onClick={() => navigate('/login')}>Cancel</Button><Button type="primary" htmlType="submit" loading={busy}>Create account</Button></div>
        </Form>
      </Card>
      <Typography.Paragraph style={{ textAlign: 'center', marginTop: 16 }}>Already registered? <Link to="/login">Log in</Link></Typography.Paragraph>
    </div>
  );
}
