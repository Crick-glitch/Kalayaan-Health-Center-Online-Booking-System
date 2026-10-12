// LoginPage.js - email + password, remember me, generic error, account-state messages and the demo accounts panel.
import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Collapse, Form, Input, List, Typography } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import clinic from '../../config/clinic';
import DEMO_ACCOUNTS, { DEMO_PASSWORD } from '../../config/demoAccounts';
import { ROLE_PREFIX, roleHome } from '../../config/constants';

export default function LoginPage() {
  const { login } = useAuth(), navigate = useNavigate(), loc = useLocation(), [form] = Form.useForm();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async ({ email, password, remember }) => {
    setBusy(true); setError('');
    try {
      const u = await login(email.trim(), password, !!remember);
      const from = loc.state && loc.state.from;
      navigate(from && from.startsWith(ROLE_PREFIX[u.role]) ? from : roleHome(u.role), { replace: true }); // back to the page they wanted, if it is theirs
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 16, paddingTop: 24 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={4} style={{ color: '#0B2545', marginTop: 0 }}>Welcome back</Typography.Title>
        <Typography.Paragraph type="secondary">Log in to manage your appointments at {clinic.name}.</Typography.Paragraph>
        {loc.state && loc.state.expired && <Alert type="warning" showIcon message="Your session has expired. Please log in again." style={{ marginBottom: 16 }} />}
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={submit} onValuesChange={() => setError('')} initialValues={{ remember: false }}>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter your email.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input autoComplete="username" /></Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password.' }]}><Input.Password autoComplete="current-password" /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Form.Item name="remember" valuePropName="checked" noStyle><Checkbox>Remember me</Checkbox></Form.Item>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <Button type="primary" htmlType="submit" block loading={busy}>Login</Button>
        </Form>
        <Typography.Paragraph style={{ textAlign: 'center', margin: '16px 0 0' }}>No account yet? <Link to="/register">Register</Link></Typography.Paragraph>
      </Card>
      {clinic.SHOW_DEMO_ACCOUNTS && (
        <Collapse style={{ width: '100%', maxWidth: 420, background: '#fff' }} items={[{ key: 'demo', label: 'Demo accounts', children: (
          <List size="small" dataSource={DEMO_ACCOUNTS} renderItem={(a) => (
            <List.Item actions={[<Button key="use" type="link" onClick={() => form.setFieldsValue({ email: a.email, password: DEMO_PASSWORD })}>Use this account</Button>]}>
              <List.Item.Meta title={a.role} description={a.name} />
            </List.Item>)} />
        ) }]} />
      )}
    </div>
  );
}
