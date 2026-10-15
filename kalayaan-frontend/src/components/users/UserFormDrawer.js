// UserFormDrawer.js - Add or Edit an employee account (admin). Add needs a role (Admin, Receptionist or Physician) and a first password;
// a Physician automatically gets an empty profile, and the profile form opens right after the account is added (it is also the Profile button on Employees). The role is fixed once the account exists.
// Edit changes name and contact details only: email, role and status have their own places.
import { useState } from 'react';
import { Alert, Button, Divider, Drawer, Form, Grid, Input, Select, Space, Typography, message } from 'antd';
import userService from '../../services/userService';
import { PersonalFields, fieldErrorsToForm, profileInitial, profileToApi } from '../forms/ProfileFields';
import PasswordChecklist from '../forms/PasswordChecklist';
import handleApiError from '../../utils/handleApiError';
import { live, rules } from '../../utils/validators';
import { roleLabel } from '../../utils/formatters';

const ROLES = ['admin', 'receptionist', 'doctor'].map((r) => ({ value: r, label: roleLabel(r) }));

export default function UserFormDrawer({ open, user, onClose, onSaved }) {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false), wide = !!Grid.useBreakpoint().sm, edit = !!user;
  const submit = async (values) => {
    setBusy(true);
    try {
      const body = profileToApi(values), saved = edit ? await userService.update(user._id, body) : await userService.create({ ...body, email: (body.email || '').trim() });
      message.success(edit ? 'Employee updated.' : 'Employee added.'); onSaved(saved);
    } catch (e) { if (e.fieldErrors) form.setFields(fieldErrorsToForm(e.fieldErrors)); else handleApiError(e); }
    setBusy(false);
  };
  return (
    <Drawer open={open} destroyOnClose maskClosable={false} width={wide ? 480 : '100%'} title={edit ? `Edit ${user.firstName} ${user.lastName}` : 'Add employee'} onClose={busy ? undefined : onClose}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{edit ? 'Save changes' : 'Add employee'}</Button></Space>}>
      <Form form={form} layout="vertical" {...live} initialValues={edit ? profileInitial(user) : { emergencyContact: {} }} onFinish={submit} scrollToFirstError>
        {!edit && <><Form.Item label="Role" name="role" rules={[{ required: true, message: 'Choose a role.' }]} extra="The role cannot be changed after the account is created."><Select placeholder="Choose a role" options={ROLES} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.role !== b.role}>{({ getFieldValue }) => getFieldValue('role') === 'doctor' && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="An empty physician profile is created too. The profile form opens right after you add the account." />}</Form.Item></>}
        {edit && <Form.Item label="Role" htmlFor="role-readonly" extra="The role cannot be changed after the account is created."><Input id="role-readonly" value={roleLabel(user.role)} disabled /></Form.Item>}
        <Divider orientation="left" style={{ marginTop: 0 }}><Typography.Text strong>Personal information</Typography.Text></Divider>
        <PersonalFields strict={false} columns={1} email={edit ? 'view' : 'create'} emailValue={user && user.email} />
        {!edit && <><Form.Item label="Password" name="password" rules={rules.password} extra="The employee can change it in Settings."><Input.Password autoComplete="new-password" /></Form.Item><PasswordChecklist /></>}
      </Form>
    </Drawer>
  );
}