import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import PatientProfile from './pages/PatientProfile';
import NewAppointment from './pages/NewAppointment';
import MyRequests from './pages/MyRequests';
import RequestDetails from './pages/RequestDetails';
import AdminRules from './pages/AdminRules';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header>
      <div className="nav-bar">
        <Link to="/" className="logo-section">
          🏥 PriorityCare
        </Link>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Home
          </NavLink>
          {user ? (
            <>
              {user.role === 'patient' && (
                <>
                  <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    Profile
                  </NavLink>
                  <NavLink to="/my-requests" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    My Requests
                  </NavLink>
                </>
              )}
              {user.role === 'admin' && (
                <NavLink to="/admin/rules" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Triage Rules
                </NavLink>
              )}
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Dashboard
              </NavLink>
              <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Sign In
              </NavLink>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/appointments/new" 
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <NewAppointment />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-requests" 
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MyRequests />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/appointments/:id" 
                element={
                  <ProtectedRoute>
                    <RequestDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/rules" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminRules />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer>
            <p>&copy; {new Date().getFullYear()} PriorityCare Clinical Portal. All rights reserved.</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
