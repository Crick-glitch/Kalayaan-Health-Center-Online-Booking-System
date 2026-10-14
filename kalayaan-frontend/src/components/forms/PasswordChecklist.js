// PasswordChecklist.js - the password rules, ticked off live as the person types. Pair it with a Form.Item using rules.password.
import { Form } from 'antd';
import { CheckCircleFilled, CloseCircleOutlined } from '@ant-design/icons';
import { PASSWORD_CHECKS } from '../../utils/validators';

export default function PasswordChecklist({ name = 'password' }) {
  return (
    <Form.Item noStyle shouldUpdate={(a, b) => a[name] !== b[name]}>
      {({ getFieldValue }) => { const v = getFieldValue(name) || ''; return (
        <ul aria-live="polite" style={{ margin: '-8px 0 16px', padding: 0, listStyle: 'none', fontSize: 13 }}>
          {PASSWORD_CHECKS.map(([label, ok]) => <li key={label} style={{ color: ok(v) ? '#1D6E4B' : '#5B6B7B' }}>{ok(v) ? <CheckCircleFilled /> : <CloseCircleOutlined />} {label}</li>)}
        </ul>); }}
    </Form.Item>
  );
}