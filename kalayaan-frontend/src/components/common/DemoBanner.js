// DemoBanner.js - local setup notice. Hidden with clinic.SHOW_DEMO_BANNER = false.
import { Alert } from 'antd';
import clinic from '../../config/clinic';

export default function DemoBanner() {
  if (!clinic.SHOW_DEMO_BANNER) return null;
  return <Alert banner closable type="info" message="Account and appointment data is stored in MongoDB. Email codes use backend SMTP settings; local test codes are controlled by the backend environment." />;
}
