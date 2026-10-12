// ServiceFormDrawer.js - Add or Edit a health-center service (admin). Duration is 15, 30 or 45 minutes; the name must be unique among active services.
import { useState } from 'react';
import { Button, Drawer, Form, Grid, Input, Select, Space, message } from 'antd';
import serviceService from '../../services/serviceService';
import handleApiError from '../../utils/handleApiError';

const CATEGORIES = ['Consultation', 'Preventive', 'Diagnostic'].map((c) => ({ value: c, label: c }));
const DURATIONS = [15, 30, 45].map((m) => ({ value: m, label: `${m} minutes` }));

export default function ServiceFormDrawer({ open, service, onClose, onSaved }) {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false), wide = !!Grid.useBreakpoint().sm, edit = !!service;
  const submit = async (v) => {
    setBusy(true);
    try {
      const body = { ...v, name: (v.name || '').trim(), description: (v.description || '').trim(), requirements: (v.requirements || '').trim() };
      if (edit) await serviceService.update(service._id, body); else await serviceService.create(body);
      message.success(edit ? 'Service updated.' : 'Service added.'); onSaved();
    } catch (e) { if (e.fieldErrors) form.setFields(Object.entries(e.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] }))); else handleApiError(e); }
    setBusy(false);
  };
  return (
    <Drawer open={open} destroyOnClose maskClosable={false} width={wide ? 480 : '100%'} title={edit ? `Edit ${service.name}` : 'Add service'} onClose={busy ? undefined : onClose}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{edit ? 'Save changes' : 'Add service'}</Button></Space>}>
      <Form form={form} layout="vertical" onFinish={submit} scrollToFirstError initialValues={edit ? { name: service.name, category: service.category, durationMinutes: service.durationMinutes, description: service.description, requirements: service.requirements } : {}}>
        <Form.Item label="Name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter a name.' }, { min: 2, max: 80, message: 'Use 2 to 80 characters.' }]}><Input maxLength={80} /></Form.Item>
        <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Choose a category.' }]}><Select placeholder="Choose a category" options={CATEGORIES} /></Form.Item>
        <Form.Item label="Duration" name="durationMinutes" rules={[{ required: true, message: 'Choose a duration.' }]} extra="Each appointment takes this long, and it sets the booking slots."><Select placeholder="Choose a duration" options={DURATIONS} /></Form.Item>
        <Form.Item label="Description" name="description" rules={[{ max: 500, message: 'Use up to 500 characters.' }]}><Input.TextArea rows={3} showCount maxLength={500} /></Form.Item>
        <Form.Item label="Requirements" name="requirements" rules={[{ max: 300, message: 'Use up to 300 characters.' }]} extra="What the patient should bring or do first."><Input.TextArea rows={2} showCount maxLength={300} /></Form.Item>
      </Form>
    </Drawer>
  );
}
