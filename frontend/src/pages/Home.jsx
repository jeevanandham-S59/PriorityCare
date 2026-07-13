import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { token, user } = useAuth();

  return (
    <div className="hero-section">
      <h1 className="hero-title">PriorityCare Scheduling</h1>
      <p className="hero-subtitle">
        A clinical triage appointment platform. Patients are scheduled based on medical urgency, ensuring timely care for critical needs.
      </p>

      {/* Emergency Warning */}
      <div className="emergency-box">
        <h3 className="emergency-title">🚨 Life-Threatening Emergency Warning</h3>
        <p className="emergency-desc">
          If you are experiencing severe chest pain, shortness of breath, sudden numbness, or any other life-threatening medical emergency, please do not use this appointment system. Call your local emergency services (e.g., 911 / 112) immediately.
        </p>
      </div>

      <div className="hero-buttons">
        {token && user ? (
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        ) : (
          <>
            <Link to="/login" className="btn btn-primary">Access Portal</Link>
            <Link to="/register" className="btn btn-secondary">Patient Registration</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
