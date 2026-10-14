// ResetPasswordPage.js - new password from a reset link. Bad, missing or expired links show an error state.
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Result, Typography, message } from 'antd';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';
import PasswordChecklist from '../../components/forms/PasswordChecklist';
import { live, rules } from '../../utils/validators';

export default function ResetPasswordPage() {
  const [params] = useSearchParams(), navigate = useNavigate(), location = useLocation();
  const email = params.get('email') || '';
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), dead = !email, [developmentCode, setDevelopmentCode] = useState(location.state?.developmentCode);
  const submit = async ({ code, password }) => {
    setBusy(true); setError('');
    try { await authService.resetPassword(email, code, password); message.success('Password updated. Please log in.'); navigate('/login'); }
    catch (e) { setError(e.message); setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError('');
    try { const result = await authService.forgotPassword(email); setDevelopmentCode(result.developmentCode); message.success(result.message); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  if (dead) return <Result status="error" title="Reset request missing" subTitle="Request a new code to continue." extra={<Link to="/forgot-password"><Button type="primary">Start over</Button></Link>} />;
  return (
    <div style={{ maxWidth: 420, margin: '24px auto 0' }}><Card>
      <Typography.Title level={4} style={{ color: '#0B2545', marginTop: 0 }}>Choose a new password</Typography.Title>
      <Typography.Paragraph type="secondary">Enter the six-digit code sent to {email}. Codes expire after 10 minutes.</Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {developmentCode && <Alert type="warning" showIcon message="Local development code" description={<Typography.Text code>{developmentCode}</Typography.Text>} style={{ marginBottom: 16 }} />}
      <Form layout="vertical" {...live} onFinish={submit}>
        <Form.Item label="Reset code" name="code" rules={[{ required: true, message: 'Enter the six-digit code.' }, { pattern: /^\d{6}$/, message: 'Enter the six-digit code.' }]}><Input inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></Form.Item>
        <Form.Item label="New password" name="password" rules={rules.password}><Input.Password autoComplete="new-password" /></Form.Item>
         <PasswordChecklist />  
        <Form.Item label="Confirm password" name="confirm" dependencies={['password']} rules={rules.confirm()}><Input.Password autoComplete="new-password" /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>Save password</Button>
      </Form>
      <Button type="link" block disabled={busy} onClick={resend} style={{ marginTop: 8 }}>Send a new code</Button>
    </Card></div>
  );
}
