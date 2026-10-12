// handleApiError.js - one error shape for mock and Axios: { status, code, message, fieldErrors? }
import { message } from 'antd';

export const apiError = (status, code, msg, fieldErrors) => Object.assign(new Error(msg), { status, code, fieldErrors });
// Shows a toast, or puts field errors beside the form inputs when a form is given.
export default function handleApiError(err, form) {
  if (form && err.fieldErrors) {
    form.setFields(Object.entries(err.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] })));
    return;
  }
  message.error(err.message || 'Something went wrong. Please try again.');
}
