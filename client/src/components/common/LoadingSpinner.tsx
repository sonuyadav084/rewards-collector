import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 36,
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 gap-2 text-slate-500 ${className}`}>
      <Loader2 size={sizeMap[size]} className="animate-spin text-indigo-600" />
      {text && <p className="text-sm font-medium">{text}</p>}
    </div>
  );
};

