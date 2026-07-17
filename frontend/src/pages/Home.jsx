import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, AlertBanner } from '../components/ui';

const Home = () => {
  const { token, user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section className="hero-section">
        <h1 className="hero-title">PriorityCare Clinical Triage</h1>
        <p className="hero-subtitle">
          Ensuring patient safety by prioritizing scheduling based on medical urgency.
          Submit symptoms online and let our triage system map your care schedule.
        </p>
        <div className="hero-buttons">
          {token && user ? (
            <>
              {user.role === 'patient' && (
                <>
                  <Link to="/appointments/new"><Button>Book Appointment</Button></Link>
                  <Link to="/my-requests"><Button variant="secondary">My Requests</Button></Link>
                </>
              )}
              {user.role === 'doctor' && (
                <Link to="/dashboard"><Button>View Clinical Queue</Button></Link>
              )}
              {user.role === 'admin' && (
                <Link to="/dashboard"><Button>System Configuration Console</Button></Link>
              )}
            </>
          ) : (
            <>
              <Link to="/register"><Button>Patient Registration</Button></Link>
              <Link to="/login"><Button variant="secondary">Staff Sign In</Button></Link>
            </>
          )}
        </div>
      </section>

      <AlertBanner variant="error" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <strong>Life-Threatening Emergency Warning:</strong> If you are experiencing severe chest pain,
        shortness of breath, sudden weakness, severe bleeding, or any other life-threatening medical
        emergency, please do not use this system. Call your local emergency services (e.g., 911 / 112 / 999)
        or visit the nearest emergency department immediately.
      </AlertBanner>

      <section>
        <h2 style={{ textAlign: 'center', fontFamily: "'Outfit', sans-serif", color: 'var(--primary)', marginBottom: '2rem' }}>
          How PriorityCare Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: '\uD83D\uDCCB', title: '1. Medical Profile', desc: 'Patients complete a secure medical profile detailing chronic conditions, age, and pregnancy status.' },
            { icon: '\uD83E\uDDCD', title: '2. Symptom Log', desc: 'Describe current symptoms, specify severity scale (1-10), and select symptom duration.' },
            { icon: '\u26A1', title: '3. Dynamic Triage', desc: 'Our engine evaluates symptom keywords, duration, and patient parameters to classify urgency from Low to Critical.' },
            { icon: '\uD83D\uDCC5', title: '4. Clinical Schedule', desc: 'Attending clinicians review prioritized queues, assign booking slots, and transition statuses.' },
          ].map((step, i) => (
            <Card key={i} style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{step.icon}</div>
              <h4 style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--primary)', marginBottom: '0.5rem' }}>{step.title}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card accent="teal" style={{ padding: '2rem' }}>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--primary)', marginBottom: '0.75rem' }}>
          Privacy & Data Protection Statement
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          At PriorityCare, your medical data security is our highest priority. All clinical profiles and
          symptom details are encrypted, stored in compliance with local healthcare privacy regulations,
          and accessible only to authorized medical personnel assigned to your department. We never share
          clinical history with third-party aggregators.
        </p>
      </Card>

      <Card style={{ textAlign: 'center', background: 'rgba(13, 148, 136, 0.02)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Ready to get started? Create your patient account and submit your first triage request.
        </p>
        {!token && (
          <Link to="/register"><Button size="lg">Create Your Account</Button></Link>
        )}
      </Card>
    </div>
  );
};

export default Home;
