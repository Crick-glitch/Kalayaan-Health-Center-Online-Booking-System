// ForgotPasswordPage.js - request a password-reset code by email.
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { live, rules } from '../../utils/validators';

export default function ForgotPasswordPage() {
  const navigate = useNavigate(), [form] = Form.useForm(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async ({ email }) => {
    setBusy(true); setError('');
    try {
      const result = await authService.forgotPassword(email.trim());
      message.success(result.message);
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`, { state: { developmentCode: result.developmentCode } });
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ maxWidth: 420, margin: '24px auto 0' }}><Card>
      <Typography.Title level={4} style={{ color: '#0B2545', marginTop: 0 }}>Forgot your password?</Typography.Title>
      <Typography.Paragraph type="secondary">Enter the email address on your account to receive a one-time reset code.</Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" {...live} onFinish={submit}>
        <Form.Item label="Email" name="email" rules={rules.email} hasFeedback><Input autoComplete="email" /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>Send reset request</Button>
      </Form>
      <Typography.Paragraph style={{ textAlign: 'center', margin: '16px 0 0' }}><Link to="/login">Back to login</Link></Typography.Paragraph>
    </Card></div>
  );
}
