// ProfileFields.js - the personal and emergency-contact form fields, shared by the Profile page and the patient Add/Edit drawer.
// strict = every field is required (patients). Other roles may leave date of birth, sex and address empty.
import { Col, DatePicker, Form, Input, Row, Select } from 'antd';
import dayjs from 'dayjs';
import { rules } from '../../utils/validators';
import { parseDate, toDateString } from '../../utils/dateUtils';

// The API names two emergency fields flat; the form nests them.
const FIELD_MAP = { emergencyName: ['emergencyContact', 'name'], emergencyNumber: ['emergencyContact', 'contactNumber'] };
export const fieldErrorsToForm = (fieldErrors) => Object.entries(fieldErrors).map(([name, msg]) => ({ name: FIELD_MAP[name] || name, errors: [msg] }));
export const profileInitial = (u) => ({ firstName: u.firstName, middleName: u.middleName, lastName: u.lastName, dateOfBirth: u.dateOfBirth ? parseDate(u.dateOfBirth) : null, sex: u.sex, contactNumber: u.contactNumber, address: u.address, emergencyContact: { ...(u.emergencyContact || {}) } });
export const profileToApi = (v) => ({ ...v, middleName: (v.middleName || '').trim(), dateOfBirth: v.dateOfBirth ? toDateString(v.dateOfBirth) : '' });
const colFor = (columns) => (columns === 1 ? { span: 24 } : { xs: 24, md: 12 });

// email: 'create' (editable, for a new patient), 'view' (shown disabled with emailValue) or nothing.
export function PersonalFields({ strict = true, columns = 2, email, emailValue }) {
  const col = colFor(columns);
  return (
    <Row gutter={16}>
      <Col {...col}><Form.Item label="First name" name="firstName" rules={rules.name}><Input autoComplete="off" /></Form.Item></Col>
      <Col {...col}><Form.Item label="Middle name (optional)" name="middleName" rules={rules.optionalName}><Input autoComplete="off" /></Form.Item></Col>
      <Col {...col}><Form.Item label="Last name" name="lastName" rules={rules.name}><Input autoComplete="off" /></Form.Item></Col>
      <Col {...col}><Form.Item label="Date of birth" name="dateOfBirth" rules={strict ? rules.dob : rules.dob.slice(1)}><DatePicker style={{ width: '100%' }} format="MMMM D, YYYY" disabledDate={(d) => d.isAfter(dayjs())} /></Form.Item></Col>
      <Col {...col}><Form.Item label="Sex" name="sex" rules={strict ? [{ required: true, message: 'Select an option.' }] : []}><Select allowClear={!strict} options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }]} /></Form.Item></Col>
      <Col {...col}><Form.Item label="Contact number" name="contactNumber" rules={rules.phone}><Input inputMode="tel" placeholder="09XXXXXXXXX" /></Form.Item></Col>
      {email === 'create' && <Col {...col}><Form.Item label="Email" name="email" rules={rules.email}><Input type="email" autoComplete="off" /></Form.Item></Col>}
      {email === 'view' && <Col {...col}><Form.Item label="Email" htmlFor="email-readonly"><Input id="email-readonly" value={emailValue} disabled /></Form.Item></Col>}
      <Col span={24}><Form.Item label="Address" name="address" rules={strict ? rules.address : rules.address.slice(1)}><Input.TextArea rows={2} placeholder="House number, street, barangay, city" /></Form.Item></Col>
    </Row>
  );
}

export function EmergencyFields({ columns = 2, own = 'your own' }) {
  const col = colFor(columns);
  return (
    <Row gutter={16}>
      <Col {...col}><Form.Item label="Name" name={['emergencyContact', 'name']} rules={rules.name}><Input /></Form.Item></Col>
      <Col {...col}><Form.Item label="Relationship" name={['emergencyContact', 'relationship']} rules={[{ required: true, message: 'Enter the relationship.' }]}><Input /></Form.Item></Col>
      <Col {...col}><Form.Item label="Contact number" name={['emergencyContact', 'contactNumber']} dependencies={['contactNumber']} rules={[...rules.phone, ...rules.differentFrom('contactNumber', `Use a different number from ${own}.`)]}><Input inputMode="tel" placeholder="09XXXXXXXXX" /></Form.Item></Col>
    </Row>
  );
}
