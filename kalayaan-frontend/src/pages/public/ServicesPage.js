// ServicesPage.js - all services with category tabs. Used on the public site and in the patient area.
import { useState } from 'react';
import { Col, Row, Tabs } from 'antd';
import { SERVICE_CATEGORIES } from '../../config/constants';
import serviceService from '../../services/serviceService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ServiceCard from '../../components/common/ServiceCard';

export default function ServicesPage() {
  const { data, loading, error, reload } = useFetch(() => serviceService.list(), []);
  const [tab, setTab] = useState('All'), list = (data || []).filter((s) => tab === 'All' || s.category === tab);
  return (
    <>
      <PageHeader title="Services" description="Browse the services you can book." />
      <Tabs activeKey={tab} onChange={setTab} items={['All', ...SERVICE_CATEGORIES].map((k) => ({ key: k, label: k }))} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} empty={!list.length} emptyText="No services in this category." loadingText="Loading services...">
        <Row gutter={[16, 16]}>{list.map((s) => <Col key={s._id} xs={24} sm={12} lg={8}><ServiceCard service={s} /></Col>)}</Row>
      </AsyncBoundary>
    </>
  );
}
