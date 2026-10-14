// AdminDashboardPage.js - five counters, no charts: Total Patients, Total Providers, Today's appointments, Pending, Completed.
// Each card links to the matching list. 5 across on wide screens, 3 on tablets, 2 on phones.
import { Card, Grid, Statistic } from 'antd';
import { Link } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { todayString } from '../../utils/dateUtils';

export default function AdminDashboardPage() {
  const bp = Grid.useBreakpoint(), cols = bp.xl ? 5 : bp.md ? 3 : 2, today = todayString();
  const { data, loading, error, reload } = useFetch(() => Promise.all([patientService.list({ limit: 1 }), providerService.list(), appointmentService.list({ date: today }), appointmentService.list({ status: 'Pending' }), appointmentService.list({ status: 'Completed' })]), []);
  const cards = data && [
    ['Total patients', data[0].total, '/admin/patients'], ['Total physicians', data[1].length, '/admin/providers'], ["Today's appointments", data[2].length, `/admin/appointments?date=${today}`],
    ['Pending', data[3].length, '/admin/appointments?status=Pending'], ['Completed', data[4].length, '/admin/appointments?status=Completed'],
  ];
  return (
    <>
      <PageHeader title="Dashboard" description="An overview of the health center." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading the overview...">
        {cards && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
          {cards.map(([title, value, to]) => <Card key={title}><Statistic title={title} value={value} /><Link to={to}>View all</Link></Card>)}
        </div>}
      </AsyncBoundary>
    </>
  );
}
