import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { CouponSubmission, PaginationMeta, SubmissionStatus } from '../../types';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { triggerCelebrationConfetti } from '../../utils/confetti';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  Smartphone,
  User,
  Ticket,
  Sparkles,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const AdminSubmissionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [submissions, setSubmissions] = useState<CouponSubmission[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    totalPages: 1,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  // Review Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<CouponSubmission | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<'Approved' | 'Rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReviewCopied, setIsReviewCopied] = useState(false);

  const handleCopyReviewText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsReviewCopied(true);
    setTimeout(() => setIsReviewCopied(false), 2000);
  };

  const fetchSubmissions = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSubmissions({
        page,
        limit: 15,
        search: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSubmissions(res.data.submissions);
      setPagination(res.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load submissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubmissions(1);
  };

  // Open Review Details Modal
  const handleOpenReview = async (sub: CouponSubmission) => {
    setSelectedSubmission(sub);
    setActionStatus(null);
    setRejectionReason(sub.rejectionReason || '');
    setReviewNotes(sub.reviewNotes || '');
    setActionError(null);
    setIsReviewCopied(false);
    setPhotoLoading(true);

    try {
      const blob = await adminApi.getPhotoBlobUrl(sub._id);
      setPhotoBlobUrl(blob);
    } catch {
      setPhotoBlobUrl(null);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCloseReview = () => {
    if (photoBlobUrl) URL.revokeObjectURL(photoBlobUrl);
    setPhotoBlobUrl(null);
    setSelectedSubmission(null);
    setIsReviewCopied(false);
  };

  // Execute Review Status Update
  const handleConfirmStatus = async () => {
    if (!selectedSubmission || !actionStatus) return;

    if (actionStatus === 'Rejected' && !rejectionReason.trim()) {
      setActionError('A rejection reason is strictly required when rejecting a coupon submission.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await adminApi.updateSubmissionStatus(selectedSubmission._id, {
        status: actionStatus,
        rejectionReason: actionStatus === 'Rejected' ? rejectionReason.trim() : undefined,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      // Update local item
      setSubmissions((prev) =>
        prev.map((s) => (s._id === selectedSubmission._id ? res.data : s))
      );
      setSelectedSubmission(res.data);
      setActionStatus(null);

      // Trigger confetti on approval!
      if (actionStatus === 'Approved') {
        triggerCelebrationConfetti();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update review status.');
    } finally {
      setActionLoading(false);
    }
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
                Submissions Review
              </h1>
            </div>
            <button
              onClick={() => fetchSubmissions(pagination.page)}
              disabled={isLoading}
              className="p-2.5 glass-card hover:bg-slate-50 text-slate-600 rounded-2xl transition-all shadow-xs self-start sm:self-auto"
              title="Refresh submissions"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          {/* Filters Bar with Glassmorphic Card */}
          <div className="glass-card p-4 sm:p-6 rounded-3xl shadow-sm space-y-4 border border-slate-200/80">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer name, mobile, coupon number, or reference ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-slate-100">
              {/* Status Tabs with Smooth Hover */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {['', 'Pending', 'Approved', 'Rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {status === '' ? 'All Statuses' : status}
                  </button>
                ))}
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date:
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-slate-700 bg-white"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-slate-700 bg-white"
                />
                <button
                  type="button"
                  onClick={() => fetchSubmissions(1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Submissions Table with Glass Card Container */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-lg border border-slate-200/80">
            {error && (
              <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="p-16">
                <LoadingSpinner text="Loading submissions..." />
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-16 text-center animate-fade-in">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-float" />
                <h3 className="text-sm font-bold text-slate-700">No submissions found</h3>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-5 py-4">Reference ID</th>
                      <th className="px-5 py-4">Customer Name</th>
                      <th className="px-5 py-4">Coupon Number</th>
                      <th className="px-5 py-4">User Feedback</th>
                      <th className="px-5 py-4">Submitted</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {submissions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-5 py-4 font-mono font-black text-indigo-700 whitespace-nowrap">
                          {sub.submissionReference}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">
                          {sub.customerName}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                            {sub.couponNumber}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {sub.feedbackRating ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              sub.feedbackRating === 'Excellent'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : sub.feedbackRating === 'Better'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              {sub.feedbackRating}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs">
                          {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={sub.status} size="sm" />
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenReview(sub)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination meta={pagination} onPageChange={(p) => fetchSubmissions(p)} />
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* REVIEW & DETAIL MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={handleCloseReview}
        title={selectedSubmission ? `Submission: ${selectedSubmission.submissionReference}` : 'Submission Details'}
        maxWidth="2xl"
      >
        {selectedSubmission && (
          <div className="space-y-6 animate-scale-in">
            
            {actionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 p-4.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 block text-xs font-semibold">Customer Name</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {selectedSubmission.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-semibold">Verified Phone</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedSubmission.customerMobile}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-semibold">Coupon Number</span>
                <span className="font-mono font-black text-indigo-700 flex items-center gap-1.5 mt-0.5">
                  <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                  {selectedSubmission.couponNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-semibold">Current Lifecycle Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedSubmission.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Customer Experience & Feedback Section */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-slate-50 border border-amber-200/80 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Customer Feedback & Drink Review
                </span>
                <div className="flex items-center gap-2">
                  {selectedSubmission.feedbackRating && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      selectedSubmission.feedbackRating === 'Excellent'
                        ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                        : selectedSubmission.feedbackRating === 'Better'
                        ? 'bg-blue-100/90 text-blue-800 border-blue-300'
                        : 'bg-amber-100/90 text-amber-800 border-amber-300'
                    }`}>
                      ⭐ {selectedSubmission.feedbackRating}
                    </span>
                  )}
                  {selectedSubmission.feedbackComment && (
                    <button
                      type="button"
                      onClick={() => handleCopyReviewText(selectedSubmission.feedbackComment!)}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-800 border border-slate-300 hover:border-amber-400 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Copy customer review to clipboard"
                    >
                      {isReviewCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-600" />
                          <span>Copy Review</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {selectedSubmission.feedbackComment ? (
                <div className="relative">
                  <p className="text-xs sm:text-sm text-slate-800 bg-white/95 p-3.5 rounded-xl border border-amber-100/80 leading-relaxed shadow-2xs select-all font-medium">
                    "{selectedSubmission.feedbackComment}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No written comment provided.</p>
              )}
            </div>

            {/* Photo Section with Zoom Card */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Uploaded Physical Coupon Photo</span>
              <div className="border border-slate-200 rounded-2xl p-2.5 bg-slate-900/5 flex items-center justify-center min-h-[230px] overflow-hidden">
                {photoLoading ? (
                  <LoadingSpinner text="Streaming secure image..." />
                ) : photoBlobUrl ? (
                  <img
                    src={photoBlobUrl}
                    alt="Coupon inspection"
                    className="max-h-72 rounded-xl object-contain shadow-md hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-medium">No image available</span>
                )}
              </div>
            </div>

            {/* Review History / Details */}
            {selectedSubmission.reviewedAt && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Review History:</span>
                </div>
                <p className="text-slate-600">
                  Reviewed on {new Date(selectedSubmission.reviewedAt).toLocaleString()}
                </p>
                {selectedSubmission.reviewNotes && (
                  <p className="text-slate-600 font-medium">
                    Notes: {selectedSubmission.reviewNotes}
                  </p>
                )}
                {selectedSubmission.rejectionReason && (
                  <p className="text-rose-700 font-bold">
                    Rejection Reason: {selectedSubmission.rejectionReason}
                  </p>
                )}
              </div>
            )}

            {/* Decision Controls */}
            {!actionStatus ? (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionStatus('Rejected')}
                  className="px-4 py-2.5 border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Submission
                </button>
                <button
                  type="button"
                  onClick={() => setActionStatus('Approved')}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-200/40 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Submission
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/60 space-y-3.5 animate-scale-in">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  Confirm {actionStatus} Decision
                </h4>

                {actionStatus === 'Rejected' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rejection Reason (Required for Declining) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Coupon photo blurry, printed number mismatch..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Review Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Audit trail note..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionStatus(null)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirmStatus}
                    className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                      actionStatus === 'Approved'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95'
                    }`}
                  >
                    {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Confirm {actionStatus}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </Modal>
    </div>
  );
};
