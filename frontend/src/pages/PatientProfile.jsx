import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CHRONIC_OPTIONS = [
  "Diabetes", "Hypertension", "COPD", "Asthma", "Heart Disease",
  "Kidney Disease", "Liver Disease", "Cancer", "Stroke", "Epilepsy",
  "Thyroid Disorder", "Arthritis", "HIV/AIDS", "Tuberculosis", "Other"
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const PatientProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isNew, setIsNew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [chronicConditions, setChronicConditions] = useState([]);
  const [allergies, setAllergies] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const resp = await axios.get('/api/patient/profile');
        const p = resp.data;
        setIsNew(false);
        setDob(p.date_of_birth ? p.date_of_birth.split('T')[0] : '');
        setGender(p.gender || '');
        setAddress(p.address || '');
        setEmergencyContact(p.emergency_contact || '');
        setBloodGroup(p.blood_group || '');
        setChronicConditions(p.chronic_conditions || []);
        setAllergies((p.allergies || []).join(', '));
        setIsPregnant(p.is_pregnant || false);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setIsNew(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const toggleChronic = (condition) => {
    setChronicConditions(prev =>
      prev.includes(condition)
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const payload = {
      date_of_birth: dob,
      gender,
      address,
      emergency_contact: emergencyContact,
      blood_group: bloodGroup || null,
      chronic_conditions: chronicConditions,
      allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
      is_pregnant: isPregnant,
    };

    try {
      if (isNew) {
        await axios.post('/api/patient/profile', payload);
        setSuccess('Profile created successfully!');
        setIsNew(false);
      } else {
        await axios.put('/api/patient/profile', payload);
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        setError(Array.isArray(detail) ? detail[0].msg : detail);
      } else {
        setError('Failed to save profile.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card auth-card" style={{ maxWidth: '640px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>Medical Profile</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {isNew ? 'Complete your medical profile to enable appointment booking.' : 'Update your personal medical information below.'}
        </p>
      </div>

      <div className="card" style={{ maxWidth: '700px' }}>
        {error && <div className="form-error">{error}</div>}
        {success && (
          <div className="form-error" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', color: '#d1fae5' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-control" value={dob}
                onChange={e => setDob(e.target.value)} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-control" value={gender}
                onChange={e => setGender(e.target.value)} required disabled={submitting}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} placeholder="Full residential address"
              value={address} onChange={e => setAddress(e.target.value)}
              required disabled={submitting} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Emergency Contact</label>
              <input type="text" className="form-control" placeholder="Name & phone"
                value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)}
                required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group (Optional)</label>
              <select className="form-control" value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)} disabled={submitting}>
                <option value="">Unknown</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chronic Conditions</label>
            <div className="checkbox-grid">
              {CHRONIC_OPTIONS.map(condition => (
                <label key={condition} className="form-check" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" className="form-check-input"
                    checked={chronicConditions.includes(condition)}
                    onChange={() => toggleChronic(condition)} disabled={submitting} />
                  <span className="form-check-label">{condition}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Allergies (comma-separated)</label>
            <input type="text" className="form-control" placeholder="e.g., Penicillin, Peanuts"
              value={allergies} onChange={e => setAllergies(e.target.value)} disabled={submitting} />
          </div>

          {(gender === 'female') && (
            <label className="form-check" style={{ marginBottom: '1.5rem' }}>
              <input type="checkbox" className="form-check-input"
                checked={isPregnant} onChange={e => setIsPregnant(e.target.checked)} disabled={submitting} />
              <span className="form-check-label">Currently Pregnant</span>
            </label>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Saving...' : isNew ? 'Create Profile' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientProfile;
