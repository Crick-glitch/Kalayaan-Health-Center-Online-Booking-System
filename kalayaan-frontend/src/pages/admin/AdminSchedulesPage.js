// AdminSchedulesPage.js - the admin picks a provider and edits that weekly schedule (the same ScheduleEditor the doctor uses).
import { useState } from 'react';
import { Select } from 'antd';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ScheduleEditor from '../../components/schedule/ScheduleEditor';
import { doctorName } from '../../utils/formatters';

export default function AdminSchedulesPage() {
  const providers = useFetch(() => providerService.list(), []), [picked, setPicked] = useState(null);
  const list = providers.data || [], pid = picked || (list[0] && list[0]._id);
  return (
    <>
      <PageHeader title="Schedules" description="Choose a physician, then set the days and hours patients can book." />
      <AsyncBoundary loading={providers.loading} error={providers.error} onRetry={providers.reload} loadingText="Loading physicians..." empty={!list.length} emptyText="No physicians yet." emptyHint="Add a physician first.">
        <Select aria-label="Physician" style={{ width: 300, marginBottom: 16 }} value={pid} onChange={setPicked} options={list.map((p) => ({ value: p._id, label: `${doctorName(p)} · ${p.specialization || 'No specialization'}` }))} />
        {pid && <ScheduleEditor key={pid} providerId={pid} />}
      </AsyncBoundary>
    </>
  );
}
