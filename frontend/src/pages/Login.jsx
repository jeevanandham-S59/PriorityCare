import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Input, Button, AlertBanner } from '../components/ui';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please verify your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="auth-card">
      <h2 className="card-title">Portal Access</h2>
      <p className="card-subtitle">Sign in to manage appointments and check triage status</p>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={submitting}
          error={error && !email ? 'Email is required' : undefined}
        />

        <Input
          label="Password"
          type="password"
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          disabled={submitting}
        />

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          disabled={submitting}
          style={{ marginTop: '0.5rem' }}
        >
          Sign In
        </Button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        New patient?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Register here
        </Link>
      </p>
    </Card>
  );
};

export default Login;
