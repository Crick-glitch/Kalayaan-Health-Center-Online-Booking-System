import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Result, Typography, message } from 'antd';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';
import { live } from '../../utils/validators';

export default function VerifyAccountPage() {
  const [params] = useSearchParams(), location = useLocation(), navigate = useNavigate();
  const identifier = params.get('identifier') || '';
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [developmentCode, setDevelopmentCode] = useState(location.state?.developmentCode);
  if (!identifier) return <Result status="warning" title="Verification request missing" extra={<Link to="/register"><Button type="primary">Create an account</Button></Link>} />;
  const verify = async ({ code }) => {
    setBusy(true); setError('');
    try { await authService.verifyRegistration(identifier, code); message.success('Account verified. Please log in.'); navigate('/login'); }
    catch (e) { setError(e.message); setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError('');
    try { const result = await authService.resendVerification(identifier); setDevelopmentCode(result.developmentCode); message.success(result.message); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ maxWidth: 440, margin: '24px auto 0' }}><Card>
      <Typography.Title level={4} style={{ color: '#0B2545', marginTop: 0 }}>Verify your account</Typography.Title>
      <Typography.Paragraph type="secondary">Enter the six-digit code sent to {identifier}.</Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {developmentCode && <Alert type="warning" showIcon message="Local development code" description={<Typography.Text code>{developmentCode}</Typography.Text>} style={{ marginBottom: 16 }} />}
      <Form layout="vertical" {...live} onFinish={verify}>
        <Form.Item label="Verification code" name="code" rules={[{ required: true, message: 'Enter the six-digit code.' }, { pattern: /^\d{6}$/, message: 'Enter the six-digit code.' }]}><Input inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>Verify account</Button>
      </Form>
      <Button type="link" block disabled={busy} onClick={resend} style={{ marginTop: 8 }}>Send a new code</Button>
    </Card></div>
  );
}