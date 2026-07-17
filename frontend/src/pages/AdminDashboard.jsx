import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader, Card, Input, Button, Badge, StatusBadge, PriorityDot,
  DataTable, Pagination, AlertBanner, Spinner, Modal, EmptyState,
} from '../components/ui';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'triage', label: 'Triage Requests' },
  { key: 'departments', label: 'Departments' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'logs', label: 'Audit Logs' },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');

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

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [qSearch, setQSearch] = useState('');
  const [qStatus, setQStatus] = useState('');
  const [qPriority, setQPriority] = useState('');
  const [qDept, setQDept] = useState('');
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotal, setQueueTotal] = useState(0);
  const QUEUE_LIMIT = 10;

  const [deptSearch, setDeptSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');

  const [overrideReq, setOverrideReq] = useState(null);
  const [overrideScore, setOverrideScore] = useState(50);
  const [overrideLevel, setOverrideLevel] = useState('Medium');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logSearch, setLogSearch] = useState('');
  const [logAction, setLogAction] = useState('');
  const [logEntityType, setLogEntityType] = useState('');
  const LOGS_LIMIT = 10;

  const fetchStats = async () => {
    setStatsLoading(true); setStatsError('');
    try { const resp = await axios.get('/api/admin/stats'); setStats(resp.data); }
    catch (err) { setStatsError('Failed to load dashboard metrics.'); }
    finally { setStatsLoading(false); }
  };

  const fetchDepartments = async (search = deptSearch) => {
    setDeptLoading(true);
    try { const resp = await axios.get('/api/admin/departments', { params: search ? { search } : {} }); setDepartments(resp.data); }
    catch (err) { console.error(err); }
    finally { setDeptLoading(false); }
  };

  const fetchDoctors = async (search = docSearch) => {
    setDocLoading(true);
    try { const resp = await axios.get('/api/admin/doctors', { params: search ? { search } : {} }); setDoctors(resp.data); }
    catch (err) { console.error(err); }
    finally { setDocLoading(false); }
  };

  const fetchQueue = async (page = queuePage) => {
    setQueueLoading(true);
    try {
      const params = { page, limit: QUEUE_LIMIT };
      if (qStatus) params.status = qStatus;
      if (qPriority) params.priority = qPriority;
      if (qDept) params.department_id = qDept;
      if (qSearch.trim()) params.search = qSearch.trim();
      const resp = await axios.get('/api/admin/appointments', { params });
      setQueue(resp.data.requests); setQueueTotal(resp.data.total); setQueuePage(page);
    } catch (err) { console.error(err); }
    finally { setQueueLoading(false); }
  };

  const fetchAuditLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = { page, limit: LOGS_LIMIT };
      if (logSearch.trim()) params.search = logSearch.trim();
      if (logAction) params.action = logAction;
      if (logEntityType) params.entity_type = logEntityType;
      const resp = await axios.get('/api/admin/audit-logs', { params });
      setLogs(resp.data.logs); setLogsTotal(resp.data.total); setLogsPage(page);
    } catch (err) { console.error(err); }
    finally { setLogsLoading(false); }
  };

  useEffect(() => { if (user?.role === 'admin') fetchStats(); }, [user]);

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments();
    else if (activeTab === 'doctors') { fetchDepartments(); fetchDoctors(); }
    else if (activeTab === 'triage') { fetchDepartments(); fetchQueue(); }
    else if (activeTab === 'logs') fetchAuditLogs(1);
    else if (activeTab === 'overview') fetchStats();
  }, [activeTab]);

  useEffect(() => { if (activeTab === 'triage') fetchQueue(1); }, [qStatus, qPriority, qDept]);

  useEffect(() => {
    if (activeTab === 'departments') { const t = setTimeout(() => fetchDepartments(deptSearch), 300); return () => clearTimeout(t); }
  }, [deptSearch, activeTab]);

  useEffect(() => {
    if (activeTab === 'doctors') { const t = setTimeout(() => fetchDoctors(docSearch), 300); return () => clearTimeout(t); }
  }, [docSearch, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') { const t = setTimeout(() => fetchAuditLogs(1), 300); return () => clearTimeout(t); }
  }, [logSearch, logAction, logEntityType, activeTab]);

  const handleCreateDept = async (e) => {
    e.preventDefault(); if (!newDeptName.trim()) return;
    try { await axios.post('/api/admin/departments', { name: newDeptName, description: newDeptDesc }); setNewDeptName(''); setNewDeptDesc(''); fetchDepartments(); alert('Department created successfully!'); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to create department.'); }
  };

  const handleToggleDept = async (dept) => {
    try { await axios.put(`/api/admin/departments/${dept.id}`, { is_active: !dept.is_active }); fetchDepartments(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to update department state.'); }
  };

  const handleUpdateDeptSubmit = async (e) => {
    e.preventDefault();
    try { await axios.put(`/api/admin/departments/${editingDeptId}`, { name: editDeptName, description: editDeptDesc }); setEditingDeptId(null); fetchDepartments(); alert('Department updated successfully!'); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to update department.'); }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault(); if (!newDocName.trim() || !newDocEmail.trim() || !newDocDeptId) return;
    try {
      await axios.post('/api/admin/doctors', { full_name: newDocName, email: newDocEmail, phone: newDocPhone || '+10000000000', password: newDocPassword, department_id: newDocDeptId, specialization: newDocSpecial, bio: '' });
      setNewDocName(''); setNewDocEmail(''); setNewDocPhone(''); setNewDocPassword(''); setNewDocSpecial(''); setNewDocDeptId('');
      fetchDoctors(); alert('Doctor account registered successfully!');
    } catch (err) { alert(err.response?.data?.detail || 'Failed to create doctor account.'); }
  };

  const handleToggleDoc = async (doc) => {
    try { await axios.put(`/api/admin/doctors/${doc.id}`, { is_active: !doc.is_active }); fetchDoctors(); }
    catch (err) { alert('Failed to modify doctor active state.'); }
  };

  const handleUpdateDocSubmit = async (e) => {
    e.preventDefault();
    try { await axios.put(`/api/admin/doctors/${editingDocId}`, { specialization: editDocSpecial, department_id: editDocDeptId }); setEditingDocId(null); fetchDoctors(); alert('Doctor profile updated successfully!'); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to update doctor.'); }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault(); if (!overrideReason.trim()) { alert('Override reason is mandatory.'); return; }
    setOverriding(true);
    try { await axios.put(`/api/admin/appointments/${overrideReq.id}/override`, { priority_score: parseInt(overrideScore), priority_level: overrideLevel, reason: overrideReason }); setOverrideReq(null); fetchQueue(queuePage); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to override priority.'); }
    finally { setOverriding(false); }
  };

  return (
    <div>
      <PageHeader
        title="Administrator Console"
        subtitle="Operate medical departments, register staff, audit logs, and override priorities."
      />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '0.25rem', borderRadius: '8px' }} role="tablist">
        {TABS.map(tab => (
          <Button key={tab.key} variant={activeTab === tab.key ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab(tab.key)} role="tab" aria-selected={activeTab === tab.key}>
            {tab.label}
          </Button>
        ))}
        <Link to="/admin/rules"><Button variant="secondary" size="sm" style={{ textDecoration: 'none' }}>Priority Rules</Button></Link>
      </div>

      {activeTab === 'overview' && (
        <div>
          {statsError && <AlertBanner variant="error">{statsError}</AlertBanner>}
          {statsLoading ? <Spinner text="Retrieving dashboard statistics..." /> : stats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Bookings</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800, marginTop: '0.5rem', color: '#60a5fa' }}>{stats.cards.total_requests}</div>
                </Card>
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800, marginTop: '0.5rem', color: '#fbbf24' }}>{stats.cards.pending_requests}</div>
                </Card>
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Critical Urgency</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800, marginTop: '0.5rem', color: '#f87171' }}>{stats.cards.critical_requests}</div>
                </Card>
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Completed Care</div>
                  <div style={{ fontSize: '2.5rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800, marginTop: '0.5rem', color: '#34d399' }}>{stats.cards.completed_appointments}</div>
                </Card>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
                <Card>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem', fontSize: '1.1rem' }}>Triage Requests Trend</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <AreaChart data={stats.charts.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/></linearGradient></defs>
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem', fontSize: '1.1rem' }}>Request Load by Department</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.charts.department} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {stats.charts.department.map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {[
                  { title: 'Priority Category Share', data: stats.charts.priority, colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'] },
                  { title: 'Status Distribution', data: stats.charts.status, colors: CHART_COLORS },
                ].map(chart => (
                  <Card key={chart.title}>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem', fontSize: '1.1rem' }}>{chart.title}</h3>
                    <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1, height: '100%' }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={chart.data} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                              {chart.data.map((_, index) => (<Cell key={`cell-${index}`} fill={chart.colors[index % chart.colors.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                        {chart.data.map((entry, idx) => (
                          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: chart.colors[idx % chart.colors.length] }} />
                            <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
                            <strong>{entry.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'triage' && (
        <div>
          <Card style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <form onSubmit={(e) => { e.preventDefault(); fetchQueue(1); }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Input label="Search Request" type="text" placeholder="Search ID/Symptoms..." value={qSearch} onChange={e => setQSearch(e.target.value)} style={{ flex: 1, minWidth: '200px', marginBottom: 0 }} />
                <Input label="Status" type="select" value={qStatus} onChange={e => setQStatus(e.target.value)} style={{ minWidth: '150px', marginBottom: 0 }}>
                  <option value="">All Statuses</option>
                  {['pending', 'assigned', 'confirmed', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </Input>
                <Input label="Urgency" type="select" value={qPriority} onChange={e => setQPriority(e.target.value)} style={{ minWidth: '150px', marginBottom: 0 }}>
                  <option value="">All Priorities</option>
                  {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                </Input>
                <Input label="Department" type="select" value={qDept} onChange={e => setQDept(e.target.value)} style={{ minWidth: '170px', marginBottom: 0 }}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Input>
                <Button type="submit" size="sm">Search</Button>
              </div>
            </form>
          </Card>

          <DataTable
            columns={[
              { key: 'priority', label: 'Priority', render: (r) => (<><PriorityDot level={r.priority_level} /><Badge variant={r.priority_level}>{r.priority_level}</Badge><strong style={{marginLeft:'0.5rem'}}>{r.priority_score}</strong></>) },
              { key: 'dept', label: 'Department', render: (r) => r.department_name },
              { key: 'symptoms', label: 'Symptoms', cellStyle: { maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, render: (r) => r.symptoms },
              { key: 'preferred', label: 'Preferred Date', render: (r) => new Date(r.preferred_date).toLocaleDateString() },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'actions', label: 'Actions', render: (r) => <Button size="sm" variant="secondary" onClick={() => { setOverrideReq(r); setOverrideScore(r.priority_score); setOverrideLevel(r.priority_level); setOverrideReason(''); }}>Override</Button> },
            ]}
            data={queue}
            loading={queueLoading}
            emptyTitle="No Results"
            emptyDescription="No appointment requests found matching filters."
          />
          <Pagination page={queuePage} total={queueTotal} limit={QUEUE_LIMIT} onPageChange={fetchQueue} />
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Clinical Departments</h3>
              <Input type="text" placeholder="Search..." value={deptSearch} onChange={e => setDeptSearch(e.target.value)} style={{ maxWidth: '240px', marginBottom: 0 }} />
            </div>
            {deptLoading ? <Spinner text="Loading departments..." /> : departments.length === 0 ? <EmptyState title="No departments" description="No departments configured." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {departments.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1rem', margin: 0 }}>{d.name}</h4>
                        <Badge variant={d.is_active ? 'Low' : 'Critical'}>{d.is_active ? 'Active' : 'Deactivated'}</Badge>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{d.description || 'No description provided.'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingDeptId(d.id); setEditDeptName(d.name); setEditDeptDesc(d.description); }}>Edit</Button>
                      <Button size="sm" variant={d.is_active ? 'danger' : 'primary'} onClick={() => handleToggleDept(d)}>{d.is_active ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.25rem' }}>Create Department</h3>
              <form onSubmit={handleCreateDept}>
                <Input label="Department Name" type="text" placeholder="e.g. Cardiology" required value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                <Input label="Description" type="textarea" rows={3} placeholder="Clinical services details..." value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} />
                <Button type="submit" fullWidth style={{ marginTop: '0.5rem' }}>Add Department</Button>
              </form>
            </Card>

            {editingDeptId && (
              <Card accent="primary" style={{ background: 'rgba(16, 185, 129, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Edit Clinic</h3>
                  <Button size="sm" variant="secondary" onClick={() => setEditingDeptId(null)}>Cancel</Button>
                </div>
                <form onSubmit={handleUpdateDeptSubmit}>
                  <Input label="Clinic Name" type="text" required value={editDeptName} onChange={e => setEditDeptName(e.target.value)} />
                  <Input label="Clinic Description" type="textarea" rows={3} value={editDeptDesc} onChange={e => setEditDeptDesc(e.target.value)} />
                  <Button type="submit" fullWidth style={{ marginTop: '0.5rem' }}>Update Department</Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Registered Doctors</h3>
              <Input type="text" placeholder="Search doctors..." value={docSearch} onChange={e => setDocSearch(e.target.value)} style={{ maxWidth: '240px', marginBottom: 0 }} />
            </div>
            {docLoading ? <Spinner text="Loading doctors..." /> : doctors.length === 0 ? <EmptyState title="No doctors" description="No doctor logins registered." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {doctors.map(d => (
                  <div key={d.id} style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1rem', margin: 0 }}>{d.full_name}</h4>
                        <Badge variant={d.is_active ? 'Low' : 'Critical'}>{d.is_active ? 'Active' : 'Suspended'}</Badge>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>Clinic: <strong>{d.department_name}</strong></span>
                        <span>Specialization: <strong>{d.specialization || 'General'}</strong></span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{d.email} | {d.phone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingDocId(d.id); setEditDocSpecial(d.specialization || ''); setEditDocDeptId(d.department_id || ''); }}>Edit</Button>
                      <Button size="sm" variant={d.is_active ? 'danger' : 'primary'} onClick={() => handleToggleDoc(d)}>{d.is_active ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {editingDocId && (
              <Card accent="primary" style={{ background: 'rgba(16, 185, 129, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Edit Doctor</h3>
                  <Button size="sm" variant="secondary" onClick={() => setEditingDocId(null)}>Cancel</Button>
                </div>
                <form onSubmit={handleUpdateDocSubmit}>
                  <Input label="Department" type="select" required value={editDocDeptId} onChange={e => setEditDocDeptId(e.target.value)}>
                    <option value="">Select Clinic...</option>
                    {departments.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Input>
                  <Input label="Specialization" type="text" required value={editDocSpecial} onChange={e => setEditDocSpecial(e.target.value)} />
                  <Button type="submit" fullWidth style={{ marginTop: '0.5rem' }}>Update Doctor</Button>
                </form>
              </Card>
            )}

            <Card>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.25rem' }}>Register New Doctor</h3>
              <form onSubmit={handleCreateDoctor}>
                <Input label="Full Name" type="text" placeholder="Dr. Full Name" required value={newDocName} onChange={e => setNewDocName(e.target.value)} />
                <Input label="Email" type="email" placeholder="doctor@prioritycare.com" required value={newDocEmail} onChange={e => setNewDocEmail(e.target.value)} />
                <Input label="Phone" type="text" placeholder="+1000000000" value={newDocPhone} onChange={e => setNewDocPhone(e.target.value)} />
                <Input label="Password" type="password" placeholder="Min 8 characters..." required value={newDocPassword} onChange={e => setNewDocPassword(e.target.value)} />
                <Input label="Department" type="select" required value={newDocDeptId} onChange={e => setNewDocDeptId(e.target.value)}>
                  <option value="">Select Clinic...</option>
                  {departments.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Input>
                <Input label="Specialization" type="text" placeholder="Cardiologist, Pediatrician" required value={newDocSpecial} onChange={e => setNewDocSpecial(e.target.value)} />
                <Button type="submit" fullWidth style={{ marginTop: '1rem' }}>Register Account</Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <Card>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", marginBottom: '1.5rem' }}>Administrative Action Logs</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <Input type="text" placeholder="Search actor, action, reason..." value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{ flex: 1, minWidth: '200px', marginBottom: 0 }} />
            <Input type="select" value={logAction} onChange={e => setLogAction(e.target.value)} style={{ minWidth: '170px', marginBottom: 0 }}>
              <option value="">All Actions</option>
              {['create_department', 'update_department', 'create_doctor', 'update_doctor', 'override_priority', 'update_priority_rules'].map(a => <option key={a} value={a}>{a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </Input>
            <Input type="select" value={logEntityType} onChange={e => setLogEntityType(e.target.value)} style={{ minWidth: '150px', marginBottom: 0 }}>
              <option value="">All Entities</option>
              {['department', 'doctor', 'appointment_request', 'priority_rules'].map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </Input>
          </div>

          {logsLoading ? <Spinner text="Retrieving audit logs..." /> : logs.length === 0 ? <EmptyState title="No logs" description="No audit events logged yet." /> : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span>Actor: <strong>{log.actor_name}</strong> ({log.actor_email})</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div>Action: <code style={{ color: 'var(--primary)' }}>{log.action}</code> on <strong>{log.entity_type}</strong> (ID: {log.entity_id})</div>
                    {log.reason && <div style={{ marginTop: '0.25rem', color: '#fbbf24' }}>Reason: <em>"{log.reason}"</em></div>}
                    {(log.previous_value || log.new_value) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        <div><div style={{ color: 'var(--text-muted)' }}>PREVIOUS:</div><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.previous_value, null, 2)}</pre></div>
                        <div><div style={{ color: 'var(--text-muted)' }}>NEW:</div><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.new_value, null, 2)}</pre></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={logsPage} total={logsTotal} limit={LOGS_LIMIT} onPageChange={fetchAuditLogs} />
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!overrideReq}
        onClose={() => setOverrideReq(null)}
        title="Manual Priority Override"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOverrideReq(null)}>Cancel</Button>
            <Button loading={overriding} disabled={overriding} onClick={handleOverrideSubmit}>Apply Override</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Override the algorithm's assessment for Request ID: <strong>{overrideReq?.id}</strong>. This action requires a mandatory reason.
        </p>
        <div className="form-group">
          <label className="form-label">Score (0-100)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input type="range" style={{ flex: 1, padding: 0 }} min="0" max="100"
              value={overrideScore} onChange={e => setOverrideScore(e.target.value)} />
            <strong style={{ minWidth: '2.5rem', textAlign: 'center' }}>{overrideScore}</strong>
          </div>
        </div>
        <Input label="Triage Category" type="select" value={overrideLevel} onChange={e => setOverrideLevel(e.target.value)}>
          {['Critical', 'High', 'Medium', 'Low'].map(l => <option key={l} value={l}>{l}</option>)}
        </Input>
        <Input label="Override Reason (Mandatory)" type="textarea" rows={3} required
          placeholder="Describe clinical symptoms or audit flags justifying override..."
          value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
      </Modal>
    </div>
  );
};

export default AdminDashboard;
