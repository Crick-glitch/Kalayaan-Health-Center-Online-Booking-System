// ProvidersPage.js - all doctors. Used publicly, in the patient area, and (readOnly) by the receptionist.
import { Col, Row } from 'antd';
import { useLocation } from 'react-router-dom';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ProviderCard from '../../components/providers/ProviderCard';

export default function ProvidersPage({ readOnly }) {
  const { pathname } = useLocation(), { data, loading, error, reload } = useFetch(() => providerService.list(), []);
  return (
    <>
      <PageHeader title="Providers" description="Browse doctors and what they offer." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} empty={!data || !data.length} emptyText="No providers yet." loadingText="Loading providers...">
        <Row gutter={[16, 16]}>{(data || []).map((p) => <Col key={p._id} xs={24} md={12}><ProviderCard provider={p} readOnly={readOnly} profilePath={`${pathname.replace(/\/$/, '')}/${p._id}`} /></Col>)}</Row>
      </AsyncBoundary>
    </>
  );
}
