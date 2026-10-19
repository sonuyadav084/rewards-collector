import React from 'react';
import { SubmissionStatus } from '../../types';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: SubmissionStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const iconSize = isSm ? 12 : 14;

  switch (status) {
    case 'Approved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs ${
            isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
          }`}
        >
          <CheckCircle2 size={iconSize} className="text-emerald-600" />
          Approved
        </span>
      );
    case 'Rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-xs ${
            isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
          }`}
        >
          <XCircle size={iconSize} className="text-rose-600" />
          Rejected
        </span>
      );
    case 'Pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-xs ${
            isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          <Clock size={iconSize} className="text-amber-600" />
          Pending Review
        </span>
      );
  }
};
