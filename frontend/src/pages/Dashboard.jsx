import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DoctorDashboard from './DoctorDashboard';
import AdminDashboard from './AdminDashboard';

const PRIORITY_STYLES = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

const STATUS_STYLES = {
  pending: { bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', label: 'Pending' },
  assigned: { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', label: 'Assigned' },
  confirmed: { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', label: 'Confirmed' },
  completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: 'Completed' },
  cancelled: { bg: 'rgba(156, 163, 175, 0.12)', color: '#9ca3af', label: 'Cancelled' },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [recentRequests, setRecentRequests] = useState([]);
  const [hasProfile, setHasProfile] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      setLoadingData(false);
      return;
    }
    const fetchPatientData = async () => {
      try {
        // Check profile
        try {
          await axios.get('/api/patient/profile');
          setHasProfile(true);
        } catch (err) {
          setHasProfile(false);
        }
        // Fetch recent requests
        const resp = await axios.get('/api/appointments/my');
        setRecentRequests(resp.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchPatientData();
  }, [user]);

  if (!user) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderRoleDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'patient':
      default:
        return (
          <div>
            {/* Profile completion prompt */}
            {hasProfile === false && (
              <div className="emergency-box" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)', marginBottom: '1.5rem' }}>
                <h3 className="emergency-title" style={{ color: '#60a5fa' }}>📋 Complete Your Profile</h3>
                <p className="emergency-desc">
                  You must complete your medical profile before you can book appointments. Your profile data is used for triage scoring.
                </p>
                <Link to="/profile" className="btn btn-primary" style={{ marginTop: '1rem' }}>Complete Profile</Link>
              </div>
            )}

            <div className="dashboard-grid">
              {/* Quick actions */}
              <div className="card">
                <div className="panel-header">
                  <h2 className="panel-title">Patient Portal</h2>
                  <span className="badge badge-low">Verified Patient</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <Link to="/appointments/new" className="card action-card" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏥</span>
                    <h4 style={{ marginTop: '0.75rem' }}>Book Appointment</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Submit a new triage request</p>
                  </Link>
                  <Link to="/profile" className="card action-card" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '1.5rem' }}>👤</span>
                    <h4 style={{ marginTop: '0.75rem' }}>Medical Profile</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>View & edit your health data</p>
                  </Link>
                </div>

                {/* Recent requests */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1rem' }}>Recent Requests</h3>
                  {recentRequests.length > 0 && (
                    <Link to="/my-requests" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                      View All →
                    </Link>
                  )}
                </div>

                {loadingData ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</p>
                ) : recentRequests.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No appointment requests yet. Click "Book Appointment" to get started.
                  </p>
                ) : (
                  <div className="request-list" style={{ gap: '0.75rem' }}>
                    {recentRequests.map(req => {
                      const statusStyle = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
                      const priorityClass = PRIORITY_STYLES[req.priority_level] || 'badge-low';
                      return (
                        <Link key={req.id} to={`/appointments/${req.id}`}
                          className="card request-card" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{req.department_name}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <span className={`badge ${priorityClass}`}>{req.priority_level}</span>
                                <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <div>Score: {req.priority_score}</div>
                              <div>{formatDate(req.preferred_date)}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Side panel */}
              <div className="card" style={{ alignSelf: 'flex-start' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', marginBottom: '1rem' }}>Account Info</h3>
                <div className="meta-info-list">
                  <div className="meta-info-item">
                    <span className="meta-label">Name</span>
                    <span className="meta-value">{user.full_name}</span>
                  </div>
                  <div className="meta-info-item">
                    <span className="meta-label">Email</span>
                    <span className="meta-value">{user.email}</span>
                  </div>
                  <div className="meta-info-item">
                    <span className="meta-label">Phone</span>
                    <span className="meta-value">{user.phone}</span>
                  </div>
                  <div className="meta-info-item">
                    <span className="meta-label">Profile</span>
                    <span className="meta-value" style={{ color: hasProfile ? 'var(--primary)' : 'var(--priority-critical)' }}>
                      {hasProfile ? '✓ Complete' : '✗ Incomplete'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Logged in as {user.email}</p>
        </div>
        <button onClick={logout} className="btn btn-danger">
          Log Out
        </button>
      </div>
      {renderRoleDashboard()}
    </div>
  );
};

export default Dashboard;
