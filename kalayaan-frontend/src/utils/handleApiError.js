// handleApiError.js - shows an API error: a toast, or messages beside the form inputs. The error shape is { status, code, message, fieldErrors? }.
import { message } from 'antd';

// Shows a toast, or puts field errors beside the form inputs when a form is given.
export default function handleApiError(err, form) {
  if (form && err.fieldErrors) {
    form.setFields(Object.entries(err.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] })));
    return;
  }
  message.error(err.message || 'Something went wrong. Please try again.');
}
