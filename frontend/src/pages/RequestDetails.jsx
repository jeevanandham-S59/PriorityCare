import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Button, Badge, StatusBadge, AlertBanner, Spinner, ConfirmDialog } from '../components/ui';

const PRIORITY_CLASSES = {
  Critical: 'badge-critical', High: 'badge-high',
  Medium: 'badge-medium', Low: 'badge-low',
};

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const resp = await axios.get(`/api/appointments/${id}`);
        setRequest(resp.data);
      } catch (err) {
        setError('Failed to load request details.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    setShowConfirm(false);
    try {
      await axios.put(`/api/appointments/${id}/cancel`);
      const resp = await axios.get(`/api/appointments/${id}`);
      setRequest(resp.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '\u2014';
    return new Date(dtStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <Spinner text="Loading request details..." />;
  if (error) return <div><AlertBanner variant="error">{error}</AlertBanner><Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button></div>;
  if (!request) return null;

  return (
    <div>
      <PageHeader
        title="Request Details"
        subtitle={`Request ID: ${id}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
            {user?.role === 'patient' && (request.status === 'pending' || request.status === 'assigned') && (
              <Button variant="danger" onClick={() => setShowConfirm(true)} loading={cancelling}>Cancel Request</Button>
            )}
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Assessment Overview
          </h3>
          <div className="meta-info-list">
            <div className="meta-info-item">
              <span className="meta-label">Department</span>
              <span className="meta-value">{request.department_name}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Priority Level</span>
              <span className="meta-value"><Badge variant={request.priority_level}>{request.priority_level}</Badge></span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Priority Score</span>
              <span className="meta-value" style={{ color: 'var(--primary)' }}>{request.priority_score}/100</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Status</span>
              <span className="meta-value"><StatusBadge status={request.status} /></span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Severity</span>
              <span className="meta-value">{request.severity}/10</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Duration</span>
              <span className="meta-value">{request.symptom_duration_days} day(s)</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Preferred Date</span>
              <span className="meta-value">{formatDate(request.preferred_date)}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Time Slot</span>
              <span className="meta-value" style={{ textTransform: 'capitalize' }}>{request.preferred_time_slot || '\u2014'}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Assigned Doctor</span>
              <span className="meta-value">{request.assigned_doctor_name || 'Unassigned'}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Appointment</span>
              <span className="meta-value">{formatDateTime(request.appointment_datetime)}</span>
            </div>
            <div className="meta-info-item">
              <span className="meta-label">Submitted</span>
              <span className="meta-value">{formatDateTime(request.created_at)}</span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {request.priority_explanation && (
            <Card accent="teal" style={{ background: '#f8fafc' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Triage Explanation
              </h4>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{request.priority_explanation}</p>
            </Card>
          )}

          <Card>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Symptoms Reported
            </h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              {request.symptoms}
            </p>
          </Card>

          {request.score_breakdown && (
            <Card>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Score Breakdown
              </h4>
              <div className="meta-info-list">
                {Object.entries(request.score_breakdown).map(([key, val]) => (
                  <div key={key} className="meta-info-item">
                    <span className="meta-label" style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                    <span className="meta-value">{typeof val === 'number' ? `+${val}` : val}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Request"
        message="Are you sure you want to cancel this appointment request? This action cannot be undone."
        confirmLabel="Yes, Cancel Request"
        loading={cancelling}
      />
    </div>
  );
};

export default RequestDetails;
