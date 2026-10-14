// PatientFormDrawer.js - Add or Edit a patient (receptionist). Right-side 480px Drawer, full width on phones.
// A patient added by staff has no password yet: they choose one with "Forgot password" on the login page. The email cannot be edited afterwards.
import { useState } from 'react';
import { Alert, Button, Divider, Drawer, Form, Grid, Space, Typography, message } from 'antd';
import patientService from '../../services/patientService';
import { EmergencyFields, PersonalFields, fieldErrorsToForm, profileInitial, profileToApi } from '../forms/ProfileFields';
import handleApiError from '../../utils/handleApiError';
import { live } from '../../utils/validators';

export default function PatientFormDrawer({ open, patient, onClose, onSaved }) {
  const [form] = Form.useForm(), [busy, setBusy] = useState(false), wide = !!Grid.useBreakpoint().sm, edit = !!patient;
  const submit = async (values) => {
    setBusy(true);
    try {
      const body = profileToApi(values), saved = edit ? await patientService.update(patient._id, body) : await patientService.create(body);
      message.success(edit ? 'Patient updated.' : 'Patient added.'); onSaved(saved);
    } catch (e) {
      if (e.fieldErrors) form.setFields(fieldErrorsToForm(e.fieldErrors)); else handleApiError(e);
    }
    setBusy(false);
  };
  return (
    <Drawer open={open} destroyOnClose maskClosable={false} width={wide ? 480 : '100%'} title={edit ? 'Edit patient' : 'Add patient'} onClose={busy ? undefined : onClose}
      footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{edit ? 'Save changes' : 'Add patient'}</Button></Space>}>
      <Form form={form} layout="vertical" {...live} initialValues={edit ? profileInitial(patient) : { emergencyContact: {} }} onFinish={submit} scrollToFirstError>
        {!edit && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="No password is set. The patient chooses one with “Forgot password” on the login page." />}
        <Divider orientation="left" style={{ marginTop: 0 }}><Typography.Text strong>Personal information</Typography.Text></Divider>
        <PersonalFields columns={1} email={edit ? 'view' : 'create'} emailValue={patient && patient.email} />
        <Divider orientation="left"><Typography.Text strong>Emergency contact</Typography.Text></Divider>
        <EmergencyFields columns={1} own="the patient's own" />
      </Form>
    </Drawer>
  );
}
