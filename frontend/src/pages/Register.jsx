import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useAuth } from "../context/AuthContext";
import { Card, Input, Button, AlertBanner } from "../components/ui";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register, login } = useAuth();
  const navigate = useNavigate();

  const getPasswordErrors = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push("at least 8 characters");
    if (!/[a-z]/.test(pwd)) errors.push("one lowercase letter");
    if (!/\d/.test(pwd)) errors.push("one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push("one special character");
    return errors;
  };

  const passwordErrors = getPasswordErrors(password);
  const passwordStrength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : passwordErrors.length <= 1 ? 3
    : passwordErrors.length <= 2 ? 2
    : 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordErrors.length > 0) {
      setError("Password must contain " + passwordErrors.join(", ") + ".");
      return;
    }

    setSubmitting(true);

    try {
      await register(fullName, email, "+" + phone, password);
      setSuccess("Account created successfully!");
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(Array.isArray(err.response.data.detail) ? err.response.data.detail[0].msg : err.response.data.detail);
      } else {
        setError("Registration failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="auth-card">
      <h2 className="card-title">Patient Portal</h2>
      <p className="card-subtitle">Create your account to continue</p>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={submitting}
        />

        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
        />

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <PhoneInput
            country={"in"}
            value={phone}
            onChange={setPhone}
            enableSearch={true}
            countryCodeEditable={false}
            inputStyle={{
              width: "100%",
              height: "45px",
              fontSize: "0.95rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
            }}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            className={`form-control ${password.length > 0 && passwordErrors.length > 0 ? 'form-control--error' : ''} ${passwordStrength >= 3 ? 'form-control--success' : ''}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
            aria-describedby="password-constraints"
          />
          {password.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem' }}>
              {[1, 2, 3].map(level => (
                <div
                  key={level}
                  style={{
                    flex: 1, height: '4px', borderRadius: '2px',
                    background: level <= passwordStrength
                      ? (passwordStrength >= 3 ? '#22c55e' : passwordStrength >= 2 ? '#d97706' : '#dc2626')
                      : '#e2e8f0',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          )}
          <small id="password-constraints" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
            Must contain uppercase, lowercase, number, and special character.
          </small>
        </div>

        <Button type="submit" fullWidth loading={submitting} disabled={submitting} style={{ marginTop: '0.5rem' }}>
          Register
        </Button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: "center", fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
          Login
        </Link>
      </p>
    </Card>
  );
};

export default Register;
