// UserFormDrawer.js - Add or Edit a user account (admin). Add needs a role and a first password; a Doctor automatically gets an empty provider profile
// (complete it on the Providers page). Edit changes name and contact details only: email, role and status have their own actions.
import { useState } from 'react';
import { Alert, Button, Divider, Drawer, Form, Grid, Input, Select, Space, Typography, message } from 'antd';
import userService from '../../services/userService';
import { EmergencyFields, PersonalFields, fieldErrorsToForm, profileInitial, profileToApi } from '../forms/ProfileFields';
import handleApiError from '../../utils/handleApiError';
import { rules } from '../../utils/validators';
import { roleLabel } from '../../utils/formatters';

const ROLES = ['patient', 'doctor', 'receptionist', 'admin'].map((r) => ({ value: r, label: roleLabel(r) }));

export default function UserFormDrawer({ open, user, onClose, onSaved }) {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false), wide = !!Grid.useBreakpoint().sm, edit = !!user;
  const submit = async (values) => {
    setBusy(true);
    try {
      const body = profileToApi(values), saved = edit ? await userService.update(user._id, body) : await userService.create({ ...body, email: (body.email || '').trim() });
      message.success(edit ? 'User updated.' : 'User added.'); onSaved(saved);
    } catch (e) { if (e.fieldErrors) form.setFields(fieldErrorsToForm(e.fieldErrors)); else handleApiError(e); }
    setBusy(false);
  };
  return (
    <Drawer open={open} destroyOnClose maskClosable={false} width={wide ? 480 : '100%'} title={edit ? `Edit ${user.firstName} ${user.lastName}` : 'Add user'} onClose={busy ? undefined : onClose}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{edit ? 'Save changes' : 'Add user'}</Button></Space>}>
      <Form form={form} layout="vertical" initialValues={edit ? profileInitial(user) : { emergencyContact: {} }} onFinish={submit} scrollToFirstError>
        {!edit && <><Form.Item label="Role" name="role" rules={[{ required: true, message: 'Choose a role.' }]}><Select placeholder="Choose a role" options={ROLES} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.role !== b.role}>{({ getFieldValue }) => getFieldValue('role') === 'doctor' && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="An empty provider profile is created too. Complete it on the Providers page." />}</Form.Item></>}
        <Divider orientation="left" style={{ marginTop: 0 }}><Typography.Text strong>Personal information</Typography.Text></Divider>
        <PersonalFields strict={false} columns={1} email={edit ? 'view' : 'create'} emailValue={user && user.email} />
        {!edit && <Form.Item label="Password" name="password" rules={rules.password} extra="At least 8 characters with upper and lower case letters and a number. The user can change it in Settings."><Input.Password autoComplete="new-password" /></Form.Item>}
        {edit && user.role === 'patient' && <><Divider orientation="left"><Typography.Text strong>Emergency contact</Typography.Text></Divider><EmergencyFields columns={1} own="the patient's own" /></>}
      </Form>
    </Drawer>
  );
}
