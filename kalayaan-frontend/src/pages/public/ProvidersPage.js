// ProvidersPage.js - all physicians. Used publicly, in the patient area, and (readOnly) by the receptionist. 10 per page.
import { useState } from 'react';
import { Col, Row } from 'antd';
import { useLocation } from 'react-router-dom';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import AppPagination, { PAGE_SIZE } from '../../components/common/AppPagination';
import ProviderCard from '../../components/providers/ProviderCard';

export default function ProvidersPage({ readOnly }) {
  const { pathname } = useLocation(), { data, loading, error, reload } = useFetch(() => providerService.list(), []), [page, setPage] = useState(1);
  const list = data || [], shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <>
      <PageHeader title="Physicians" description="Browse physicians and what they offer." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} empty={!list.length} emptyText="No physicians yet." loadingText="Loading physicians...">
        <Row gutter={[16, 16]}>{shown.map((p) => <Col key={p._id} xs={24} md={12}><ProviderCard provider={p} readOnly={readOnly} profilePath={`${pathname.replace(/\/$/, '')}/${p._id}`} /></Col>)}</Row>
        <AppPagination total={list.length} page={page} onChange={setPage} />
      </AsyncBoundary>
    </>
  );
}