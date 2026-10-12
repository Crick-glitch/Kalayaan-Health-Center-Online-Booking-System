// PlaceholderPage.js - stands in for every screen until its phase is built (Phase 1A only).
import { Card, Empty } from 'antd';
import { Link } from 'react-router-dom';
import PageHeader from './PageHeader';

export default function PlaceholderPage({ title, description, links }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <Empty description="This screen is built in a later phase." />
        {links && <ul style={{ maxWidth: 360, margin: '16px auto 0' }}>{links.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul>}
      </Card>
    </>
  );
}
