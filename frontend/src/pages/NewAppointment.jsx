import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Input, Button, Badge, AlertBanner, Spinner } from '../components/ui';

const SEVERITY_LABELS = {
  1: "Minimal", 2: "Mild", 3: "Mild-Moderate", 4: "Moderate",
  5: "Moderate", 6: "Moderate-Severe", 7: "Severe",
  8: "Severe", 9: "Very Severe", 10: "Critical/Emergency"
};

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8 AM - 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
  { value: 'evening', label: 'Evening (4 PM - 8 PM)' },
];

const SCORE_BREAKDOWN_KEYS = [
  { key: 'severity_points', label: 'Severity Points' },
  { key: 'duration_points', label: 'Duration Points' },
  { key: 'patient_age', label: 'Age Points' },
  { key: 'chronic_condition_points', label: 'Chronic Conditions Points' },
  { key: 'pregnancy_points', label: 'Pregnancy Points' },
  { key: 'urgent_keyword_points', label: 'Urgent Keyword Points' },
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
        department_id: departmentId, symptoms,
        symptom_duration_days: parseInt(durationDays),
        severity: parseInt(severity),
        preferred_date: preferredDate, preferred_time_slot: preferredSlot,
      });
      setResult(resp.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0].msg : detail || 'Failed to submit appointment request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner text="Loading form..." />;

  if (result) {
    return (
      <div>
        <PageHeader title="Request Submitted" />
        <Card style={{ maxWidth: '640px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem' }}>{'\u2705'}</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", marginTop: '1rem' }}>Triage Assessment Complete</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Your request has been queued for review.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--primary)' }}>
                {result.priority_score}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Badge variant={result.priority_level} style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>
                {result.priority_level}
              </Badge>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginTop: '0.25rem' }}>Level</div>
            </div>
          </div>

          {result.priority_explanation && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0.85rem', background: 'rgba(0,0,0,0.01)', borderRadius: '6px', fontSize: '0.9rem', border: '1px solid var(--border-color)', lineHeight: 1.5 }}>
              <strong>Triage explanation:</strong> {result.priority_explanation}
            </div>
          )}

          {result.score_breakdown && (
            <Card style={{ background: '#f8fafc', marginBottom: '1.5rem', padding: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Score Breakdown
              </h4>
              <div className="meta-info-list">
                {SCORE_BREAKDOWN_KEYS.filter(k => result.score_breakdown[k.key] !== undefined).map(k => (
                  <div key={k.key} className="meta-info-item">
                    <span className="meta-label">{k.label}{k.key === 'patient_age' ? ` (Age: ${result.score_breakdown.patient_age})` : ''}</span>
                    <span className="meta-value">+{result.score_breakdown[k.key]}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <AlertBanner variant="warning">
            <strong>Triage Disclaimer:</strong> Priority categories support appointment scheduling only and do not constitute a medical diagnosis.
          </AlertBanner>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <Button onClick={() => navigate('/my-requests')} fullWidth>View My Requests</Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')} fullWidth>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Appointment Request"
        subtitle="Describe your symptoms and the system will calculate your triage priority."
      />

      <div className="emergency-box" style={{ marginBottom: '2rem', maxWidth: '700px' }}>
        <h3 className="emergency-title">{'\u26A0\uFE0F'} Medical Disclaimer</h3>
        <p className="emergency-desc">
          If this is a medical emergency, contact local emergency services immediately.
          This system does not provide diagnosis or emergency care.
        </p>
        <label className="form-check" style={{ marginTop: '1rem' }}>
          <input type="checkbox" className="form-check-input"
            checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
          <span className="form-check-label" style={{ color: '#b91c1c', fontWeight: 600 }}>
            I understand this is not an emergency service. I confirm this is not a life-threatening situation.
          </span>
        </label>
      </div>

      <Card style={{ maxWidth: '700px' }}>
        {error && <AlertBanner variant="error">{error}</AlertBanner>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="dept">Department</label>
            <select id="dept" className="form-control" value={departmentId}
              onChange={e => setDepartmentId(e.target.value)} required disabled={submitting}>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} - {d.description}</option>
              ))}
            </select>
          </div>

          <Input label="Describe Your Symptoms" type="textarea" rows={4}
            placeholder="Describe what you're experiencing in detail (min 10 characters)..."
            value={symptoms} onChange={e => setSymptoms(e.target.value)}
            required disabled={submitting} style={{ resize: 'vertical' }}
            helperText={symptoms.length < 10 && symptoms.length > 0 ? `${symptoms.length}/10 characters` : undefined} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Symptom Duration (Days)" type="number" min={0} max={365}
              value={durationDays} onChange={e => setDurationDays(e.target.value)}
              required disabled={submitting}
              helperText="0 = just started today" />

            <div className="form-group">
              <label className="form-label" htmlFor="severity">Severity (1-10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="range" id="severity" min={1} max={10} value={severity}
                  onChange={e => setSeverity(e.target.value)} disabled={submitting}
                  style={{ flex: 1, accentColor: severity >= 7 ? 'var(--priority-critical)' : severity >= 4 ? 'var(--priority-medium)' : 'var(--primary)' }} />
                <Badge variant={severity >= 7 ? 'Critical' : severity >= 4 ? 'Medium' : 'Low'}
                  style={{ minWidth: '2.5rem', textAlign: 'center', justifyContent: 'center' }}>
                  {severity}
                </Badge>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                {SEVERITY_LABELS[severity]}
              </small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Preferred Date" type="date" min={today}
              value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
              required disabled={submitting} />
            <div className="form-group">
              <label className="form-label" htmlFor="slot">Preferred Time Slot</label>
              <select id="slot" className="form-control" value={preferredSlot}
                onChange={e => setPreferredSlot(e.target.value)} required disabled={submitting}>
                {TIME_SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <Button type="submit" fullWidth loading={submitting} disabled={submitting || !acknowledged}
            style={{ marginTop: '1rem' }}>
            Submit Triage Request
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default NewAppointment;
