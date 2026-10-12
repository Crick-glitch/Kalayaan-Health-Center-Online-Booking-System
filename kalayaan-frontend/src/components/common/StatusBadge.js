// StatusBadge.js - one badge for every appointment and account status. Text + icon + color, never color alone.
import { Tag } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, LoginOutlined, StopOutlined, TeamOutlined } from '@ant-design/icons';

const AMBER = ['#FDF3DC', '#8A5A00', '#D98E04'], TEAL = ['#E8F3FA', '#0B5F68', '#0E7C86'], NAVY = ['#0B2545', '#FFFFFF', '#0B2545'];
const GREEN = ['#E3F5EC', '#1D6E4B', '#2E9E6B'], RED = ['#FBE9E7', '#A02E22', '#C0392B'], GRAY = ['#EEF2F6', '#4A5B6C', '#C5D0DA'];
const APPOINTMENT = {
  Pending: [<ClockCircleOutlined />, AMBER], Confirmed: [<CheckCircleOutlined />, TEAL], 'Checked In': [<LoginOutlined />, TEAL],
  'In Consultation': [<TeamOutlined />, NAVY], Completed: [<CheckCircleFilled />, GREEN], Cancelled: [<CloseCircleOutlined />, RED], 'No Show': [<StopOutlined />, RED],
};
const ACCOUNT = { active: ['Active', GREEN], inactive: ['Inactive', GRAY], suspended: ['Suspended', RED] };

export default function StatusBadge({ status, type = 'appointment' }) {
  const [icon, [bg, fg, bd]] = type === 'account' ? [<span aria-hidden="true">●</span>, ACCOUNT[status][1]] : APPOINTMENT[status];
  return <Tag className="kh-status-badge" icon={icon} style={{ background: bg, color: fg, borderColor: bd, margin: 0 }}>{type === 'account' ? ACCOUNT[status][0] : status}</Tag>;
}
