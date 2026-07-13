import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const renderRoleDashboard = () => {
    switch (user.role) {
      case 'admin':
        return (
          <div className="card">
            <div className="panel-header">
              <h2 className="panel-title">Administrator Console</h2>
              <span className="badge badge-critical">System Admin</span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Welcome back, <strong>{user.full_name}</strong>. Here you can configure priority metrics, manage doctor profiles, and observe triage stats.
            </p>
            <div className="meta-info-list" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px' }}>
              <div className="meta-info-item">
                <span className="meta-label">System Role:</span>
                <span className="meta-value">Super Administrator</span>
              </div>
              <div className="meta-info-item">
                <span className="meta-label">Admin Email:</span>
                <span className="meta-value">{user.email}</span>
              </div>
              <div className="meta-info-item">
                <span className="meta-label">User ID:</span>
                <span className="meta-value">{user.id}</span>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <h4>Priority Weight Matrix</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Modify severity scale settings (Locked in MVP)</p>
              </div>
              <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <h4>Staff Profiles</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Add or delete department doctors (Locked in MVP)</p>
              </div>
            </div>
          </div>
        );
      case 'doctor':
        return (
          <div className="card">
            <div className="panel-header">
              <h2 className="panel-title">Doctor Treatment Queue</h2>
              <span className="badge badge-high">Medical Doctor</span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Welcome back, <strong>{user.full_name}</strong>. Below is the clinical queue sorted by priority.
            </p>
            <div className="meta-info-list" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px' }}>
              <div className="meta-info-item">
                <span className="meta-label">Attending Doctor:</span>
                <span className="meta-value">{user.full_name}</span>
              </div>
              <div className="meta-info-item">
                <span className="meta-label">Clinic Contact:</span>
                <span className="meta-value">{user.phone}</span>
              </div>
            </div>
            
            <div className="card" style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: '2rem' }}>📋</span>
              <h4 style={{ marginTop: '1rem' }}>Clinical Queue is Empty</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                No pending triage requests exist for your assigned department.
              </p>
            </div>
          </div>
        );
      case 'patient':
      default:
        return (
          <div className="card">
            <div className="panel-header">
              <h2 className="panel-title">Patient Portal Dashboard</h2>
              <span className="badge badge-low">Verified Patient</span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Welcome, <strong>{user.full_name}</strong>. From here you can request clinic bookings and view your urgency score.
            </p>
            
            <div className="dashboard-grid">
              <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ marginBottom: '1rem' }}>Submit New Appointment Request</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Provide symptom details and duration. The system will compute your priority.
                </p>
                <button className="btn btn-primary" disabled style={{ opacity: 0.5 }}>
                  Book Appointment (Triage Form Locked in MVP)
                </button>
              </div>

              <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ marginBottom: '1rem' }}>My Requests</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  You have no pending appointment triage requests.
                </p>
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
        <button onClick={logout} className="btn btn-secondary btn-danger">
          Log Out
        </button>
      </div>
      {renderRoleDashboard()}
    </div>
  );
};

export default Dashboard;
