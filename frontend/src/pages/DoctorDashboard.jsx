import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PRIORITY_CLASSES = {
  'Critical': 'badge-critical',
  'High': 'badge-high',
  'Medium': 'badge-medium',
  'Low': 'badge-low'
};

const STATUS_LABELS = {
  'pending': 'Pending Review',
  'assigned': 'Assigned/Scheduled',
  'confirmed': 'Confirmed',
  'completed': 'Completed',
  'cancelled': 'Cancelled'
};

const STATUS_COLORS = {
  'pending': { bg: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' },
  'assigned': { bg: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' },
  'confirmed': { bg: 'rgba(16, 185, 129, 0.1)', color: '#34d399' },
  'completed': { bg: 'rgba(107, 114, 128, 0.1)', color: '#9ca3af' },
  'cancelled': { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }
};

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Queue Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Selected appointment details drawer/modal
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Scheduling Form
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('assigned');
  const [scheduling, setScheduling] = useState(false);

  // Status Change Form
  const [updateStatus, setUpdateStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Notes Form
  const [newNote, setNewNote] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Load departments (for admins)
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const resp = await axios.get('/api/departments');
        setDepartments(resp.data);
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    };
    if (user && user.role === 'admin') {
      fetchDepartments();
    }
  }, [user]);

  // Load Queue
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

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, priorityFilter, dateFilter, deptFilter, user]);

  // Open Details Modal/Drawer
  const handleOpenDetails = async (requestId) => {
    setSelectedRequestId(requestId);
    setDetails(null);
    setDetailsLoading(true);
    setDetailsError('');
    setNotesList([]);
    setNewNote('');

    try {
      // 1. Fetch detailed profile & request
      const detailsResp = await axios.get(`/api/doctor/appointments/${requestId}`);
      setDetails(detailsResp.data);
      
      // Initialize forms
      setUpdateStatus(detailsResp.data.request.status);
      if (detailsResp.data.request.appointment_datetime) {
        const dt = new Date(detailsResp.data.request.appointment_datetime);
        setScheduleDate(dt.toISOString().split('T')[0]);
        setScheduleTime(dt.toTimeString().substring(0, 5));
      } else {
        setScheduleDate('');
        setScheduleTime('');
      }

      // 2. Fetch notes
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

  // Schedule action
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleTime) return;

    setScheduling(true);
    try {
      const isodt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      const resp = await axios.put(
        `/api/doctor/appointments/${selectedRequestId}/schedule?appointment_datetime=${isodt}&status=${scheduleStatus}`
      );
      
      // Update details request inline
      setDetails(prev => ({
        ...prev,
        request: {
          ...prev.request,
          status: resp.data.status,
          appointment_datetime: resp.data.appointment_datetime,
          assigned_doctor_name: resp.data.assigned_doctor_name || user.full_name
        }
      }));
      setUpdateStatus(resp.data.status);
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to schedule appointment.');
    } finally {
      setScheduling(false);
    }
  };

  // Change Status action
  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const resp = await axios.put(
        `/api/doctor/appointments/${selectedRequestId}/status?status=${updateStatus}`
      );
      setDetails(prev => ({
        ...prev,
        request: {
          ...prev.request,
          status: resp.data.status
        }
      }));
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Add Clinical Note action
  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const resp = await axios.post(
        `/api/doctor/appointments/${selectedRequestId}/notes`,
        { note: newNote }
      );
      setNotesList(prev => [...prev, resp.data]);
      setNewNote('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save note.');
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return 'Not scheduled';
    return new Date(dtStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateAge = (dobStr) => {
    if (!dobStr) return 'N/A';
    const birthDate = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>Clinical Triage Queue</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {user.role === 'admin' 
            ? 'Access and schedule patient triage requests across all departments.' 
            : 'Enforce patient prioritizations and assign scheduling dates for your department.'}
        </p>
      </div>

      {/* Queue Filter Panel */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter by Status</label>
            <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="assigned">Assigned/Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter by Urgency</label>
            <select className="form-control" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Preferred Date</label>
            <input type="date" className="form-control" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          </div>

          {user.role === 'admin' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Department</label>
              <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Queue Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Retrieving priority queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No triage requests match the active filters.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Symptoms</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Preferred Date</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(req => {
                const badgeClass = PRIORITY_CLASSES[req.priority_level] || 'badge-low';
                const st = STATUS_COLORS[req.status] || { bg: 'rgba(0,0,0,0.1)', color: '#fff' };
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                          {req.priority_level}
                        </span>
                        <strong style={{ fontFamily: 'Outfit, sans-serif' }}>{req.priority_score}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                      {req.department_name}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.symptoms}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                      {formatDate(req.preferred_date)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span className="badge" style={{ background: st.bg, color: st.color, fontSize: '0.8rem' }}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleOpenDetails(req.id)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details drawer overlay */}
      {selectedRequestId && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '680px', height: '100vh',
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)', zIndex: 1000,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif' }}>Triage Processing</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Request ID: {selectedRequestId}</p>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => setSelectedRequestId(null)}>
              Close Panel ✕
            </button>
          </div>

          {/* Body Content */}
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {detailsLoading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading details...</p>
            ) : detailsError ? (
              <div className="form-error">{detailsError}</div>
            ) : details && (
              <>
                {/* 1. Patient Profile Summary Card */}
                <div className="card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    👤 Patient Clinical Profile
                  </h3>
                  <div className="meta-info-list" style={{ gap: '0.5rem' }}>
                    <div className="meta-info-item">
                      <span className="meta-label">Full Name</span>
                      <span className="meta-value">{details.patient_profile.full_name}</span>
                    </div>
                    <div className="meta-info-item">
                      <span className="meta-label">Age & DOB</span>
                      <span className="meta-value">
                        {calculateAge(details.patient_profile.date_of_birth)} yrs ({formatDate(details.patient_profile.date_of_birth)})
                      </span>
                    </div>
                    <div className="meta-info-item">
                      <span className="meta-label">Gender</span>
                      <span className="meta-value" style={{ textTransform: 'capitalize' }}>{details.patient_profile.gender || '—'}</span>
                    </div>
                    <div className="meta-info-item">
                      <span className="meta-label">Pregnancy Status</span>
                      <span className="meta-value">{details.patient_profile.is_pregnant ? '🤰 Yes' : 'No'}</span>
                    </div>
                    <div className="meta-info-item">
                      <span className="meta-label">Chronic Conditions</span>
                      <span className="meta-value">
                        {details.patient_profile.chronic_conditions?.length > 0 
                          ? details.patient_profile.chronic_conditions.join(', ') 
                          : 'None reported'}
                      </span>
                    </div>
                    <div className="meta-info-item">
                      <span className="meta-label">Known Allergies</span>
                      <span className="meta-value">
                        {details.patient_profile.allergies?.length > 0 
                          ? details.patient_profile.allergies.join(', ') 
                          : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Request Details & Explanation */}
                <div className="card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    📋 Symptoms & Assessment
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <span className={`badge ${PRIORITY_CLASSES[details.request.priority_level]}`}>
                      Triage Category: {details.request.priority_level} ({details.request.priority_score}/100)
                    </span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                      Severity: {details.request.severity}/10
                    </span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                      Duration: {details.request.symptom_duration_days} days
                    </span>
                  </div>

                  {details.request.priority_explanation && (
                    <p style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid var(--primary)', marginBottom: '1.25rem' }}>
                      {details.request.priority_explanation}
                    </p>
                  )}

                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Patient-Reported Symptoms</h4>
                  <p style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {details.request.symptoms}
                  </p>
                </div>

                {/* 3. Scheduling & Status Transition Forms */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Scheduling Card */}
                  <div className="card">
                    <h4 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>Assign Appointment Time</h4>
                    <form onSubmit={handleScheduleSubmit}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Appointment Date</label>
                        <input type="date" className="form-control" required value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Time Slot</label>
                        <input type="time" className="form-control" required value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Target Status</label>
                        <select className="form-control" value={scheduleStatus} onChange={e => setScheduleStatus(e.target.value)}>
                          <option value="assigned">Assigned/Scheduled</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={scheduling}>
                        {scheduling ? 'Scheduling...' : 'Set Schedule Time'}
                      </button>
                    </form>
                  </div>

                  {/* Status transition Card */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>Update Triage Status</h4>
                      <form onSubmit={handleStatusChangeSubmit}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Triage State</label>
                          <select className="form-control" value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
                            <option value="pending">Pending Review</option>
                            <option value="assigned">Assigned/Scheduled</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={updatingStatus}>
                          {updatingStatus ? 'Updating...' : 'Change Status'}
                        </button>
                      </form>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Assigned Practitioner: <strong>{details.request.assigned_doctor_name || 'Unassigned'}</strong>
                      {details.request.appointment_datetime && (
                        <div style={{ marginTop: '0.25rem' }}>
                          Scheduled Date: <strong>{formatDateTime(details.request.appointment_datetime)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Internal Notes Section */}
                <div className="card">
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    📝 Clinical Internal Notes
                  </h3>
                  <small style={{ color: '#f87171', display: 'block', marginBottom: '1rem' }}>
                    ⚠️ Warning: Internal notes are only visible to clinical staff and system administrators. Patients cannot view these logs.
                  </small>

                  {/* Add note form */}
                  <form onSubmit={handleAddNoteSubmit} style={{ marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <textarea className="form-control" rows="3" required placeholder="Write clinical notes, observations, or scheduling changes..."
                        value={newNote} onChange={e => setNewNote(e.target.value)} disabled={addingNote} />
                    </div>
                    <button type="submit" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} disabled={addingNote}>
                      {addingNote ? 'Saving note...' : 'Add Internal Note'}
                    </button>
                  </form>

                  {/* Notes Feed */}
                  {notesLoading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading clinical notes...</p>
                  ) : notesList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No clinical notes logged yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {notesList.map(n => (
                        <div key={n.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            <strong>{n.author_name}</strong>
                            <span>{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{n.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
