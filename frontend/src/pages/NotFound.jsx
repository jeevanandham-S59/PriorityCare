import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';

const NotFound = () => {
  return (
    <Card style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <div className="not-found-code">404</div>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1rem', color: 'var(--text-main)' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
        The link you followed may be broken or the page may have been removed.
      </p>
      <Link to="/"><Button>Return to Safety</Button></Link>
    </Card>
  );
};

export default NotFound;
