// ProfilePage.js - view and edit my own profile. Used by the patient and the receptionist (the receptionist has no emergency contact card).
// The doctor's variant (title and bio) comes in the doctor phase. "Edit profile" turns the cards into one form; Save asks for confirmation first.
// Email, role and status can never be changed here.
import { useState } from 'react';
import { Button, Card, Descriptions, Form, message } from 'antd';
import authService from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { EmergencyFields, PersonalFields, fieldErrorsToForm, profileInitial, profileToApi } from '../../components/forms/ProfileFields';
import handleApiError from '../../utils/handleApiError';
import { formatLong, toDateString } from '../../utils/dateUtils';
import { fullName } from '../../utils/formatters';

const ROLE_LABEL = { patient: 'Patient', receptionist: 'Receptionist', doctor: 'Doctor', admin: 'Administrator' };

export default function ProfilePage() {
  const { user, updateUser } = useAuth(), [form] = Form.useForm(), [editing, setEditing] = useState(false), [pending, setPending] = useState(null);
  const isPatient = user.role === 'patient', e = user.emergencyContact || {};
  const start = () => { form.setFieldsValue(profileInitial(user)); setEditing(true); };
  const stop = () => { form.resetFields(); setEditing(false); };
  const save = async () => { // runs after the person confirms
    try {
      const { user: fresh } = await authService.updateProfile(profileToApi(pending));
      updateUser(fresh); message.success('Profile updated.'); setEditing(false);
    } catch (err) {
      if (err.fieldErrors) form.setFields(fieldErrorsToForm(err.fieldErrors));
      else handleApiError(err);
    }
    setPending(null);
  };
  return (
    <>
      <PageHeader title="Profile" description="Your personal details. Your email cannot be changed here." actions={!editing && <Button type="primary" onClick={start}>Edit profile</Button>} />
      <Form form={form} layout="vertical" initialValues={profileInitial(user)} onFinish={setPending} scrollToFirstError>
        <Card title="Personal information" style={{ marginBottom: 16 }}>
          {!editing ? <Descriptions column={{ xs: 1, sm: 2 }} items={[
            { label: 'Name', children: fullName(user) }, { label: 'Date of birth', children: formatLong(user.dateOfBirth) }, { label: 'Sex', children: user.sex || '—' },
            { label: 'Contact number', children: user.contactNumber }, { label: 'Email', children: user.email }, { label: 'Address', span: 2, children: user.address || '—' }]} />
          : <PersonalFields strict={isPatient} email="view" emailValue={user.email} />}
        </Card>
        {isPatient && <Card title="Emergency contact" style={{ marginBottom: 16 }}>
          {!editing ? <Descriptions column={{ xs: 1, sm: 3 }} items={[{ label: 'Name', children: e.name }, { label: 'Relationship', children: e.relationship }, { label: 'Contact number', children: e.contactNumber }]} /> : <EmergencyFields />}
        </Card>}
        <Card title="Account information" style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 1, sm: 3 }} items={[{ label: 'Role', children: ROLE_LABEL[user.role] }, { label: 'Status', children: <StatusBadge type="account" status={user.accountStatus} /> }, { label: 'Member since', children: formatLong(toDateString(user.createdAt)) }]} />
        </Card>
        {editing && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}><Button onClick={stop}>Cancel</Button><Button type="primary" htmlType="submit">Save changes</Button></div>}
      </Form>
      <ConfirmModal open={!!pending} title="Save your changes?" okText="Save changes" onConfirm={save} onCancel={() => setPending(null)}>Your profile will be updated with the details you entered.</ConfirmModal>
    </>
  );
}
