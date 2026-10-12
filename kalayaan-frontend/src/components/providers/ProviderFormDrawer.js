// ProviderFormDrawer.js - Add or Edit a provider profile (admin). The profile belongs to an existing ACTIVE doctor account that has none yet
// (a doctor added on the Users page already gets an empty profile: use Edit to complete it). Edit does not change the account.
import { useState } from 'react';
import { Button, Drawer, Form, Grid, Input, Select, Space, Typography, message } from 'antd';
import providerService from '../../services/providerService';
import serviceService from '../../services/serviceService';
import userService from '../../services/userService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../common/AsyncBoundary';
import handleApiError from '../../utils/handleApiError';
import { doctorName, fullName } from '../../utils/formatters';

export default function ProviderFormDrawer({ open, provider, onClose, onSaved }) {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false), wide = !!Grid.useBreakpoint().sm, edit = !!provider;
  const lists = useFetch(() => (open ? Promise.all([serviceService.list(), edit ? [] : userService.list({ role: 'doctor', status: 'active', limit: 500 }), edit ? [] : providerService.list()]) : Promise.resolve(null)), [open]);
  const services = (lists.data && lists.data[0]) || [];
  const taken = new Set(((lists.data && lists.data[2]) || []).map((p) => p.userId || (p.user && p.user._id)));
  const doctors = ((lists.data && lists.data[1] && lists.data[1].users) || []).filter((u) => !taken.has(u._id)); // active doctor accounts without a profile
  const submit = async (v) => {
    setBusy(true);
    try {
      const body = { title: (v.title || '').trim(), specialization: (v.specialization || '').trim(), bio: (v.bio || '').trim(), serviceIds: v.serviceIds || [] };
      if (edit) await providerService.update(provider._id, body); else await providerService.create({ ...body, userId: v.userId });
      message.success(edit ? 'Provider updated.' : 'Provider added.'); onSaved();
    } catch (e) { if (e.fieldErrors) form.setFields(Object.entries(e.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] }))); else handleApiError(e); }
    setBusy(false);
  };
  return (
    <Drawer open={open} destroyOnClose maskClosable={false} width={wide ? 480 : '100%'} title={edit ? `Edit ${doctorName(provider)}` : 'Add provider'} onClose={busy ? undefined : onClose}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" loading={busy} disabled={lists.loading} onClick={() => form.submit()}>{edit ? 'Save changes' : 'Add provider'}</Button></Space>}>
      <AsyncBoundary loading={lists.loading} error={lists.error} onRetry={lists.reload} loadingText="Loading...">
        <Form form={form} layout="vertical" onFinish={submit} scrollToFirstError initialValues={edit ? { title: provider.title, specialization: provider.specialization, bio: provider.bio, serviceIds: (provider.services || []).map((s) => s._id) } : {}}>
          {!edit && <Form.Item label="Doctor account" name="userId" rules={[{ required: true, message: 'Choose a doctor account.' }]}
            extra={doctors.length ? undefined : 'Every active doctor account already has a provider profile. Add a user with the Doctor role first, then use Edit to complete the profile.'}>
            <Select showSearch optionFilterProp="label" placeholder="Choose a doctor account" notFoundContent="No doctor accounts available" options={doctors.map((u) => ({ value: u._id, label: `${fullName(u)} · ${u.email}` }))} /></Form.Item>}
          {edit && <Typography.Paragraph type="secondary">Account: {fullName(provider.user)}. Change name or contact details on the Users page.</Typography.Paragraph>}
          <Form.Item label="Title" name="title" rules={[{ max: 40, message: 'Use up to 40 characters.' }]} extra="For example: MD, FPAFP"><Input maxLength={40} /></Form.Item>
          <Form.Item label="Specialization" name="specialization" rules={[{ required: true, whitespace: true, message: 'Enter a specialization.' }, { max: 60, message: 'Use up to 60 characters.' }]}><Input maxLength={60} /></Form.Item>
          <Form.Item label="Bio" name="bio" rules={[{ max: 500, message: 'Use up to 500 characters.' }]}><Input.TextArea rows={4} showCount maxLength={500} /></Form.Item>
          <Form.Item label="Services offered" name="serviceIds" rules={[{ required: true, type: 'array', min: 1, message: 'Choose at least one service.' }]}>
            <Select mode="multiple" optionFilterProp="label" placeholder="Choose services" options={services.map((s) => ({ value: s._id, label: s.name }))} /></Form.Item>
        </Form>
      </AsyncBoundary>
    </Drawer>
  );
}
