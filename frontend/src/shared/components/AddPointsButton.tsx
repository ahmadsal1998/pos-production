import React, { useState } from 'react';
import { pointsApi } from '../../lib/api/client';
import { CheckCircleIcon } from '@/shared/constants';

// Simple X icon component
const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface AddPointsButtonProps {
  invoiceNumber: string;
  customerId: string;
  customerPhone?: string;
  purchaseAmount: number;
  onSuccess?: (points: number, newBalance: number) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const AddPointsButton: React.FC<AddPointsButtonProps> = ({
  invoiceNumber,
  customerId,
  customerPhone,
  purchaseAmount,
  onSuccess,
  onError,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const handleAddPoints = async () => {
    if (isLoading || isSuccess) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await pointsApi.addPoints({
        invoiceNumber,
        customerId,
        purchaseAmount,
      });

      if (response.data.success) {
        const points = response.data.data.transaction.points;
        const balance = response.data.data.balance.availablePoints;
        setPointsEarned(points);
        setNewBalance(balance);
        setIsSuccess(true);
        onSuccess?.(points, balance);
      } else {
        throw new Error(response.data.message || 'Failed to add points');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'فشل إضافة النقاط';
      
      // Don't show error for validation issues (amount too small, etc.) - just don't display error
      const isValidationError = errorMessage.includes('too small') || 
                                 errorMessage.includes('minimum') ||
                                 errorMessage.includes('Purchase amount');
      
      if (!isValidationError) {
        setError(errorMessage);
        onError?.(errorMessage);
      } else {
        // For validation errors, just silently fail (don't show error UI)
        // The button will remain visible but disabled if amount is too small
        console.log('Points not added:', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess && pointsEarned !== null) {
    return (
      <div className={`flex items-center gap-2 text-green-600 dark:text-green-400 ${className}`}>
        <CheckCircleIcon className="w-5 h-5" />
        <span className="text-sm font-medium">
          تم إضافة {pointsEarned} نقطة! الرصيد الحالي: {newBalance}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-600 dark:text-red-400 ${className}`}>
        <XCircleIcon className="w-5 h-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleAddPoints}
      disabled={isLoading || !customerId || purchaseAmount <= 0}
      className={`
        px-4 py-2 rounded-lg font-medium text-sm
        transition-colors duration-200
        ${isLoading
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? 'جاري الإضافة...' : 'إضافة نقاط'}
    </button>
  );
};

