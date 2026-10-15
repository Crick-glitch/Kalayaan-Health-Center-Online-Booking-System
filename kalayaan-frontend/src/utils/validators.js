// validators.js - shared Ant Design Form rules. Field errors appear beside the inputs.
import dayjs from 'dayjs';

const NAME_RE = /^[A-Za-z\u00C0-\u00FF' -]{2,50}$/;
const PHONE_RE = /^(09\d{9}|\+639\d{9})$/; // Philippine mobile
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const NAME_MSG = 'Use 2 to 50 letters, spaces, hyphens or apostrophes.';
const PASSWORD_MSG = 'At least 8 characters with upper and lower case letters and a number.';

export const rules = {
  name: [{ required: true, message: 'This field is required.' }, { pattern: NAME_RE, message: NAME_MSG }],
  optionalName: [{ pattern: NAME_RE, message: NAME_MSG }],
  phone: [{ required: true, message: 'Enter a contact number.' }, { pattern: PHONE_RE, message: 'Use 09XXXXXXXXX or +639XXXXXXXXX.' }],
  email: [{ required: true, message: 'Enter an email address.' }, { type: 'email', message: 'Enter a valid email address.' }],
  address: [{ required: true, message: 'Enter an address.' }, { min: 10, message: 'Enter at least 10 characters.' }],
  password: [{ required: true, message: 'Enter a password.' }, { pattern: PASSWORD_RE, message: PASSWORD_MSG }],
  dob: [{ required: true, message: 'Select a date of birth.' }, { validator: (_, v) => (!v || (!dayjs(v).isAfter(dayjs()) && !dayjs(v).isBefore(dayjs().subtract(120, 'year'))) ? Promise.resolve() : Promise.reject(new Error('Enter a valid date of birth.'))) }],
  confirm: (field = 'password') => [{ required: true, message: 'Confirm the password.' }, ({ getFieldValue }) => ({ validator: (_, v) => (!v || getFieldValue(field) === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match.'))) })],
  differentFrom: (field, message) => [({ getFieldValue }) => ({ validator: (_, v) => (!v || getFieldValue(field) !== v ? Promise.resolve() : Promise.reject(new Error(message))) })],
  reason: (min, max) => [{ required: true, message: 'Enter a reason.' }, { min, max, message: `Use ${min} to ${max} characters.` }],
};


// Realtime validation: spread on every <Form {...live}>. Each field is checked while typing and again when the person leaves it.
export const live = { validateTrigger: ['onChange', 'onBlur'], validateFirst: true };
// The password rules, one by one, for the live checklist under the password field.
export const PASSWORD_CHECKS = [['At least 8 characters', (v) => v.length >= 8], ['An uppercase letter', (v) => /[A-Z]/.test(v)], ['A lowercase letter', (v) => /[a-z]/.test(v)], ['A number', (v) => /\d/.test(v)]];
// Realtime message for a free-text field (reason, summary): '' while it is fine or still empty-and-untouched.
export const textProblem = (value, min, max, touched = true) => {
  const n = (value || '').trim().length;
  if (!touched) return '';
  if (n < min) return n === 0 ? 'This field is required.' : `Enter at least ${min} characters (${n}/${min}).`;
  return (value || '').length > max ? `Use up to ${max} characters.` : '';
};