// SettingsPage.js - change my password (one card, max width 480). The API checks the current password again.
import { useState } from 'react';
import { Button, Card, Form, Input, message } from 'antd';
import authService from '../../services/authService';
import PageHeader from '../../components/common/PageHeader';
import handleApiError from '../../utils/handleApiError';
import { rules } from '../../utils/validators';

export default function SettingsPage() {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false);
  const submit = async (v) => {
    setBusy(true);
    try { await authService.changePassword(v.currentPassword, v.newPassword); message.success('Password changed.'); form.resetFields(); }
    catch (e) { handleApiError(e, form); } // field errors appear beside the inputs (currentPassword, newPassword)
    setBusy(false);
  };
  return (
    <>
      <PageHeader title="Settings" description="Manage your account security." />
      <Card title="Change password" style={{ maxWidth: 480 }}>
        <Form form={form} layout="vertical" onFinish={submit} autoComplete="off">
          <Form.Item label="Current password" name="currentPassword" rules={[{ required: true, message: 'Enter your current password.' }]}><Input.Password autoComplete="current-password" /></Form.Item>
          <Form.Item label="New password" name="newPassword" dependencies={['currentPassword']} rules={[...rules.password, ...rules.differentFrom('currentPassword', 'Choose a different password.')]} extra="At least 8 characters with upper and lower case letters and a number."><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item label="Confirm new password" name="confirm" dependencies={['newPassword']} rules={rules.confirm('newPassword')}><Input.Password autoComplete="new-password" /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button type="primary" htmlType="submit" loading={busy}>Change password</Button></div>
        </Form>
      </Card>
    </>
  );
}
