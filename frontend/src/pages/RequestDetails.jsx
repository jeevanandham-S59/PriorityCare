import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PRIORITY_STYLES = {
  Critical: { cls: 'badge-critical', color: 'var(--priority-critical)' },
  High: { cls: 'badge-high', color: 'var(--priority-high)' },
  Medium: { cls: 'badge-medium', color: 'var(--priority-medium)' },
  Low: { cls: 'badge-low', color: 'var(--priority-low)' },
};

const STATUS_STYLES = {
  pending: { bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', label: 'Pending' },
  assigned: { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', label: 'Assigned' },
  confirmed: { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', label: 'Confirmed' },
  completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: 'Completed' },
  cancelled: { bg: 'rgba(156, 163, 175, 0.12)', color: '#9ca3af', label: 'Cancelled' },
};

const RequestDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const resp = await axios.get(`/api/appointments/${id}`);
        setRequest(resp.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load request details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment request?')) return;
    setCancelling(true);
    try {
      await axios.put(`/api/appointments/${id}/cancel`);
      const resp = await axios.get(`/api/appointments/${id}`);
      setRequest(resp.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading request details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="form-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>Go Back</button>
      </div>
    );
  }

  if (!request) return null;

  const priorityStyle = PRIORITY_STYLES[request.priority_level] || PRIORITY_STYLES.Low;
  const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.pending;
  const canCancel = request.status === 'pending' || request.status === 'assigned';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>Request Details</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID: {request.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
          {canCancel && user?.role === 'patient' && (
            <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Request'}
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left: Main info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span className={`badge ${priorityStyle.cls}`} style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>
              {request.priority_level}
            </span>
            <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
              {statusStyle.label}
            </span>
          </div>

          {request.priority_explanation && (
            <div style={{ marginBottom: '1.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.95rem', border: '1px solid var(--border-color)', lineHeight: 1.5 }}>
              <strong>Triage explanation:</strong> {request.priority_explanation}
            </div>
          )}

          <div className="meta-info-list" style={{ marginBottom: '1.5rem' }}>
            <div className="meta-info-item">
              <span className="meta-label">Department</span>
              <span className="meta-value">{request.department_name || '—'}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Severity</span>
              <span className="meta-value">{request.severity}/10 ({request.severity_label})</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Duration</span>
              <span className="meta-value">
                {request.symptom_duration_days === 0 ? 'Just started' : `${request.symptom_duration_days} day(s)`}
              </span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Preferred Date</span>
              <span className="meta-value">{formatDate(request.preferred_date)}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Preferred Time</span>
              <span className="meta-value" style={{ textTransform: 'capitalize' }}>{request.preferred_time_slot}</span>
            </div>
            {request.assigned_doctor_name && (
              <div className="meta-info-item">
                <span className="meta-label">Assigned Doctor</span>
                <span className="meta-value">{request.assigned_doctor_name}</span>
              </div>
            )}
            {request.appointment_datetime && (
              <div className="meta-info-item">
                <span className="meta-label">Appointment Time</span>
                <span className="meta-value">{formatDateTime(request.appointment_datetime)}</span>
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Symptom Description
          </h4>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', lineHeight: '1.7', fontSize: '0.95rem' }}>
            {request.symptoms}
          </div>

          <div style={{ marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Submitted: {formatDateTime(request.created_at)} &nbsp;|&nbsp; Updated: {formatDateTime(request.updated_at)}
          </div>
        </div>

        {/* Right: Priority breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem', fontSize: '1.1rem' }}>
              Priority Assessment
            </h3>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `3px solid ${priorityStyle.color}`,
                fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 700,
              }}>
                {request.priority_score}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>out of 100</div>
            </div>

            {request.score_breakdown && (
              <div className="meta-info-list">
                <div className="meta-info-item">
                  <span className="meta-label">Severity</span>
                  <span className="meta-value">+{request.score_breakdown.severity_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Duration</span>
                  <span className="meta-value">+{request.score_breakdown.duration_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Age ({request.score_breakdown.patient_age} yrs)</span>
                  <span className="meta-value">+{request.score_breakdown.age_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Chronic Conditions</span>
                  <span className="meta-value">+{request.score_breakdown.chronic_condition_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Pregnancy</span>
                  <span className="meta-value">+{request.score_breakdown.pregnancy_points}</span>
                </div>
                {request.score_breakdown.urgent_keyword_points !== undefined && (
                  <div className="meta-info-item">
                    <span className="meta-label">Urgent Keywords</span>
                    <span className="meta-value">+{request.score_breakdown.urgent_keyword_points}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.03)', borderColor: 'rgba(239, 68, 68, 0.15)', padding: '1.25rem' }}>
            <h4 style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '0.5rem' }}>⚠️ Clinical Review Notice</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Triage category classifications support online scheduling sorting only. All priorities are subject to manual audit and must be confirmed by attending medical staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetails;
