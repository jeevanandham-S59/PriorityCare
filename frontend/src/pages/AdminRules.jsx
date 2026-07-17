import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Input, Button, Badge, AlertBanner, Spinner } from '../components/ui';

const AdminRules = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [criticalThreshold, setCriticalThreshold] = useState(70);
  const [highThreshold, setHighThreshold] = useState(50);
  const [mediumThreshold, setMediumThreshold] = useState(30);

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

  const [keywordsInput, setKeywordsInput] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    const fetchRules = async () => {
      try {
        const resp = await axios.get('/api/rules');
        const r = resp.data;
        setCriticalThreshold(r.thresholds.critical);
        setHighThreshold(r.thresholds.high);
        setMediumThreshold(r.thresholds.medium);
        setSeverityMultiplier(r.weights.severity_multiplier);
        setAcuteDays(r.weights.duration.acute_days);
        setAcutePoints(r.weights.duration.acute_points);
        setSubAcuteDays(r.weights.duration.sub_acute_days);
        setSubAcutePoints(r.weights.duration.sub_acute_points);
        setChronicPoints(r.weights.duration.chronic_points);
        setAgePoints(r.weights.age_65_or_above);
        setChronicConditionPoints(r.weights.chronic_condition_present);
        setPregnancyPoints(r.weights.pregnancy);
        setUrgentKeywordsPoints(r.weights.urgent_keywords);
        setKeywordsInput(r.urgent_keywords.join(', '));
      } catch (err) { setError('Failed to fetch active priority rules.'); }
      finally { setLoading(false); }
    };
    fetchRules();
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await axios.put('/api/rules', {
        thresholds: { critical: parseInt(criticalThreshold), high: parseInt(highThreshold), medium: parseInt(mediumThreshold) },
        weights: {
          severity_multiplier: parseFloat(severityMultiplier),
          duration: { acute_days: parseInt(acuteDays), acute_points: parseInt(acutePoints), sub_acute_days: parseInt(subAcuteDays), sub_acute_points: parseInt(subAcutePoints), chronic_points: parseInt(chronicPoints) },
          age_65_or_above: parseInt(agePoints),
          chronic_condition_present: parseInt(chronicConditionPoints),
          pregnancy: parseInt(pregnancyPoints),
          urgent_keywords: parseInt(urgentKeywordsPoints),
        },
        urgent_keywords: keywordsInput.split(',').map(kw => kw.trim()).filter(Boolean),
      });
      setSuccess('Priority scoring rules updated successfully!');
      window.scrollTo(0, 0);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0].msg : detail || 'Failed to save priority rules.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Spinner text="Loading priority configurations..." />;

  return (
    <div>
      <PageHeader
        title="Manage Triage Rules"
        subtitle="Configure thresholds, factor weights, and urgent keywords dynamically."
        actions={<Button variant="secondary" onClick={() => navigate('/dashboard')}>{'\u2190'} Dashboard</Button>}
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}

      <form onSubmit={handleSubmit}>
        <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem' }}>Core Weights & Multipliers</h3>
              <div className="form-group">
                <label className="form-label">Symptom Severity Multiplier</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="range" min="0" max="10" step="0.5" className="form-control" style={{ flex: 1, padding: 0 }}
                    value={severityMultiplier} onChange={e => setSeverityMultiplier(e.target.value)} disabled={submitting} />
                  <Badge variant="Medium" style={{ minWidth: '4rem', textAlign: 'center' }}>
                    {severityMultiplier}x
                  </Badge>
                </div>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Multiplies reported severity (1-10). Default 4.0x (max {Math.round(10 * severityMultiplier)} pts).
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <Input label="Age 65+ Score Bonus" type="number" min="0" max="100" value={agePoints} onChange={e => setAgePoints(e.target.value)} disabled={submitting} />
                <Input label="Chronic Conditions Bonus" type="number" min="0" max="100" value={chronicConditionPoints} onChange={e => setChronicConditionPoints(e.target.value)} disabled={submitting} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <Input label="Pregnancy Status Bonus" type="number" min="0" max="100" value={pregnancyPoints} onChange={e => setPregnancyPoints(e.target.value)} disabled={submitting} />
                <Input label="Urgent Keyword Bonus" type="number" min="0" max="100" value={urgentKeywordsPoints} onChange={e => setUrgentKeywordsPoints(e.target.value)} disabled={submitting} />
              </div>
            </Card>

            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem' }}>Duration Score Rules</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Acute Max Days" type="number" min="0" value={acuteDays} onChange={e => setAcuteDays(e.target.value)} disabled={submitting} />
                <Input label="Acute Score Points" type="number" min="0" max="100" value={acutePoints} onChange={e => setAcutePoints(e.target.value)} disabled={submitting} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <Input label="Sub-Acute Max Days" type="number" min="0" value={subAcuteDays} onChange={e => setSubAcuteDays(e.target.value)} disabled={submitting} />
                <Input label="Sub-Acute Score Points" type="number" min="0" max="100" value={subAcutePoints} onChange={e => setSubAcutePoints(e.target.value)} disabled={submitting} />
              </div>
              <Input label="Chronic Score Points" type="number" min="0" max="100" value={chronicPoints} onChange={e => setChronicPoints(e.target.value)} disabled={submitting} helperText="Any duration beyond sub-acute threshold" />
            </Card>

            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1rem' }}>Urgent Symptom Keywords</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                If symptoms contain any keyword (case-insensitive substring match), the urgent keyword bonus is added to the triage score.
              </p>
              <Input type="textarea" rows={4} placeholder="e.g. chest pain, breathing, bleeding, unconscious"
                value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} disabled={submitting}
                label="Keywords (comma separated)" />
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem' }}>Score Thresholds</h3>
              <Input label="Critical Tier (Min Score)" type="number" min="0" max="100" value={criticalThreshold} onChange={e => setCriticalThreshold(e.target.value)} disabled={submitting} />
              <div style={{ marginTop: '0.5rem' }}><Badge variant="Critical">Critical: {criticalThreshold} - 100</Badge></div>

              <Input label="High Tier (Min Score)" type="number" min="0" max="100" value={highThreshold} onChange={e => setHighThreshold(e.target.value)} disabled={submitting} style={{ marginTop: '1rem' }} />
              <div style={{ marginTop: '0.5rem' }}><Badge variant="High">High: {highThreshold} - {criticalThreshold - 1}</Badge></div>

              <Input label="Medium Tier (Min Score)" type="number" min="0" max="100" value={mediumThreshold} onChange={e => setMediumThreshold(e.target.value)} disabled={submitting} style={{ marginTop: '1rem' }} />
              <div style={{ marginTop: '0.5rem' }}><Badge variant="Medium">Medium: {mediumThreshold} - {highThreshold - 1}</Badge></div>

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Low Tier:</span>
                  <Badge variant="Low">Low: 0 - {mediumThreshold - 1}</Badge>
                </div>
              </div>
            </Card>

            <Card accent="primary" style={{ background: 'rgba(16, 185, 129, 0.02)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                {'\uD83D\uDCA1'} System Advice
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                These scoring weights directly modify the online appointment sorting algorithm. Ensure thresholds are in ascending order: <code>Medium &lt; High &lt; Critical</code>.
              </p>
              <Button type="submit" fullWidth loading={submitting} disabled={submitting} style={{ marginTop: '1.5rem' }}>
                Save Triage Rules
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminRules;
