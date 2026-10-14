// PatientsPage.js - the patient directory. Receptionist (default): search, Add patient, Edit, View history. No archive here (admin only).
// variant="doctor": read-only. The API returns only patients with an appointment with this doctor, and Visits counts only visits with them.
// variant="admin": read-only like the receptionist's table, plus Archive (blocked while the patient has upcoming appointments).
// The list comes from GET /api/patients (searched and paged by the server). ?add=1 opens the Add drawer (the Create Appointment page links here).
import { useEffect, useState } from 'react';
import { Avatar, Button, Input, Space, Table, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import patientService from '../../services/patientService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { tablePager } from '../../components/common/AppPagination';
import PatientFormDrawer from '../../components/patients/PatientFormDrawer';
import PatientHistoryDrawer from '../../components/patients/PatientHistoryDrawer';
import ArchiveFlow from '../../components/common/ArchiveFlow';
import appointmentService from '../../services/appointmentService';
import userService from '../../services/userService';
import { ageOf, formatLong } from '../../utils/dateUtils';
import { fullName, initials } from '../../utils/formatters';

const PAGE_SIZE = 10;

export default function PatientsPage({ variant }) {
  const doctor = variant === 'doctor', admin = variant === 'admin', edits = !doctor && !admin, [params] = useSearchParams(), [archiveFor, setArchiveFor] = useState(null), [query, setQuery] = useState(''), [term, setTerm] = useState(''), [page, setPage] = useState(1);
  const [form, setForm] = useState(edits && params.get('add') === '1' ? { patient: null } : null), [history, setHistory] = useState(null); // form: { patient } (null patient = add)
  useEffect(() => { const t = setTimeout(() => { setTerm(query.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [query]);
  const list = useFetch(() => patientService.list({ search: term || undefined, page, limit: PAGE_SIZE }), [term, page]);
  const rows = (list.data && list.data.patients) || [];
  const columns = [
    { title: 'Patient', render: (_, p) => <Space><Avatar size={24}>{initials(p)}</Avatar><div>{fullName(p)}<br /><Typography.Text type="secondary">{p.email}</Typography.Text></div></Space> },
    ...(doctor ? [{ title: 'Age and sex', render: (_, p) => [ageOf(p.dateOfBirth), p.sex].filter((x) => x !== null && x !== undefined && x !== '').join(' · ') || '—' }]
      : [{ title: 'Contact', dataIndex: 'contactNumber' }, { title: 'Date of birth', render: (_, p) => formatLong(p.dateOfBirth) }]),
    { title: 'Last visit', render: (_, p) => formatLong(p.lastVisit) },
    ...(doctor ? [{ title: 'Visits', dataIndex: 'visits' }] : []),
    { title: 'Actions', align: 'right', render: (_, p) => <Space size={4}><Button type="link" size="small" onClick={() => setHistory(p)}>View history</Button>{edits && <Button type="link" size="small" onClick={() => setForm({ patient: p })}>Edit</Button>}{admin && <Button type="link" size="small" danger onClick={() => setArchiveFor(p)}>Archive</Button>}</Space> },
  ];
  return (
    <>
      <PageHeader title="Patients" description={doctor ? 'Patients who have booked with you.' : admin ? 'Patient records. Archive a patient who no longer uses the health center.' : 'Search, add and update patient records.'} actions={edits && <Button type="primary" onClick={() => setForm({ patient: null })}>Add patient</Button>} />
      <Input allowClear prefix={<SearchOutlined />} placeholder="Search by name, email or phone" aria-label="Search patients" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280, marginBottom: 16 }} />
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading patients..." empty={!rows.length} emptyText={doctor && !term ? 'No patients yet.' : 'No patients found.'} emptyHint={doctor ? 'Patients appear here once they have an appointment with you.' : 'Try a different search, or add a new patient.'}>
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={tablePager(list.data ? list.data.total : 0, { current: page, total: list.data ? list.data.total : 0, onChange: setPage })} />
      </AsyncBoundary>
      {edits && <PatientFormDrawer open={!!form} patient={form && form.patient} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />}
      <PatientHistoryDrawer open={!!history} patient={history} onClose={() => setHistory(null)} basePath={doctor ? '/doctor' : admin ? '/admin' : '/staff'} />
      {admin && <ArchiveFlow open={!!archiveFor} kind="patient" name={archiveFor ? fullName(archiveFor) : ''} onCount={() => appointmentService.list({ patientId: archiveFor._id })} onArchive={(reason) => userService.archive(archiveFor._id, reason)}
        link={archiveFor && `/admin/appointments?patientId=${archiveFor._id}`} onClose={() => setArchiveFor(null)} onDone={() => { setArchiveFor(null); list.reload(); }} />}
    </>
  );
}
