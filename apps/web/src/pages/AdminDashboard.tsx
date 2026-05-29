import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, ShieldAlert, Users, Database, Terminal, Settings } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const auth = useContext(AuthContext);
  const token = auth?.token;

  const [activeTab, setActiveTab] = useState('telemetry');

  // Bidirectional routing sync: Update state when URL changes
  useEffect(() => {
    if (tab === 'system-health' || tab === 'health') {
      setActiveTab('health');
    } else if (tab === 'telemetry') {
      setActiveTab('telemetry');
    } else if (tab === 'users') {
      setActiveTab('users');
    } else if (tab === 'logs') {
      setActiveTab('logs');
    }
  }, [tab]);

  // Bidirectional routing sync: Update URL when tab state changes
  useEffect(() => {
    const routeTab = activeTab === 'health' ? 'system-health' : activeTab;
    navigate(`/admin/${routeTab}`, { replace: true });
  }, [activeTab, navigate]);

  // Telemetry overview metrics
  const [overview, setOverview] = useState({
    totalDocs: 0,
    avgConfidence: 0.942,
    avgLatencyMs: 2100,
    totalCostUsd: 0.125
  });

  // Recharts details
  const [charts, setCharts] = useState({
    accuracyByDocType: [] as any[],
    throughput: [] as any[],
    costOverTime: [] as any[]
  });

  // Users List (IAM)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // System Uptime Health
  const [health, setHealth] = useState({
    uptime: 0,
    memoryUsage: 'N/A',
    cpuUsage: 'N/A',
    networkLatencyMs: 'N/A',
    clusters: [] as any[]
  });

  // SSE Live Logs Console
  const [logs, setLogs] = useState<any[]>([]);
  const [logConnectionActive, setLogConnectionActive] = useState(false);

  // Redirect standard users
  useEffect(() => {
    if (!auth?.loading && !auth?.user) {
      navigate('/login');
      return;
    }
    if (auth?.user && !['admin', 'manager', 'viewer'].includes(auth.user.role)) {
      navigate('/dashboard');
    }
  }, [auth, navigate]);

  const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  // Fetch telemetry metrics
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const ovRes = await axios.get('/api/v1/telemetry/overview', authHeader);
        const dtRes = await axios.get('/api/v1/telemetry/details', authHeader);
        setOverview(ovRes.data);
        setCharts(dtRes.data);
      } catch (err) {
        console.error('Failed to load telemetry data:', err);
      }
    };

    if (activeTab === 'telemetry') {
      fetchTelemetry();
    }
  }, [activeTab, token]);

  // Fetch IAM Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`/api/v1/admin/users?page=${usersPage}&limit=10`, authHeader);
        setUsersList(response.data.users);
        setTotalUsers(response.data.total);
      } catch (err) {
        console.error('Failed to fetch user profiles:', err);
      }
    };

    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, usersPage, token]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await axios.put(`/api/v1/admin/users/${userId}/role`, { role: newRole }, authHeader);
      // Reload users list
      const response = await axios.get(`/api/v1/admin/users?page=${usersPage}&limit=10`, authHeader);
      setUsersList(response.data.users);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Role update failed');
    }
  };

  // Fetch System Health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await axios.get('/api/v1/admin/health', authHeader);
        setHealth(response.data);
      } catch (err) {
        console.error('Failed to fetch system uptime metrics:', err);
      }
    };

    if (activeTab === 'health') {
      fetchHealth();
      const interval = setInterval(fetchHealth, 5000); // Poll health metrics
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  // SSE Live Logs Stream
  useEffect(() => {
    if (activeTab !== 'logs' || !token) {
      setLogConnectionActive(false);
      return;
    }

    setLogs([]);
    setLogConnectionActive(true);

    const eventSource = new EventSource(`/api/v1/admin/logs/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const logData = JSON.parse(event.data);
        setLogs((prev) => [logData, ...prev.slice(0, 49)]); // Cap history at 50 logs
      } catch (err) {
        console.error(err);
      }
    };

    eventSource.onerror = () => {
      setLogConnectionActive(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeTab, token]);

  // Styling helpers
  const getLogSeverityColorClass = (level: string) => {
    if (level === 'error') return 'text-red-400 font-bold';
    if (level === 'warn') return 'text-amber-400 font-semibold';
    return 'text-slate-400';
  };

  const getAccuracyColor = (val: number) => {
    if (val >= 90) return '#10b981'; // emerald
    if (val >= 70) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="flex bg-surface-950 min-h-screen">
      {/* Sidebar Nav */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={true} />

      {/* Main Content Pane */}
      <main className="flex-grow pl-64 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Row */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">
                {activeTab === 'telemetry' && 'Telemetry Overview'}
                {activeTab === 'users' && 'Identity & Access Management (IAM)'}
                {activeTab === 'health' && 'System Health & Node Telemetry'}
                {activeTab === 'logs' && 'Audit Log Console'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                Logged in as Admin: {auth?.user?.name || 'Administrator'}
              </p>
            </div>
          </div>

          {/* Telemetry Tab (Recharts Dashboard) */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Overview cards row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processed Invoices</h3>
                    <p className="text-3xl font-black text-slate-100 mt-2">{overview.totalDocs}</p>
                  </div>
                  <Database className="w-8 h-8 text-indigo-400 opacity-60" />
                </div>

                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extraction Accuracy</h3>
                    <p className="text-3xl font-black text-emerald-400 mt-2">{Math.round(overview.avgConfidence * 100)}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-emerald-400 opacity-60" />
                </div>

                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Latency</h3>
                    <p className="text-3xl font-black text-slate-100 mt-2">{overview.avgLatencyMs}ms</p>
                  </div>
                  <Terminal className="w-8 h-8 text-brand-400 opacity-60" />
                </div>

                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Fees Accumulated</h3>
                    <p className="text-3xl font-black text-slate-100 mt-2">${overview.totalCostUsd.toFixed(4)}</p>
                  </div>
                  <Settings className="w-8 h-8 text-amber-500 opacity-60" />
                </div>
              </div>

              {/* Recharts Analytics Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Extraction accuracy by doc type */}
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Extraction Accuracy by Document Class</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.accuracyByDocType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#26262b" />
                        <XAxis dataKey="docType" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1e', border: '1px solid #26262b' }} labelClassName="text-slate-300 font-bold" />
                        <Bar dataKey="accuracy" fill="#6366f1" radius={[4, 4, 0, 0]}>
                          {charts.accuracyByDocType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getAccuracyColor(entry.accuracy)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Hourly throughput over time */}
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Pipeline Job Throughput (Hourly count)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={charts.throughput} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#26262b" />
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1e', border: '1px solid #26262b' }} />
                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. API cost Over time */}
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 lg:col-span-2">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">LLM API Cost Analysis</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={charts.costOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#26262b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1e', border: '1px solid #26262b' }} />
                        <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User IAM Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-surface-900 overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-surface-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-6 py-4">User Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4 w-32 text-center">Role Permission</th>
                      <th className="px-6 py-4 w-48 text-center">Adjust Authorization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                    {usersList.map((usr) => (
                      <tr key={usr._id} className="hover:bg-surface-800 transition">
                        <td className="px-6 py-4 font-bold text-slate-200">{usr.name}</td>
                        <td className="px-6 py-4">{usr.email}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            usr.role === 'admin'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : usr.role === 'manager'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : usr.role === 'viewer'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <select
                            value={usr.role}
                            disabled={auth?.user?.id === usr._id} // Prevent de-promoting oneself
                            onChange={(e) => handleUpdateRole(usr._id, e.target.value)}
                            className="bg-surface-950 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-bold"
                          >
                            <option value="user">User / Accountant</option>
                            <option value="viewer">Viewer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Telemetry health cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gateway Uptime</h4>
                  <p className="text-2xl font-black text-slate-100 mt-2">{health.uptime}s</p>
                </div>
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memory Allocation</h4>
                  <p className="text-2xl font-black text-brand-400 mt-2">{health.memoryUsage}</p>
                </div>
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPU Clusters Load</h4>
                  <p className="text-2xl font-black text-emerald-400 mt-2">{health.cpuUsage}</p>
                </div>
                <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network latency</h4>
                  <p className="text-2xl font-black text-slate-100 mt-2">{health.networkLatencyMs}</p>
                </div>
              </div>

              {/* Uptime nodes list */}
              <div className="rounded-xl border border-slate-800 bg-surface-900 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Active Distributed Cluster Nodes</h3>
                <div className="space-y-3">
                  {health.clusters.map((cluster: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-4 rounded-lg border border-slate-800 bg-surface-950/40">
                      <div className="flex items-center space-x-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-200">{cluster.name}</span>
                      </div>
                      <div className="flex items-center space-x-6 text-xs font-bold">
                        <span className="text-slate-400">Load: {cluster.load}</span>
                        <span className="text-emerald-400 uppercase">{cluster.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs SSE stream Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-surface-900 px-6 py-3 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <Terminal className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-slate-300">Live Audit Log Console Stream</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${
                  logConnectionActive ? 'bg-emerald-500/10 text-emerald-400 animate-pulse' : 'bg-red-500/10 text-red-400'
                }`}>
                  {logConnectionActive ? 'Streaming' : 'Connection offline'}
                </span>
              </div>

              {/* Console log list window */}
              <div className="rounded-xl border border-slate-800 bg-surface-950 font-mono text-[11px] p-6 h-[460px] overflow-y-auto space-y-2.5 flex flex-col-reverse">
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic text-center py-12">Waiting for pipeline logs from server queue...</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed border-b border-slate-900 pb-1.5 last:border-b-0">
                      <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className={getLogSeverityColorClass(log.level)}>[{log.level.toUpperCase()}]</span>{' '}
                      <span className="text-indigo-400 font-semibold">{log.action}:</span>{' '}
                      <span className="text-slate-300">{JSON.stringify(log.metadata || {})}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
