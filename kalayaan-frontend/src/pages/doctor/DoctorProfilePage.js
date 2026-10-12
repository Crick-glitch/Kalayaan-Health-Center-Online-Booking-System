// DoctorProfilePage.js - the doctor's profile: like the patient profile, but only Title and Bio can be edited.
// Name, contact details and account stay read-only here; Specialization and Services belong to the administrator.
// "Edit profile" opens the two fields; Save asks for confirmation first. Saving uses PUT /api/providers/:id (a doctor may send only title and bio).
import { useState } from 'react';
import { Button, Card, Descriptions, Form, Input, Space, Tag, Typography, message } from 'antd';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import handleApiError from '../../utils/handleApiError';
import { formatLong, toDateString } from '../../utils/dateUtils';
import { fullName } from '../../utils/formatters';

export default function DoctorProfilePage() {
  const { user } = useAuth(), [form] = Form.useForm(), [editing, setEditing] = useState(false), [pending, setPending] = useState(null);
  const providers = useFetch(() => providerService.list(), []);
  const mine = (providers.data || []).find((p) => (p.user && p.user._id === user._id) || p.userId === user._id);
  const start = () => { form.setFieldsValue({ title: mine.title || '', bio: mine.bio || '' }); setEditing(true); };
  const stop = () => { form.resetFields(); setEditing(false); };
  const save = async () => { // runs after the person confirms
    try { await providerService.update(mine._id, { title: (pending.title || '').trim(), bio: (pending.bio || '').trim() }); message.success('Profile updated.'); setEditing(false); providers.reload(); }
    catch (e) { if (e.fieldErrors) form.setFields(Object.entries(e.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] }))); else handleApiError(e); }
    setPending(null);
  };
  return (
    <>
      <PageHeader title="Profile" description="Your title and bio are shown to patients when they choose a doctor." actions={!editing && mine && <Button type="primary" onClick={start}>Edit profile</Button>} />
      <Card title="Personal information" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { label: 'Name', children: fullName(user) }, { label: 'Date of birth', children: formatLong(user.dateOfBirth) }, { label: 'Sex', children: user.sex || '—' },
          { label: 'Contact number', children: user.contactNumber }, { label: 'Email', children: user.email }, { label: 'Address', span: 2, children: user.address || '—' }]} />
      </Card>
      <AsyncBoundary loading={providers.loading} error={providers.error} onRetry={providers.reload} loadingText="Loading your profile..." empty={!mine} emptyText="Your provider profile was not found." emptyHint="Please contact the administrator.">
        {mine && <Card title="Professional information" style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical" onFinish={setPending}>
            {editing ? <>
              <Form.Item label="Title" name="title" rules={[{ max: 40, message: 'Use up to 40 characters.' }]} extra="For example: MD, FPAFP"><Input maxLength={40} /></Form.Item>
              <Form.Item label="Bio" name="bio" rules={[{ max: 500, message: 'Use up to 500 characters.' }]}><Input.TextArea rows={4} showCount maxLength={500} /></Form.Item>
            </> : <Descriptions column={1} items={[{ label: 'Title', children: mine.title || '—' }, { label: 'Bio', children: mine.bio || '—' }]} />}
            <Descriptions column={1} style={{ marginTop: editing ? 0 : 8 }} items={[
              { label: 'Specialization', children: mine.specialization },
              { label: 'Services', children: <Space size={[4, 4]} wrap>{(mine.services || []).map((s) => <Tag key={s._id} style={{ margin: 0 }}>{s.name}</Tag>)}</Space> }]} />
            <Typography.Text type="secondary">Specialization and services: managed by the administrator.</Typography.Text>
            {editing && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}><Button onClick={stop}>Cancel</Button><Button type="primary" htmlType="submit">Save changes</Button></div>}
          </Form>
        </Card>}
      </AsyncBoundary>
      <Card title="Account information">
        <Descriptions column={{ xs: 1, sm: 3 }} items={[{ label: 'Role', children: 'Doctor' }, { label: 'Status', children: <StatusBadge type="account" status={user.accountStatus} /> }, { label: 'Member since', children: formatLong(toDateString(user.createdAt)) }]} />
      </Card>
      <ConfirmModal open={!!pending} title="Save your changes?" okText="Save changes" onConfirm={save} onCancel={() => setPending(null)}>Your title and bio will be updated.</ConfirmModal>
    </>
  );
}
