import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const PRIORITY_CLASSES = {
  'Critical': 'badge-critical',
  'High': 'badge-high',
  'Medium': 'badge-medium',
  'Low': 'badge-low'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Stats & Charts
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // Manage Departments state
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');

  // Manage Doctors state
  const [doctors, setDoctors] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocPassword, setNewDocPassword] = useState('');
  const [newDocSpecial, setNewDocSpecial] = useState('');
  const [newDocDeptId, setNewDocDeptId] = useState('');
  const [editingDocId, setEditingDocId] = useState(null);
  const [editDocSpecial, setEditDocSpecial] = useState('');
  const [editDocDeptId, setEditDocDeptId] = useState('');

  // Triage requests queue
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [qSearch, setQSearch] = useState('');
  const [qStatus, setQStatus] = useState('');
  const [qPriority, setQPriority] = useState('');
  const [qDept, setQDept] = useState('');
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotal, setQueueTotal] = useState(0);
  const QUEUE_LIMIT = 10;

  // Department & doctor search
  const [deptSearch, setDeptSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');

  // Override Modal
  const [overrideReq, setOverrideReq] = useState(null);
  const [overrideScore, setOverrideScore] = useState(50);
  const [overrideLevel, setOverrideLevel] = useState('Medium');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  // Audit Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logSearch, setLogSearch] = useState('');
  const [logAction, setLogAction] = useState('');
  const [logEntityType, setLogEntityType] = useState('');
  const LOGS_LIMIT = 10;

  // Fetch Admin Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const resp = await axios.get('/api/admin/stats');
      setStats(resp.data);
    } catch (err) {
      setStatsError('Failed to load dashboard metrics.');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Departments
  const fetchDepartments = async (search = deptSearch) => {
    setDeptLoading(true);
    try {
      const params = search ? { search } : {};
      const resp = await axios.get('/api/admin/departments', { params });
      setDepartments(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDeptLoading(false);
    }
  };

  // Fetch Doctors
  const fetchDoctors = async (search = docSearch) => {
    setDocLoading(true);
    try {
      const params = search ? { search } : {};
      const resp = await axios.get('/api/admin/doctors', { params });
      setDoctors(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDocLoading(false);
    }
  };

  // Fetch Queue
  const fetchQueue = async (page = queuePage) => {
    setQueueLoading(true);
    try {
      const params = { page, limit: QUEUE_LIMIT };
      if (qStatus) params.status = qStatus;
      if (qPriority) params.priority = qPriority;
      if (qDept) params.department_id = qDept;
      if (qSearch.trim()) params.search = qSearch.trim();
      
      const resp = await axios.get('/api/admin/appointments', { params });
      setQueue(resp.data.requests);
      setQueueTotal(resp.data.total);
      setQueuePage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setQueueLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = { page, limit: LOGS_LIMIT };
      if (logSearch.trim()) params.search = logSearch.trim();
      if (logAction) params.action = logAction;
      if (logEntityType) params.entity_type = logEntityType;
      const resp = await axios.get('/api/admin/audit-logs', { params });
      setLogs(resp.data.logs);
      setLogsTotal(resp.data.total);
      setLogsPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Initial stats trigger
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  // Tab change triggers
  useEffect(() => {
    if (activeTab === 'departments') {
      fetchDepartments();
    } else if (activeTab === 'doctors') {
      fetchDepartments();
      fetchDoctors();
    } else if (activeTab === 'triage') {
      fetchDepartments();
      fetchQueue();
    } else if (activeTab === 'logs') {
      fetchAuditLogs(1);
    } else if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab]);

  // Triage filter effect
  useEffect(() => {
    if (activeTab === 'triage') {
      fetchQueue(1);
    }
  }, [qStatus, qPriority, qDept]);

  // Department search debounce
  useEffect(() => {
    if (activeTab === 'departments') {
      const timer = setTimeout(() => fetchDepartments(deptSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [deptSearch, activeTab]);

  // Doctor search debounce
  useEffect(() => {
    if (activeTab === 'doctors') {
      const timer = setTimeout(() => fetchDoctors(docSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [docSearch, activeTab]);

  // Audit log filter effect
  useEffect(() => {
    if (activeTab === 'logs') {
      const timer = setTimeout(() => fetchAuditLogs(1), 300);
      return () => clearTimeout(timer);
    }
  }, [logSearch, logAction, logEntityType, activeTab]);

  // Create Department
  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await axios.post('/api/admin/departments', {
        name: newDeptName,
        description: newDeptDesc
      });
      setNewDeptName('');
      setNewDeptDesc('');
      fetchDepartments();
      alert('Department created successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create department.');
    }
  };

  // Update Department Toggle State
  const handleToggleDept = async (dept) => {
    try {
      await axios.put(`/api/admin/departments/${dept.id}`, {
        is_active: !dept.is_active
      });
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update department state.');
    }
  };

  // Trigger Edit Department Modal/Form
  const handleStartEditDept = (dept) => {
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name);
    setEditDeptDesc(dept.description);
  };

  const handleUpdateDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/admin/departments/${editingDeptId}`, {
        name: editDeptName,
        description: editDeptDesc
      });
      setEditingDeptId(null);
      fetchDepartments();
      alert('Department updated successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update department.');
    }
  };

  // Register Doctor
  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocEmail.trim() || !newDocDeptId) return;

    try {
      await axios.post('/api/admin/doctors', {
        full_name: newDocName,
        email: newDocEmail,
        phone: newDocPhone || '+10000000000',
        password: newDocPassword,
        department_id: newDocDeptId,
        specialization: newDocSpecial,
        bio: ''
      });
      setNewDocName('');
      setNewDocEmail('');
      setNewDocPhone('');
      setNewDocPassword('');
      setNewDocSpecial('');
      setNewDocDeptId('');
      fetchDoctors();
      alert('Doctor account registered successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create doctor account.');
    }
  };

  // Toggle Doctor Active Status
  const handleToggleDoc = async (doc) => {
    try {
      await axios.put(`/api/admin/doctors/${doc.id}`, {
        is_active: !doc.is_active
      });
      fetchDoctors();
    } catch (err) {
      alert('Failed to modify doctor active state.');
    }
  };

  // Edit Doctor
  const handleStartEditDoc = (doc) => {
    setEditingDocId(doc.id);
    setEditDocSpecial(doc.specialization || '');
    setEditDocDeptId(doc.department_id || '');
  };

  const handleUpdateDocSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/admin/doctors/${editingDocId}`, {
        specialization: editDocSpecial,
        department_id: editDocDeptId
      });
      setEditingDocId(null);
      fetchDoctors();
      alert('Doctor profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update doctor.');
    }
  };

  // Override Priority action
  const handleStartOverride = (req) => {
    setOverrideReq(req);
    setOverrideScore(req.priority_score);
    setOverrideLevel(req.priority_level);
    setOverrideReason('');
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('Override reason is mandatory.');
      return;
    }
    setOverriding(true);
    try {
      await axios.put(`/api/admin/appointments/${overrideReq.id}/override`, {
        priority_score: parseInt(overrideScore),
        priority_level: overrideLevel,
        reason: overrideReason
      });
      setOverrideReq(null);
      fetchQueue(queuePage);
      alert('Triage priority manually overridden successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to override priority.');
    } finally {
      setOverriding(false);
    }
  };

  const handleQueueSearch = (e) => {
    e.preventDefault();
    fetchQueue(1);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif' }}>Administrator Console</h1>
          <p style={{ color: 'var(--text-muted)' }}>Operate medical departments, register staff, audit logs, and override priorities.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '8px' }}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`btn ${activeTab === 'triage' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('triage')}>Triage Requests</button>
          <button className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('departments')}>Departments</button>
          <button className={`btn ${activeTab === 'doctors' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('doctors')}>Doctors</button>
          <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('logs')}>Audit Logs</button>
          <Link to="/admin/rules" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', textDecoration: 'none' }}>Priority Rules</Link>
        </div>
      </div>

      {/* OVERVIEW PANEL */}
      {activeTab === 'overview' && (
        <div>
          {statsError && <div className="form-error">{statsError}</div>}
          
          {statsLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Retrieving dashboard statistics...</p>
            </div>
          ) : stats && (
            <div>
              {/* Metric Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Bookings</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginTop: '0.5rem', color: '#60a5fa' }}>{stats.cards.total_requests}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginTop: '0.5rem', color: '#fbbf24' }}>{stats.cards.pending_requests}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Critical Urgency</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginTop: '0.5rem', color: '#f87171' }}>{stats.cards.critical_requests}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Completed Care</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginTop: '0.5rem', color: '#34d399' }}>{stats.cards.completed_appointments}</div>
                </div>
              </div>

              {/* Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                
                {/* 1. Daily Trend Area Chart */}
                <div className="card">
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Triage Requests Trend (Last 7 Days)</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <AreaChart data={stats.charts.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                        <Area type="monotone" dataKey="count" name="Bookings" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Department Volume Bar Chart */}
                <div className="card">
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Request Load by Department</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.charts.department} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                        <Bar dataKey="value" name="Appointments" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {stats.charts.department.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Priority Level Distribution Pie Chart */}
                <div className="card">
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Triage Priority Category Share</h3>
                  <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '100%' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={stats.charts.priority} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                            {stats.charts.priority.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      {stats.charts.priority.map((entry, idx) => (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][idx % 4] }}></span>
                          <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
                          <strong>{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Status Breakdown Pie Chart */}
                <div className="card">
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Triage Status Distribution</h3>
                  <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '100%' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={stats.charts.status} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                            {stats.charts.status.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      {stats.charts.status.map((entry, idx) => (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                          <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
                          <strong>{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* TRIAGE QUEUE LIST TAB */}
      {activeTab === 'triage' && (
        <div>
          {/* Filters Bar */}
          <form className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }} onSubmit={handleQueueSearch}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '220px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Search Request (ID/Symptoms)</label>
                <input type="text" className="form-control" placeholder="Search..." value={qSearch} onChange={e => setQSearch(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Status</label>
                <select className="form-control" value={qStatus} onChange={e => setQStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Urgency</label>
                <select className="form-control" value={qPriority} onChange={e => setQPriority(e.target.value)}>
                  <option value="">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Department</label>
                <select className="form-control" value={qDept} onChange={e => setQDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Search</button>
            </div>
          </form>

          {/* Table list */}
          {queueLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Loading records...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>No appointment requests found matching filters.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Priority Category</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Department</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Symptoms Summary</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Preferred Date</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={`badge ${PRIORITY_CLASSES[req.priority_level]}`} style={{ marginRight: '0.5rem' }}>
                          {req.priority_level}
                        </span>
                        <strong>{req.priority_score}</strong>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>{req.department_name}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.symptoms}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                        {new Date(req.preferred_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>{req.status}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleStartOverride(req)}>
                          Override Priority
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total requests: {queueTotal}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} disabled={queuePage === 1} onClick={() => fetchQueue(queuePage - 1)}>
                    ◀ Previous
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} disabled={queuePage * QUEUE_LIMIT >= queueTotal} onClick={() => fetchQueue(queuePage + 1)}>
                    Next ▶
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANAGE DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="dashboard-grid">
          
          {/* Department List */}
          <div className="card" style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', margin: 0 }}>Clinical Clinics / Departments</h3>
              <input type="text" className="form-control" placeholder="Search departments..." value={deptSearch} onChange={e => setDeptSearch(e.target.value)} style={{ maxWidth: '240px' }} />
            </div>
            
            {deptLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading departments...</p>
            ) : departments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No departments configured.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {departments.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ fontFamily: 'Outfit, sans-serif' }}>{d.name}</h4>
                        <span className={`badge ${d.is_active ? 'badge-low' : 'badge-critical'}`} style={{ fontSize: '0.7rem' }}>
                          {d.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{d.description || 'No description provided.'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleStartEditDept(d)}>Edit</button>
                      <button className={`btn ${d.is_active ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleToggleDept(d)}>
                        {d.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Forms Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Create Department Form */}
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.25rem' }}>Create Department</h3>
              <form onSubmit={handleCreateDept}>
                <div className="form-group">
                  <label className="form-label">Department Name</label>
                  <input type="text" className="form-control" placeholder="e.g. Cardiology" required value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="3" placeholder="Clinical services details..." value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Add Department</button>
              </form>
            </div>

            {/* Edit Department Inline Form (Conditional) */}
            {editingDeptId && (
              <div className="card" style={{ border: '1px solid var(--primary-light)', background: 'rgba(16, 185, 129, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', margin: 0 }}>Edit Clinic Details</h3>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setEditingDeptId(null)}>Cancel</button>
                </div>
                <form onSubmit={handleUpdateDeptSubmit}>
                  <div className="form-group">
                    <label className="form-label">Clinic Name</label>
                    <input type="text" className="form-control" required value={editDeptName} onChange={e => setEditDeptName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Clinic Description</label>
                    <textarea className="form-control" rows="3" value={editDeptDesc} onChange={e => setEditDeptDesc(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Update Department</button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MANAGE DOCTORS TAB */}
      {activeTab === 'doctors' && (
        <div className="dashboard-grid">
          
          {/* Doctor Account Register Grid */}
          <div className="card" style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', margin: 0 }}>Registered Doctor Accounts</h3>
              <input type="text" className="form-control" placeholder="Search doctors..." value={docSearch} onChange={e => setDocSearch(e.target.value)} style={{ maxWidth: '240px' }} />
            </div>
            
            {docLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading doctors...</p>
            ) : doctors.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No doctor logins registered.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {doctors.map(d => (
                  <div key={d.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ fontFamily: 'Outfit, sans-serif' }}>{d.full_name}</h4>
                        <span className={`badge ${d.is_active ? 'badge-low' : 'badge-critical'}`} style={{ fontSize: '0.7rem' }}>
                          {d.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>Clinic: <strong>{d.department_name}</strong></span>
                        <span>Specialization: <strong>{d.specialization || 'General'}</strong></span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Email: {d.email} | Contact: {d.phone}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleStartEditDoc(d)}>Edit</button>
                      <button className={`btn ${d.is_active ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleToggleDoc(d)}>
                        {d.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctor registration Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {editingDocId && (
              <div className="card" style={{ border: '1px solid var(--primary-light)', background: 'rgba(16, 185, 129, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', margin: 0 }}>Edit Doctor Profile</h3>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setEditingDocId(null)}>Cancel</button>
                </div>
                <form onSubmit={handleUpdateDocSubmit}>
                  <div className="form-group">
                    <label className="form-label">Department / Clinic</label>
                    <select className="form-control" required value={editDocDeptId} onChange={e => setEditDocDeptId(e.target.value)}>
                      <option value="">Select Clinic...</option>
                      {departments.filter(d => d.is_active).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input type="text" className="form-control" required value={editDocSpecial} onChange={e => setEditDocSpecial(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Update Doctor</button>
                </form>
              </div>
            )}

          <div className="card">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.25rem' }}>Register New Doctor</h3>
            <form onSubmit={handleCreateDoctor}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" placeholder="Dr. Full Name" required value={newDocName} onChange={e => setNewDocName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" placeholder="doctor@prioritycare.com" required value={newDocEmail} onChange={e => setNewDocEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number (Phone)</label>
                <input type="text" className="form-control" placeholder="+1000000000" value={newDocPhone} onChange={e => setNewDocPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" placeholder="Min 8 characters..." required value={newDocPassword} onChange={e => setNewDocPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Department / Clinic</label>
                <select className="form-control" required value={newDocDeptId} onChange={e => setNewDocDeptId(e.target.value)}>
                  <option value="">Select Clinic...</option>
                  {departments.filter(d => d.is_active).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input type="text" className="form-control" placeholder="Cardiologist, Pediatrician" required value={newDocSpecial} onChange={e => setNewDocSpecial(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Register Account</button>
            </form>
          </div>
          </div>

        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem' }}>Administrative Action Logs</h3>

          {/* Audit log filters */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <input type="text" className="form-control" placeholder="Search actor, action, reason..." value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{ flex: 1, minWidth: '200px' }} />
            <select className="form-control" value={logAction} onChange={e => setLogAction(e.target.value)} style={{ minWidth: '180px' }}>
              <option value="">All Actions</option>
              <option value="create_department">Create Department</option>
              <option value="update_department">Update Department</option>
              <option value="create_doctor">Create Doctor</option>
              <option value="update_doctor">Update Doctor</option>
              <option value="override_priority">Override Priority</option>
              <option value="update_priority_rules">Update Priority Rules</option>
            </select>
            <select className="form-control" value={logEntityType} onChange={e => setLogEntityType(e.target.value)} style={{ minWidth: '160px' }}>
              <option value="">All Entities</option>
              <option value="department">Department</option>
              <option value="doctor">Doctor</option>
              <option value="appointment_request">Appointment Request</option>
              <option value="priority_rules">Priority Rules</option>
            </select>
          </div>
          
          {logsLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>Retrieving audit logs...</p>
          ) : logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No audit events logged yet.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                      <span>
                        Actor: <strong>{log.actor_name}</strong> ({log.actor_email})
                      </span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      Action: <code style={{ color: 'var(--primary)' }}>{log.action}</code> on <strong>{log.entity_type}</strong> (ID: {log.entity_id})
                    </div>
                    {log.reason && (
                      <div style={{ marginTop: '0.25rem', color: '#fbbf24' }}>
                        Override Reason: <em>"{log.reason}"</em>
                      </div>
                    )}
                    {(log.previous_value || log.new_value) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>PREVIOUS STATE:</div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.previous_value, null, 2)}</pre>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>NEW STATE:</div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.new_value, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total events logged: {logsTotal}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} disabled={logsPage === 1} onClick={() => fetchAuditLogs(logsPage - 1)}>
                    ◀ Previous
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} disabled={logsPage * LOGS_LIMIT >= logsTotal} onClick={() => fetchAuditLogs(logsPage + 1)}>
                    Next ▶
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OVERRIDE PRIORITY MODAL WINDOW */}
      {overrideReq && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>Manual Priority Override</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Override the algorithm's assessment category for Request ID: <strong>{overrideReq.id}</strong>. This action requires a mandatory reason.
            </p>
            
            <form onSubmit={handleOverrideSubmit}>
              <div className="form-group">
                <label className="form-label">Overridden Score (0-100)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="range" className="form-control" style={{ flex: 1, padding: 0 }} min="0" max="100"
                    value={overrideScore} onChange={e => setOverrideScore(e.target.value)} />
                  <strong style={{ minWidth: '2.5rem', textAlign: 'center' }}>{overrideScore}</strong>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Triage Category Level</label>
                <select className="form-control" value={overrideLevel} onChange={e => setOverrideLevel(e.target.value)}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Override Justification Reason (Mandatory)</label>
                <textarea className="form-control" rows="3" required placeholder="Describe clinical symptoms or audit flags justifying override..."
                  value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOverrideReq(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={overriding}>
                  {overriding ? 'Applying...' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
