// SchedulePage.js - the doctor edits their own weekly schedule. The editor itself is shared with the admin.
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ScheduleEditor from '../../components/schedule/ScheduleEditor';

export default function SchedulePage() {
  const { user } = useAuth(), providers = useFetch(() => providerService.list(), []);
  const mine = (providers.data || []).find((p) => (p.user && p.user._id === user._id) || p.userId === user._id);
  return (
    <>
      <PageHeader title="Schedule" description="Choose the days and hours patients can book with you." />
      <AsyncBoundary loading={providers.loading} error={providers.error} onRetry={providers.reload} loadingText="Loading your schedule..." empty={!mine} emptyText="Your physician profile was not found." emptyHint="Please contact the administrator.">
        {mine && <ScheduleEditor providerId={mine._id} />}
      </AsyncBoundary>
    </>
  );
}
