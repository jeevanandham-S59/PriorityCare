import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Button, Badge, StatusBadge, EmptyState, Spinner } from '../components/ui';
import DoctorDashboard from './DoctorDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user } = useAuth();
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
        try { await axios.get('/api/patient/profile'); setHasProfile(true); }
        catch (err) { setHasProfile(false); }
        const resp = await axios.get('/api/appointments/my');
        setRecentRequests(resp.data);
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
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '\u2014';
    return new Date(dtStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const nextAppointment = recentRequests.find(
    req => (req.status === 'assigned' || req.status === 'confirmed')
  );

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'doctor') return <DoctorDashboard />;

  return (
    <div>
      <PageHeader
        title="Patient Dashboard"
        subtitle={`Account portal: ${user.email}`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <Card
          accent="primary"
          style={{
            background: 'var(--primary-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--primary)', margin: 0 }}>
              Welcome back, {user.full_name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Manage your health profile, submit triage requests, and review clinical appointment statuses.
            </p>
          </div>
          <Link to="/appointments/new"><Button>+ Book Appointment</Button></Link>
        </Card>

        {hasProfile === false && (
          <Card accent="teal" style={{ background: '#fffbeb', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: 'var(--priority-high)', fontFamily: "'Outfit', sans-serif" }}>
                  {'\uD83D\uDCCB'} Setup Your Medical Profile
                </h3>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  You must complete your patient medical profile before you can book appointments.
                  The triage engine uses these health parameters to prioritize your scheduling queue.
                </p>
              </div>
              <Link to="/profile"><Button variant="primary" style={{ background: 'var(--accent)' }}>Complete Profile Now</Button></Link>
            </div>
          </Card>
        )}

        <div className="dashboard-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {nextAppointment && (
              <Card accent="teal" hover style={{ border: '1px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', margin: 0, color: 'var(--accent)' }}>
                    {'\uD83D\uDCC5'} Upcoming Appointment
                  </h3>
                  <StatusBadge status={nextAppointment.status} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date & Time</div>
                    <strong style={{ color: 'var(--primary)' }}>{formatDateTime(nextAppointment.created_at)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</div>
                    <strong>{nextAppointment.department_name}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</div>
                    <Badge variant={nextAppointment.priority_level}>{nextAppointment.priority_level}</Badge>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Please arrive 15 minutes before your scheduled slot.
                  </span>
                  <Link to={`/appointments/${nextAppointment.id}`} style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                    View Details {'\u2192'}
                  </Link>
                </div>
              </Card>
            )}

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', margin: 0 }}>Recent Triage Requests</h3>
                {recentRequests.length > 0 && (
                  <Link to="/my-requests" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                    View All {'\u2192'}
                  </Link>
                )}
              </div>

              {loadingData ? (
                <Spinner text="Loading triage history..." />
              ) : recentRequests.length === 0 ? (
                <EmptyState
                  icon={'\uD83D\uDCCB'}
                  title="No requests yet"
                  description="No triage requests submitted yet."
                  action={<Link to="/appointments/new"><Button variant="secondary">Book Your First Appointment</Button></Link>}
                />
              ) : (
                <div className="request-list">
                  {recentRequests.slice(0, 5).map(req => (
                    <Link key={req.id} to={`/appointments/${req.id}`}
                      className="card request-card" style={{ textDecoration: 'none', color: 'inherit', padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{req.department_name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                            <Badge variant={req.priority_level}>{req.priority_level}</Badge>
                            <StatusBadge status={req.status} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <div>Score: <strong>{req.priority_score}</strong></div>
                          <div>{formatDate(req.preferred_date)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Account Details
              </h3>
              <div className="meta-info-list">
                <div className="meta-info-item">
                  <span className="meta-label">Full Name</span>
                  <span className="meta-value">{user.full_name}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Email</span>
                  <span className="meta-value">{user.email}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Phone</span>
                  <span className="meta-value">{user.phone || '\u2014'}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Medical Profile</span>
                  <span className="meta-value" style={{ color: hasProfile ? 'var(--accent)' : 'var(--priority-critical)' }}>
                    {hasProfile ? '\u2713 Set' : '\u2717 Unconfigured'}
                  </span>
                </div>
              </div>
              <Link to="/profile"><Button variant="secondary" fullWidth style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>Manage Profile</Button></Link>
            </Card>

            <Card hover accent="teal" style={{ background: 'rgba(30, 58, 138, 0.01)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                {'\uD83D\uDCA1'} Quick Actions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/appointments/new"><Button fullWidth size="sm" style={{ justifyContent: 'flex-start' }}>{'\u2795'} New Request</Button></Link>
                <Link to="/my-requests"><Button fullWidth size="sm" variant="secondary" style={{ justifyContent: 'flex-start' }}>{'\uD83D\uDCCB'} My Requests</Button></Link>
                <Link to="/profile"><Button fullWidth size="sm" variant="secondary" style={{ justifyContent: 'flex-start' }}>{'\uD83D\uDC64'} My Profile</Button></Link>
              </div>
            </Card>

            <Card hover accent="primary" style={{ background: 'rgba(30, 58, 138, 0.01)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                {'\uD83D\uDEE1\uFE0F'} Need Assistance?
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                If you have questions about your clinical prioritization, please coordinate with our support team or check our product FAQ guidelines.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
