// PageHeader.js - the one header every authenticated page uses: title, description, right-aligned actions.
import { Breadcrumb, Typography } from 'antd';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <>
      {breadcrumb && <Breadcrumb style={{ marginBottom: 8 }} items={breadcrumb.map((b) => ({ title: b.to ? <Link to={b.to}>{b.label}</Link> : b.label }))} />}
      <div className="page-header">
        <div>
          <Typography.Title level={4} style={{ color: '#0B2545' }}>{title}</Typography.Title>
          {description && <Typography.Text type="secondary">{description}</Typography.Text>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </>
  );
}
