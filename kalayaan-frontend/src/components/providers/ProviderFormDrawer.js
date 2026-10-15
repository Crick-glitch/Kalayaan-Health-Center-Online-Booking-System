// ProviderFormDrawer.js - edit a physician profile (admin): title, specialization, bio and the services the physician offers.
// It opens from the Profile button on the Employees page, and right after a new Physician account is added there.
// A Physician account always gets an empty profile when it is created, so this form only edits. Name, contact details and status are changed with Edit and Status on Employees.
import { useState } from 'react';
import { Button, Drawer, Form, Grid, Input, Select, Space, Typography, message } from 'antd';
import providerService from '../../services/providerService';
import serviceService from '../../services/serviceService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../common/AsyncBoundary';
import handleApiError from '../../utils/handleApiError';
import { live } from '../../utils/validators';
import { doctorName, fullName } from '../../utils/formatters';

export default function ProviderFormDrawer({ open, provider, onClose, onSaved }) {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false), wide = !!Grid.useBreakpoint().sm;
  const lists = useFetch(() => (open ? serviceService.list() : Promise.resolve(null)), [open]);
  const services = lists.data || [];
  const submit = async (v) => {
    setBusy(true);
    try {
      await providerService.update(provider._id, { title: (v.title || '').trim(), specialization: (v.specialization || '').trim(), bio: (v.bio || '').trim(), serviceIds: v.serviceIds || [] });
      message.success('Physician profile updated.'); onSaved();
    } catch (e) { if (e.fieldErrors) form.setFields(Object.entries(e.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] }))); else handleApiError(e); }
    setBusy(false);
  };
  return (
    <Drawer open={open} destroyOnClose maskClosable={false} width={wide ? 480 : '100%'} title={provider ? `Physician profile: ${doctorName(provider)}` : 'Physician profile'} onClose={busy ? undefined : onClose}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" loading={busy} disabled={lists.loading || !provider} onClick={() => form.submit()}>Save profile</Button></Space>}>
      {provider && <AsyncBoundary loading={lists.loading} error={lists.error} onRetry={lists.reload} loadingText="Loading...">
        <Form form={form} layout="vertical" {...live} onFinish={submit} scrollToFirstError initialValues={{ title: provider.title, specialization: provider.specialization, bio: provider.bio, serviceIds: (provider.services || []).map((s) => s._id) }}>
          <Typography.Paragraph type="secondary">Account: {fullName(provider.user)}. Change name or contact details with Edit on the Employees page. The weekly schedule is set on the Schedules page.</Typography.Paragraph>
          <Form.Item label="Title" name="title" rules={[{ max: 40, message: 'Use up to 40 characters.' }]} extra="For example: MD, FPAFP"><Input maxLength={40} /></Form.Item>
          <Form.Item label="Specialization" name="specialization" rules={[{ required: true, whitespace: true, message: 'Enter a specialization.' }, { max: 60, message: 'Use up to 60 characters.' }]}><Input maxLength={60} /></Form.Item>
          <Form.Item label="Bio" name="bio" rules={[{ max: 500, message: 'Use up to 500 characters.' }]}><Input.TextArea rows={4} showCount maxLength={500} /></Form.Item>
          <Form.Item label="Services offered" name="serviceIds" rules={[{ required: true, type: 'array', min: 1, message: 'Choose at least one service.' }]}>
            <Select mode="multiple" optionFilterProp="label" placeholder="Choose services" options={services.map((s) => ({ value: s._id, label: s.name }))} /></Form.Item>
        </Form>
      </AsyncBoundary>}
    </Drawer>
  );
}