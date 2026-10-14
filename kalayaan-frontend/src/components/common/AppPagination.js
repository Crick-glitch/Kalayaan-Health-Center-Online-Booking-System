// AppPagination.js - ONE pagination for every list, with the same look as the Appointments table (10 per page, no size changer).
// It is always shown. While everything fits on one page (10 items or fewer) it is greyed out and cannot be clicked.
import { Pagination } from 'antd';

export const PAGE_SIZE = 10;

// For <Table pagination={...}>. total = number of items. Client-side tables: tablePager(rows.length).
// Server-side tables: tablePager(total, { current: page, total, onChange: setPage }).
export const tablePager = (total, extra = {}) => ({ pageSize: PAGE_SIZE, showSizeChanger: false, hideOnSinglePage: false, disabled: total <= PAGE_SIZE, ...extra });

// For lists that are not tables (cards, notifications).
export default function AppPagination({ total, page, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 0' }}>
      <Pagination current={page} pageSize={PAGE_SIZE} total={total} showSizeChanger={false} disabled={total <= PAGE_SIZE} onChange={onChange} />
    </div>
  );
}