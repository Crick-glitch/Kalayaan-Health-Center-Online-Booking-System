// AsyncBoundary.js - every data section shows loading, error and empty states the same way.
import { Button, Empty, Result, Skeleton, Typography } from 'antd';

export default function AsyncBoundary({ loading, error, empty, onRetry, loadingText = 'Loading...', emptyText, emptyHint, emptyAction, children }) {
  if (loading) return <div role="status" style={{ padding: 16 }}><Typography.Text type="secondary">{loadingText}</Typography.Text><Skeleton active paragraph={{ rows: 5 }} /></div>;
  if (error) return <Result status="error" title="Unable to load. Please try again." subTitle={error.message} extra={onRetry && <Button type="primary" onClick={onRetry}>Retry</Button>} />;
  if (empty) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><div><strong>{emptyText}</strong></div>{emptyHint && <div>{emptyHint}</div>}</>}>{emptyAction}</Empty>;
  return children;
}
