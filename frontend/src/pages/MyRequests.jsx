import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  pending: { bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', label: 'Pending' },
  assigned: { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', label: 'Assigned' },
  confirmed: { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', label: 'Confirmed' },
  completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: 'Completed' },
  cancelled: { bg: 'rgba(156, 163, 175, 0.12)', color: '#9ca3af', label: 'Cancelled' },
};

const PRIORITY_STYLES = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

const MyRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const url = filter ? `/api/appointments/my?status=${filter}` : '/api/appointments/my';
      const resp = await axios.get(url);
      setRequests(resp.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [filter]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment request?')) return;
    setCancellingId(id);
    try {
      await axios.put(`/api/appointments/${id}/cancel`);
      await fetchRequests();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>My Requests</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {requests.length} request{requests.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['', 'pending', 'assigned', 'completed', 'cancelled'].map(f => (
            <button key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setFilter(f)}>
              {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <span style={{ fontSize: '2.5rem' }}>📋</span>
          <h3 style={{ marginTop: '1rem', fontFamily: 'Outfit, sans-serif' }}>No Requests Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {filter ? `No ${filter} requests.` : 'You haven\'t submitted any appointment requests yet.'}
          </p>
          <Link to="/appointments/new" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            Book Appointment
          </Link>
        </div>
      ) : (
        <div className="request-list">
          {requests.map(req => {
            const statusStyle = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
            const priorityClass = PRIORITY_STYLES[req.priority_level] || 'badge-low';
            return (
              <div key={req.id} className="card request-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
                        {req.department_name || 'Department'}
                      </h3>
                      <span className={`badge ${priorityClass}`}>{req.priority_level || '—'}</span>
                      <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <span>Severity: <strong>{req.severity}/10</strong> ({req.severity_label})</span>
                      <span>Score: <strong>{req.priority_score ?? '—'}</strong>/100</span>
                      <span>Preferred: <strong>{formatDate(req.preferred_date)}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/appointments/${req.id}`} className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                      Details
                    </Link>
                    {(req.status === 'pending' || req.status === 'assigned') && (
                      <button className="btn btn-danger"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleCancel(req.id)}
                        disabled={cancellingId === req.id}>
                        {cancellingId === req.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Submitted {formatDate(req.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRequests;
