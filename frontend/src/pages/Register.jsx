import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, login } = useAuth();
  const navigate = useNavigate();

  const validateLocalPassword = (pwd) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(pwd)) return "Password must contain at least one digit.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Pre-validate password strength on client-side
    const pwdErr = validateLocalPassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    setSubmitting(true);
    try {
      await register(fullName, email, phone, password);
      setSuccess('Account created successfully! Logging in...');
      
      // Auto login on success
      setTimeout(async () => {
        try {
          await login(email, password);
          navigate('/dashboard');
        } catch (err) {
          navigate('/login');
        }
      }, 1500);

    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        // If Pydantic error array format
        if (Array.isArray(err.response.data.detail)) {
          setError(err.response.data.detail[0].msg);
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError('Registration failed. Please review inputs and try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="card auth-card">
      <h2 className="card-title">Patient Portal</h2>
      <p className="card-subtitle">Create your personal account to submit triage requests</p>
      
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-error" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', color: '#d1fae5' }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-control"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number (E.164 format)</label>
          <input
            type="tel"
            className="form-control"
            placeholder="+1234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
          />
          <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
            Requires 8+ chars, upper, lower, number, and special character.
          </small>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={submitting}
        >
          {submitting ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already registered? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
      </p>
    </div>
  );
};

export default Register;
