import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Button, Badge, StatusBadge, EmptyState, ConfirmDialog, Spinner } from '../components/ui';

const MyRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

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

  const handleCancel = async () => {
    if (!confirmId) return;
    setCancellingId(confirmId);
    setConfirmId(null);
    try {
      await axios.put(`/api/appointments/${confirmId}/cancel`);
      await fetchRequests();
    } catch (err) {
      console.error('Failed to cancel request:', err.response?.data?.detail);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const FILTERS = ['', 'pending', 'assigned', 'completed', 'cancelled'];

  return (
    <div>
      <PageHeader
        title="My Requests"
        subtitle={`${requests.length} request${requests.length !== 1 ? 's' : ''} found`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <Button key={f} variant={filter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter(f)}>
                {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        }
      />

      {loading ? (
        <Spinner text="Loading requests..." />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={'\uD83D\uDCCB'}
          title="No Requests Found"
          description={filter ? `No ${filter} requests.` : "You haven't submitted any appointment requests yet."}
          action={<Link to="/appointments/new"><Button>Book Appointment</Button></Link>}
        />
      ) : (
        <div className="request-list">
          {requests.map(req => (
            <Card key={req.id} className="request-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', margin: 0 }}>
                      {req.department_name || 'Department'}
                    </h3>
                    <Badge variant={req.priority_level || 'Low'}>{req.priority_level || '\u2014'}</Badge>
                    <StatusBadge status={req.status} />
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <span>Severity: <strong>{req.severity}/10</strong></span>
                    <span>Score: <strong>{req.priority_score ?? '\u2014'}</strong>/100</span>
                    <span>Preferred: <strong>{formatDate(req.preferred_date)}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/appointments/${req.id}`}>
                    <Button variant="secondary" size="sm">Details</Button>
                  </Link>
                  {(req.status === 'pending' || req.status === 'assigned') && (
                    <Button variant="danger" size="sm"
                      onClick={() => setConfirmId(req.id)}
                      loading={cancellingId === req.id}
                      disabled={cancellingId === req.id}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Submitted {formatDate(req.created_at)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleCancel}
        title="Cancel Request"
        message="Are you sure you want to cancel this appointment request? This action cannot be undone."
        confirmLabel="Yes, Cancel Request"
      />
    </div>
  );
};

export default MyRequests;
