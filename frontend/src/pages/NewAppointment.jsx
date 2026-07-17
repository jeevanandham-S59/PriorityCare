import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SEVERITY_LABELS = {
  1: "Minimal", 2: "Mild", 3: "Mild-Moderate", 4: "Moderate",
  5: "Moderate", 6: "Moderate-Severe", 7: "Severe",
  8: "Severe", 9: "Very Severe", 10: "Critical/Emergency"
};

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8 AM – 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM – 4 PM)' },
  { value: 'evening', label: 'Evening (4 PM – 8 PM)' },
];

const NewAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [durationDays, setDurationDays] = useState(0);
  const [severity, setSeverity] = useState(5);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('morning');

  // Result modal state
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const resp = await axios.get('/api/departments');
        setDepartments(resp.data);
        if (resp.data.length > 0) setDepartmentId(resp.data[0].id);
      } catch (err) {
        setError('Failed to load departments.');
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  // Compute min date (today)
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!acknowledged) {
      setError('You must acknowledge the emergency disclaimer before proceeding.');
      return;
    }
    if (symptoms.length < 10) {
      setError('Please provide a detailed symptom description (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await axios.post('/api/appointments/request', {
        department_id: departmentId,
        symptoms,
        symptom_duration_days: parseInt(durationDays),
        severity: parseInt(severity),
        preferred_date: preferredDate,
        preferred_time_slot: preferredSlot,
      });
      setResult(resp.data);
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        setError(Array.isArray(detail) ? detail[0].msg : detail);
      } else {
        setError('Failed to submit appointment request.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityClass = (level) => {
    switch (level) {
      case 'Critical': return 'badge-critical';
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'badge-low';
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading form...</p>
      </div>
    );
  }

  // Show success result
  if (result) {
    return (
      <div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '2rem' }}>Request Submitted</h1>
        <div className="card" style={{ maxWidth: '640px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>✅</span>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', marginTop: '1rem' }}>Triage Assessment Complete</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Your request has been queued for review.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit, sans-serif', fontWeight: '700' }}>
                {result.priority_score}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '0.25rem' }}>
                <span className={`badge ${getPriorityClass(result.priority_level)}`}
                  style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>
                  {result.priority_level}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Level</div>
            </div>
          </div>

          {result.priority_explanation && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.9rem', border: '1px solid var(--border-color)', lineHeight: 1.5 }}>
              <strong>Triage explanation:</strong> {result.priority_explanation}
            </div>
          )}

          {result.score_breakdown && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Score Breakdown (Transparent)
              </h4>
              <div className="meta-info-list">
                <div className="meta-info-item">
                  <span className="meta-label">Severity Points</span>
                  <span className="meta-value">+{result.score_breakdown.severity_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Duration Points</span>
                  <span className="meta-value">+{result.score_breakdown.duration_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Age Points (Age: {result.score_breakdown.patient_age})</span>
                  <span className="meta-value">+{result.score_breakdown.age_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Chronic Conditions Points</span>
                  <span className="meta-value">+{result.score_breakdown.chronic_condition_points}</span>
                </div>
                <div className="meta-info-item">
                  <span className="meta-label">Pregnancy Points</span>
                  <span className="meta-value">+{result.score_breakdown.pregnancy_points}</span>
                </div>
                {result.score_breakdown.urgent_keyword_points !== undefined && (
                  <div className="meta-info-item">
                    <span className="meta-label">Urgent Keyword Points</span>
                    <span className="meta-value">+{result.score_breakdown.urgent_keyword_points}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.5 }}>
            ⚠️ <strong>Triage Disclaimer:</strong> Priority categories support appointment scheduling only and do not constitute a medical diagnosis. All triage decisions must be reviewed and approved by certified healthcare staff.
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              onClick={() => navigate('/my-requests')}>View My Requests</button>
            <button className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem' }}>New Appointment Request</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Describe your symptoms and the system will calculate your triage priority.
      </p>

      {/* Emergency Disclaimer */}
      <div className="emergency-box" style={{ marginBottom: '2rem' }}>
        <h3 className="emergency-title">⚠️ Medical Disclaimer</h3>
        <p className="emergency-desc">
          If this is a medical emergency, contact local emergency services immediately.
          This system does not provide diagnosis or emergency care.
        </p>
        <label className="form-check" style={{ marginTop: '1rem' }}>
          <input type="checkbox" className="form-check-input"
            checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
          <span className="form-check-label" style={{ color: '#fca5a5', fontWeight: 600 }}>
            I understand this is not an emergency service. I confirm this is not a life-threatening situation.
          </span>
        </label>
      </div>

      <div className="card" style={{ maxWidth: '700px' }}>
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={departmentId}
              onChange={e => setDepartmentId(e.target.value)} required disabled={submitting}>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} — {d.description}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Describe Your Symptoms</label>
            <textarea className="form-control" rows={4}
              placeholder="Describe what you're experiencing in detail (min 10 characters)..."
              value={symptoms} onChange={e => setSymptoms(e.target.value)}
              required disabled={submitting} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Symptom Duration (Days)</label>
              <input type="number" className="form-control" min={0} max={365}
                value={durationDays} onChange={e => setDurationDays(e.target.value)}
                required disabled={submitting} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                0 = just started today
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Severity (1-10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="range" min={1} max={10} value={severity}
                  onChange={e => setSeverity(e.target.value)} disabled={submitting}
                  style={{ flex: 1, accentColor: severity >= 7 ? 'var(--priority-critical)' : severity >= 4 ? 'var(--priority-medium)' : 'var(--primary)' }} />
                <span className={`badge ${severity >= 7 ? 'badge-critical' : severity >= 4 ? 'badge-medium' : 'badge-low'}`}
                  style={{ minWidth: '3rem', textAlign: 'center' }}>
                  {severity}
                </span>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {SEVERITY_LABELS[severity]}
              </small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Preferred Date</label>
              <input type="date" className="form-control" min={today}
                value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Time Slot</label>
              <select className="form-control" value={preferredSlot}
                onChange={e => setPreferredSlot(e.target.value)} required disabled={submitting}>
                {TIME_SLOTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting || !acknowledged}>
            {submitting ? 'Calculating Priority & Submitting...' : 'Submit Triage Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewAppointment;
