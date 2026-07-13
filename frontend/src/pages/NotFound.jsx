import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-container card" style={{ maxWidth: '600px', margin: '4rem auto' }}>
      <div className="not-found-code">404</div>
      <h2 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        The link you followed may be broken or the page may have been removed.
      </p>
      <Link to="/" className="btn btn-primary">Return to Safety</Link>
    </div>
  );
};

export default NotFound;
