import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { RegisteredCoupon, PaginationMeta } from '../../types';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { Database, Search, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<RegisteredCoupon[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const isSub = statusFilter === '' ? undefined : statusFilter === 'submitted';
      const res = await adminApi.listCoupons({
        page,
        limit: 20,
        search: searchTerm.trim() || undefined,
        isSubmitted: isSub,
      });
      setCoupons(res.data.coupons);
      setPagination(res.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load coupon catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons(1);
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCoupons(1);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-50">
      <AdminSidebar />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Registered Coupon
              </h1>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={() => fetchCoupons(pagination.page)}
                disabled={isLoading}
                className="p-2.5 glass-card hover:bg-slate-50 text-slate-600 rounded-2xl transition-all shadow-xs"
                title="Refresh catalog"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
              <Link
                to="/admin/import"
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-300/40 transition-all"
              >
                + Import More
              </Link>
            </div>
          </div>

          {/* Filters Bar with Glassmorphic Card */}
          <div className="glass-card p-4 sm:p-6 rounded-3xl shadow-sm space-y-4 border border-slate-200/80">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by coupon number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold shadow-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
              >
                <option value="">All Coupons</option>
                <option value="submitted">Submitted Only (Locked)</option>
                <option value="unsubmitted">Available / Unsubmitted</option>
              </select>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all"
              >
                Filter
              </button>
            </form>
          </div>

          {/* Table Container */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-lg border border-slate-200/80">
            {error && (
              <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="p-16">
                <LoadingSpinner text="Loading catalog registry..." />
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-16 text-center animate-fade-in">
                <Database className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-float" />
                <h3 className="text-sm font-bold text-slate-700">No coupons registered</h3>
                <p className="text-xs text-slate-400 mt-1">Import coupons to seed your catalog.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-5 py-4">Coupon Code</th>
                      <th className="px-5 py-4">Normalized Unique Key</th>
                      <th className="px-5 py-4">Claim Status</th>
                      <th className="px-5 py-4">Linked Submission</th>
                      <th className="px-5 py-4">Batch ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 font-mono text-xs">
                    {coupons.map((c) => (
                      <tr key={c._id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-xs">
                            {c.couponNumber}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                          {c.normalizedCouponNumber}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-sans">
                          {c.isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
                              <CheckCircle className="w-3.5 h-3.5 text-indigo-600" /> Submitted (Locked)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Available
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-sans whitespace-nowrap">
                          {c.submissionId ? (
                            <span className="text-xs">
                              Ref: <strong className="text-indigo-600 font-bold">{c.submissionId.submissionReference}</strong> ({c.submissionId.customerName})
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap font-sans text-xs">
                          {c.importBatchId || 'Initial Seed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination meta={pagination} onPageChange={(p) => fetchCoupons(p)} />
          </div>

        </div>
      </main>
    </div>
  );
};
