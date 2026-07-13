import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Loading PriorityCare...</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Authenticating session</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Role validation
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if unauthorized
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
