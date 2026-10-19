import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerApi } from '../../api/customerApi';
import { CouponSubmission, PaginationMeta } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import {
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export const CustomerHistoryPage: React.FC = () => {
  const { customerMobile, customerName, isCustomerAuthenticated, setCustomerAuth, updateCustomerName } = useAuth();

  const [activeMobile, setActiveMobile] = useState<string>(customerMobile || '');
  const [lookupInput, setLookupInput] = useState('');
  const [submissions, setSubmissions] = useState<CouponSubmission[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo viewer modal state
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');

  const loadHistory = async (page = 1, mobileToFetch?: string) => {
    const targetMobile = mobileToFetch || activeMobile || customerMobile;
    if (!targetMobile) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await customerApi.getMySubmissions(page, 10, targetMobile);
      setSubmissions(res.data.submissions);
      setCounts(res.data.counts);
      setPagination(res.data.pagination);

      // Auto sync customer name if available from submission record
      if (res.data.submissions.length > 0 && res.data.submissions[0]?.customerName) {
        updateCustomerName(res.data.submissions[0].customerName);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your submission history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerMobile) {
      setActiveMobile(customerMobile);
      loadHistory(1, customerMobile);
    }
  }, [customerMobile]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupInput.trim();
    if (cleaned.length < 10) {
      setError('Please enter a valid 10 to 15 digit mobile number.');
      return;
    }
    setActiveMobile(cleaned);
    loadHistory(1, cleaned);
  };

  const handleOpenPhoto = async (sub: CouponSubmission) => {
    setPhotoLoading(true);
    setPhotoTitle(`Coupon Photo: ${sub.couponNumber} (${sub.submissionReference})`);
    try {
      const blobUrl = await customerApi.getPhotoBlobUrl(sub._id, activeMobile);
      setViewPhotoUrl(blobUrl);
    } catch {
      alert('Unable to load photo. Access denied or file missing.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleClosePhoto = () => {
    if (viewPhotoUrl) URL.revokeObjectURL(viewPhotoUrl);
    setViewPhotoUrl(null);
  };

  if (!isCustomerAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Coupon
          </h1>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => loadHistory(pagination.page)}
            disabled={isLoading}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl text-slate-600 border border-slate-200/80 transition-all shadow-xs"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <Link
            to="/"
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>+ Submit New Coupon</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-indigo-600 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Claims</span>
            <span className="text-2xl font-black text-slate-900">{counts.total}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-amber-500 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">In Review</span>
            <span className="text-2xl font-black text-amber-600">{counts.pending}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-emerald-500 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Approved</span>
            <span className="text-2xl font-black text-emerald-600">{counts.approved}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-rose-500 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Rejected</span>
            <span className="text-2xl font-black text-rose-600">{counts.rejected}</span>
          </div>
        </div>
      </div>

      {/* Submissions List Container */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200/80">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="p-16">
            <LoadingSpinner text="Retrieving authenticated submissions..." />
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-16 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-7 h-7 rotate-45" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Submissions Found</h3>
            <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
              You haven't submitted any physical coupons under this verified phone number yet.
            </p>
            <Link
              to="/"
              className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs"
            >
              Submit Your First Coupon
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">Reference ID</th>
                  <th className="px-6 py-3.5">Coupon Number</th>
                  <th className="px-6 py-3.5">Submitted Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Actions / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {sub.submissionReference}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {sub.couponNumber}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(sub.submittedAt).toLocaleDateString()} at{' '}
                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleOpenPhoto(sub)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Photo
                        </button>
                        {sub.feedbackRating && (
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            ⭐ {sub.feedbackRating}
                          </span>
                        )}
                        {sub.status === 'Rejected' && sub.rejectionReason && (
                          <span
                            className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-medium"
                            title={sub.rejectionReason}
                          >
                            Reason: {sub.rejectionReason}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination meta={pagination} onPageChange={loadHistory} />
      </div>

      {/* Secure Photo Preview Modal with Animation */}
      <Modal isOpen={!!viewPhotoUrl} onClose={handleClosePhoto} title={photoTitle} maxWidth="xl">
        <div className="flex flex-col items-center justify-center p-2 animate-scale-in">
          {viewPhotoUrl && (
            <img
              src={viewPhotoUrl}
              alt="Uploaded coupon"
              className="max-h-[70vh] rounded-2xl object-contain shadow-xl border border-slate-200"
            />
          )}
          <p className="mt-4 text-xs text-slate-400 font-medium flex items-center gap-1">
            🔒 Securely streamed from verified storage with authenticated customer permissions.
          </p>
        </div>
      </Modal>
    </div>
  );
};
