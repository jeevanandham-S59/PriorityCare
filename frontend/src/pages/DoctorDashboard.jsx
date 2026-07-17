import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader, Card, Input, Button, Badge, StatusBadge, PriorityDot,
  DataTable, AlertBanner, Spinner, Modal, EmptyState,
} from '../components/ui';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'assigned', label: 'Assigned/Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('assigned');
  const [scheduling, setScheduling] = useState(false);

  const [updateStatus, setUpdateStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const resp = await axios.get('/api/departments');
        setDepartments(resp.data);
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    };
    if (user && user.role === 'admin') fetchDepartments();
  }, [user]);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (dateFilter) params.date = dateFilter;
      if (user.role === 'admin' && deptFilter) params.department_id = deptFilter;

      const resp = await axios.get('/api/doctor/queue', { params });
      setQueue(resp.data);
    } catch (err) {
      setError('Failed to retrieve clinical queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, [statusFilter, priorityFilter, dateFilter, deptFilter, user]);

  const handleOpenDetails = async (requestId) => {
    setSelectedRequestId(requestId);
    setDetails(null);
    setDetailsLoading(true);
    setDetailsError('');
    setNotesList([]);
    setNewNote('');
    setActionError('');

    try {
      const detailsResp = await axios.get(`/api/doctor/appointments/${requestId}`);
      setDetails(detailsResp.data);

      setUpdateStatus(detailsResp.data.request.status);
      if (detailsResp.data.request.appointment_datetime) {
        const dt = new Date(detailsResp.data.request.appointment_datetime);
        setScheduleDate(dt.toISOString().split('T')[0]);
        setScheduleTime(dt.toTimeString().substring(0, 5));
      } else {
        setScheduleDate('');
        setScheduleTime('');
      }

      setNotesLoading(true);
      const notesResp = await axios.get(`/api/doctor/appointments/${requestId}/notes`);
      setNotesList(notesResp.data);
    } catch (err) {
      setDetailsError('Failed to fetch request clinical details.');
    } finally {
      setDetailsLoading(false);
      setNotesLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleTime) return;
    setScheduling(true);
    try {
      const isodt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      const resp = await axios.put(
        `/api/doctor/appointments/${selectedRequestId}/schedule?appointment_datetime=${isodt}&status=${scheduleStatus}`
      );
      setDetails(prev => ({
        ...prev, request: {
          ...prev.request, status: resp.data.status,
          appointment_datetime: resp.data.appointment_datetime,
          assigned_doctor_name: resp.data.assigned_doctor_name || user.full_name,
        }
      }));
      setUpdateStatus(resp.data.status);
      fetchQueue();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to schedule appointment.');
    } finally { setScheduling(false); }
  };

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const resp = await axios.put(`/api/doctor/appointments/${selectedRequestId}/status?status=${updateStatus}`);
      setDetails(prev => ({ ...prev, request: { ...prev.request, status: resp.data.status } }));
      fetchQueue();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to update status.');
    } finally { setUpdatingStatus(false); }
  };

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const resp = await axios.post(`/api/doctor/appointments/${selectedRequestId}/notes`, { note: newNote });
      setNotesList(prev => [...prev, resp.data]);
      setNewNote('');
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to save note.');
    } finally { setAddingNote(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return 'Not scheduled';
    return new Date(dtStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const calculateAge = (dobStr) => {
    if (!dobStr) return 'N/A';
    const birthDate = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const queueColumns = [
    {
      key: 'priority',
      label: 'Priority',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PriorityDot level={req.priority_level} />
          <Badge variant={req.priority_level}>{req.priority_level}</Badge>
          <strong style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.9rem' }}>{req.priority_score}</strong>
        </div>
      ),
    },
    { key: 'department_name', label: 'Department', render: (r) => r.department_name },
    {
      key: 'symptoms',
      label: 'Symptoms',
      cellStyle: { maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      render: (r) => r.symptoms,
    },
    {
      key: 'preferred_date',
      label: 'Preferred Date',
      render: (r) => formatDate(r.preferred_date),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <Button size="sm" variant="secondary" onClick={() => handleOpenDetails(r.id)}
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clinical Triage Queue"
        subtitle={user.role === 'admin'
          ? 'Access and schedule patient triage requests across all departments.'
          : 'Review patient prioritizations and assign scheduling dates for your department.'}
      />

      <Card style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <Input label="Filter by Status" type="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Input>
          <Input label="Filter by Urgency" type="select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Input>
          <Input label="Preferred Date" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          {user.role === 'admin' && (
            <Input label="Department" type="select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Input>
          )}
        </div>
      </Card>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <DataTable
        columns={queueColumns}
        data={queue}
        loading={loading}
        emptyTitle="No Results"
        emptyDescription="No triage requests match the active filters."
        emptyIcon={'\uD83D\uDD0D'}
      />

      <Modal
        open={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        title={selectedRequestId ? `Triage Processing - ID: ${selectedRequestId}` : ''}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedRequestId(null)}>Close Panel</Button>
        }
      >
        {detailsLoading ? (
          <Spinner text="Loading details..." />
        ) : detailsError ? (
          <AlertBanner variant="error">{detailsError}</AlertBanner>
        ) : actionError ? (
          <AlertBanner variant="error">{actionError}</AlertBanner>
        ) : details && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card style={{ background: '#f8fafc' }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                Patient Clinical Profile
              </h3>
              <div className="meta-info-list" style={{ gap: '0.5rem' }}>
                <div className="meta-info-item">
                  <span className="meta-label">Full Name</span>
                  <span className="meta-value">{details.patient_profile.full_name}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Age & DOB</span>
                  <span className="meta-value">{calculateAge(details.patient_profile.date_of_birth)} yrs ({formatDate(details.patient_profile.date_of_birth)})</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Gender</span>
                  <span className="meta-value" style={{ textTransform: 'capitalize' }}>{details.patient_profile.gender || '\u2014'}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Pregnancy</span>
                  <span className="meta-value">{details.patient_profile.is_pregnant ? 'Yes' : 'No'}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Chronic Conditions</span>
                  <span className="meta-value">{details.patient_profile.chronic_conditions?.length > 0 ? details.patient_profile.chronic_conditions.join(', ') : 'None reported'}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Allergies</span>
                  <span className="meta-value">{details.patient_profile.allergies?.length > 0 ? details.patient_profile.allergies.join(', ') : 'None'}</span>
                </div>
              </div>
            </Card>

            <Card style={{ background: '#f8fafc' }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                Symptoms & Assessment
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <Badge variant={details.request.priority_level}>
                  {details.request.priority_level} ({details.request.priority_score}/100)
                </Badge>
                <Badge variant="Low">Severity: {details.request.severity}/10</Badge>
                <Badge variant="Low">Duration: {details.request.symptom_duration_days} days</Badge>
              </div>
              {details.request.priority_explanation && (
                <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid var(--accent)', marginBottom: '1rem' }}>
                  {details.request.priority_explanation}
                </div>
              )}
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Patient-Reported Symptoms</h4>
              <p style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {details.request.symptoms}
              </p>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <Card>
                <h4 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1rem' }}>Assign Appointment Time</h4>
                <form onSubmit={handleScheduleSubmit}>
                  <Input label="Appointment Date" type="date" required value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                  <Input label="Time Slot" type="time" required value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                  <Input label="Target Status" type="select" value={scheduleStatus} onChange={e => setScheduleStatus(e.target.value)}>
                    <option value="assigned">Assigned/Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                  </Input>
                  <Button type="submit" fullWidth loading={scheduling} disabled={scheduling} style={{ marginTop: '0.5rem' }}>
                    Set Schedule Time
                  </Button>
                </form>
              </Card>

              <Card>
                <h4 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1rem' }}>Update Triage Status</h4>
                <form onSubmit={handleStatusChangeSubmit}>
                  <Input label="Triage State" type="select" value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
                    {STATUS_OPTIONS.filter(o => o.value !== '').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Input>
                  <Button type="submit" variant="secondary" fullWidth loading={updatingStatus} disabled={updatingStatus} style={{ marginTop: '0.5rem' }}>
                    Change Status
                  </Button>
                </form>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Assigned: <strong>{details.request.assigned_doctor_name || 'Unassigned'}</strong>
                  {details.request.appointment_datetime && (
                    <div style={{ marginTop: '0.25rem' }}>Scheduled: <strong>{formatDateTime(details.request.appointment_datetime)}</strong></div>
                  )}
                </div>
              </Card>
            </div>

            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                Clinical Internal Notes
              </h3>
              <div style={{ color: '#b91c1c', fontSize: '0.75rem', fontWeight: 600, marginBottom: '1rem' }}>
                {'\u26A0\uFE0F'} Internal notes are only visible to clinical staff.
              </div>

              <form onSubmit={handleAddNoteSubmit} style={{ marginBottom: '1.5rem' }}>
                <Input type="textarea" rows={3} required placeholder="Write clinical notes, observations, or scheduling changes..."
                  value={newNote} onChange={e => setNewNote(e.target.value)} disabled={addingNote} />
                <Button type="submit" variant="secondary" size="sm" loading={addingNote} disabled={addingNote} style={{ marginTop: '0.5rem' }}>
                  Add Internal Note
                </Button>
              </form>

              {notesLoading ? (
                <Spinner text="Loading clinical notes..." size="sm" />
              ) : notesList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No clinical notes logged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {notesList.map(n => (
                    <div key={n.id} style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        <strong>{n.author_name}</strong>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DoctorDashboard;
