import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { DashboardData } from '../../types';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Database,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboardMetrics();
      setData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const COLORS = ['#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-50">
      <AdminSidebar />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={fetchDashboard}
                disabled={isLoading}
                className="p-2.5 glass-card hover:bg-slate-50 text-slate-600 rounded-2xl transition-all shadow-xs"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
              <Link
                to="/admin/import"
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-300/40 transition-all flex items-center gap-1.5"
              >
                <span>+ Import Coupons</span>
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-16">
              <LoadingSpinner text="Aggregating live database telemetry..." />
            </div>
          ) : data ? (
            <>
              {/* Metrics Grid with Glass Cards & Glow Top Accents */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog</span>
                    <Database className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {data.cards.totalRegisteredCoupons}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Valid registered</span>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-indigo-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Submitted</span>
                    <Ticket className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {data.cards.totalSubmittedCoupons}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Total claimed</span>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-amber-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending</span>
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {data.cards.pendingSubmissions}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Awaiting review</span>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-emerald-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Approved</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {data.cards.approvedSubmissions}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Verified valid</span>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-rose-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Rejected</span>
                    <XCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-rose-600">
                    {data.cards.rejectedSubmissions}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Declined coupons</span>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-purple-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customers</span>
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-purple-600">
                    {data.cards.uniqueSubmittingMobiles}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Unique phones</span>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-3xl border-t-4 border-t-blue-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Admin Users</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-600">
                    {data.cards.totalAdminUsers ?? 1}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Authorized staff</span>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Daily Submissions Timeline */}
                <div className="lg:col-span-2 glass-card p-6 sm:p-7 rounded-3xl shadow-lg border border-slate-200/80">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Submissions Over Time</h3>
                      <p className="text-xs text-slate-500">Daily claim volume trends</p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    {data.charts.dailyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.charts.dailyTrend}>
                          <defs>
                            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '16px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            name="Submissions"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#totalGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No submissions recorded in this date range.
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Breakdown Donut */}
                <div className="glass-card p-6 sm:p-7 rounded-3xl shadow-lg border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Status Distribution</h3>
                    <p className="text-xs text-slate-500">Verification lifecycle breakdown</p>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    {data.cards.totalSubmittedCoupons > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.charts.statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {data.charts.statusDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium">No submissions yet</div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Pending queue items?</span>
                    <Link
                      to="/admin/submissions?status=Pending"
                      className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Review Queue <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

              </div>

              {/* Admin Panel Users Section */}
              <div className="glass-card p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Admin Panel Users
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                          {data.cards.totalAdminUsers ?? data.adminUsers?.length ?? 1} Registered
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">Authorized administrative team members with portal access</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                        <th className="pb-3 pl-2">Administrator</th>
                        <th className="pb-3">Username / Email</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.adminUsers && data.adminUsers.length > 0 ? (
                        data.adminUsers.map((admin) => (
                          <tr key={admin._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 pl-2 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                                {admin.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{admin.name}</span>
                                <span className="text-[11px] text-slate-400">ID: {admin._id.slice(-6)}</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-medium text-slate-700">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs">
                                {admin.email}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {admin.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3.5 text-slate-500 text-xs">
                              {admin.lastLoginAt
                                ? new Date(admin.lastLoginAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : 'Just recently'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                            No admin users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

        </div>
      </main>
    </div>
  );
};
