import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AdminRules = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Thresholds state
  const [criticalThreshold, setCriticalThreshold] = useState(70);
  const [highThreshold, setHighThreshold] = useState(50);
  const [mediumThreshold, setMediumThreshold] = useState(30);

  // Weights state
  const [severityMultiplier, setSeverityMultiplier] = useState(4.0);
  const [acuteDays, setAcuteDays] = useState(1);
  const [acutePoints, setAcutePoints] = useState(15);
  const [subAcuteDays, setSubAcuteDays] = useState(7);
  const [subAcutePoints, setSubAcutePoints] = useState(10);
  const [chronicPoints, setChronicPoints] = useState(5);
  const [agePoints, setAgePoints] = useState(10);
  const [chronicConditionPoints, setChronicConditionPoints] = useState(10);
  const [pregnancyPoints, setPregnancyPoints] = useState(10);
  const [urgentKeywordsPoints, setUrgentKeywordsPoints] = useState(15);

  // Keywords state
  const [keywordsInput, setKeywordsInput] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchRules = async () => {
      try {
        const resp = await axios.get('/api/rules');
        const rules = resp.data;
        
        // Thresholds
        setCriticalThreshold(rules.thresholds.critical);
        setHighThreshold(rules.thresholds.high);
        setMediumThreshold(rules.thresholds.medium);

        // Weights
        setSeverityMultiplier(rules.weights.severity_multiplier);
        setAcuteDays(rules.weights.duration.acute_days);
        setAcutePoints(rules.weights.duration.acute_points);
        setSubAcuteDays(rules.weights.duration.sub_acute_days);
        setSubAcutePoints(rules.weights.duration.sub_acute_points);
        setChronicPoints(rules.weights.duration.chronic_points);
        setAgePoints(rules.weights.age_65_or_above);
        setChronicConditionPoints(rules.weights.chronic_condition_present);
        setPregnancyPoints(rules.weights.pregnancy);
        setUrgentKeywordsPoints(rules.weights.urgent_keywords);

        // Keywords
        setKeywordsInput(rules.urgent_keywords.join(', '));
      } catch (err) {
        setError('Failed to fetch active priority rules.');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const payload = {
      thresholds: {
        critical: parseInt(criticalThreshold),
        high: parseInt(highThreshold),
        medium: parseInt(mediumThreshold)
      },
      weights: {
        severity_multiplier: parseFloat(severityMultiplier),
        duration: {
          acute_days: parseInt(acuteDays),
          acute_points: parseInt(acutePoints),
          sub_acute_days: parseInt(subAcuteDays),
          sub_acute_points: parseInt(subAcutePoints),
          chronic_points: parseInt(chronicPoints)
        },
        age_65_or_above: parseInt(agePoints),
        chronic_condition_present: parseInt(chronicConditionPoints),
        pregnancy: parseInt(pregnancyPoints),
        urgent_keywords: parseInt(urgentKeywordsPoints)
      },
      urgent_keywords: keywordsInput.split(',').map(kw => kw.trim()).filter(Boolean)
    };

    try {
      await axios.put('/api/rules', payload);
      setSuccess('Priority scoring rules updated successfully! Future appointment requests will use these weights.');
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        setError(Array.isArray(detail) ? detail[0].msg : detail);
      } else {
        setError('Failed to save priority rules.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading priority configurations...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>Manage Triage Rules</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure thresholds, factor weights, and urgent keywords dynamically.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && (
        <div className="form-error" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', color: '#d1fae5' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="dashboard-grid">
          {/* Left panel: Weights & Keywords */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem' }}>Core Weights & Multipliers</h3>
              
              <div className="form-group">
                <label className="form-label">Symptom Severity Multiplier</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="range" min="0" max="10" step="0.5" className="form-control" style={{ flex: 1, padding: 0 }}
                    value={severityMultiplier} onChange={e => setSeverityMultiplier(e.target.value)} disabled={submitting} />
                  <span className="badge badge-medium" style={{ minWidth: '4rem', textAlign: 'center' }}>
                    {severityMultiplier}x (max {Math.round(10 * severityMultiplier)} pts)
                  </span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>Multiplies reported severity scale (1-10). Default is 4.0x (max 40 pts).</small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Age 65+ Score Bonus</label>
                  <input type="number" className="form-control" min="0" max="100"
                    value={agePoints} onChange={e => setAgePoints(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Chronic Conditions Bonus</label>
                  <input type="number" className="form-control" min="0" max="100"
                    value={chronicConditionPoints} onChange={e => setChronicConditionPoints(e.target.value)} disabled={submitting} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Pregnancy Status Bonus</label>
                  <input type="number" className="form-control" min="0" max="100"
                    value={pregnancyPoints} onChange={e => setPregnancyPoints(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Urgent Keyword Match Bonus</label>
                  <input type="number" className="form-control" min="0" max="100"
                    value={urgentKeywordsPoints} onChange={e => setUrgentKeywordsPoints(e.target.value)} disabled={submitting} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem' }}>Duration Score Rules</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Acute Max Days</label>
                  <input type="number" className="form-control" min="0"
                    value={acuteDays} onChange={e => setAcuteDays(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Acute Score Points</label>
                  <input type="number" className="form-control" min="0" max="100"
                    value={acutePoints} onChange={e => setAcutePoints(e.target.value)} disabled={submitting} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Sub-Acute Max Days</label>
                  <input type="number" className="form-control" min="0"
                    value={subAcuteDays} onChange={e => setSubAcuteDays(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sub-Acute Score Points</label>
                  <input type="number" className="form-control" min="0" max="100"
                    value={subAcutePoints} onChange={e => setSubAcutePoints(e.target.value)} disabled={submitting} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Chronic Score Points (any duration beyond Sub-Acute)</label>
                <input type="number" className="form-control" min="0" max="100"
                  value={chronicPoints} onChange={e => setChronicPoints(e.target.value)} disabled={submitting} />
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>Urgent Symptom Keywords</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                If a patient's symptoms text contains any of these comma-separated keywords (case-insensitive substring matching), the urgent keyword match bonus is added to their triage score.
              </p>
              <div className="form-group">
                <label className="form-label">Keywords List (comma separated)</label>
                <textarea className="form-control" rows="4"
                  value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} disabled={submitting}
                  placeholder="e.g. chest pain, breathing, bleeding, unconscious" />
              </div>
            </div>
          </div>

          {/* Right panel: Threshold settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem' }}>Category Score Thresholds</h3>
              
              <div className="form-group">
                <label className="form-label">Critical Tier (Min Score)</label>
                <input type="number" className="form-control" min="0" max="100"
                  value={criticalThreshold} onChange={e => setCriticalThreshold(e.target.value)} disabled={submitting} />
                <span className="badge badge-critical" style={{ marginTop: '0.5rem' }}>Critical: {criticalThreshold} – 100</span>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">High Tier (Min Score)</label>
                <input type="number" className="form-control" min="0" max="100"
                  value={highThreshold} onChange={e => setHighThreshold(e.target.value)} disabled={submitting} />
                <span className="badge badge-high" style={{ marginTop: '0.5rem' }}>High: {highThreshold} – {criticalThreshold - 1}</span>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Medium Tier (Min Score)</label>
                <input type="number" className="form-control" min="0" max="100"
                  value={mediumThreshold} onChange={e => setMediumThreshold(e.target.value)} disabled={submitting} />
                <span className="badge badge-medium" style={{ marginTop: '0.5rem' }}>Medium: {mediumThreshold} – {highThreshold - 1}</span>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span>Low Tier Range:</span>
                  <span className="badge badge-low">Low: 0 – {mediumThreshold - 1}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.02)', borderColor: 'var(--primary-light)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>💡 System Triage Advice</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                These scoring weights directly modify the online appointment sorting algorithm. Please ensure thresholds map properly in ascending order: <code>Medium &lt; High &lt; Critical</code>.
              </p>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={submitting}>
                {submitting ? 'Saving configurations...' : 'Save Triage Rules'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminRules;
