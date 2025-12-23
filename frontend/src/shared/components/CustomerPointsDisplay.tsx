import React, { useEffect, useState } from 'react';
import { pointsApi } from '../../lib/api/client';
import { useCurrency } from '../contexts/CurrencyContext';

// Simple Star icon component
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

interface CustomerPointsDisplayProps {
  customerId?: string;
  customerPhone?: string;
  customerEmail?: string;
  className?: string;
  showLabel?: boolean;
  showMonetaryValue?: boolean; // New prop to show/hide monetary value
}

export const CustomerPointsDisplay: React.FC<CustomerPointsDisplayProps> = ({
  customerId,
  customerPhone,
  customerEmail,
  className = '',
  showLabel = true,
  showMonetaryValue = true, // Default to showing monetary value
}) => {
  const { formatCurrency } = useCurrency();
  const [points, setPoints] = useState<number | null>(null);
  const [pointsValuePerPoint, setPointsValuePerPoint] = useState<number>(0.01);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPoints = async () => {
      if (!customerId && !customerPhone && !customerEmail) {
        setPoints(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params: any = {};
        if (customerId) params.customerId = customerId;
        if (customerPhone) params.phone = customerPhone;
        if (customerEmail) params.email = customerEmail;

        const response = await pointsApi.getCustomerPoints(params);

        if (response.data.success) {
          setPoints(response.data.data.balance.availablePoints);
          // Get pointsValuePerPoint from API response
          if (response.data.data.pointsValuePerPoint !== undefined) {
            setPointsValuePerPoint(response.data.data.pointsValuePerPoint);
          }
        } else {
          setError('فشل تحميل النقاط');
        }
      } catch (err: any) {
        // Don't show error if customer doesn't have points yet
        if (err?.response?.status !== 404) {
          setError('فشل تحميل النقاط');
        }
        setPoints(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadPoints();
  }, [customerId, customerPhone, customerEmail]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 text-gray-500 ${className}`}>
        <span className="text-sm">...</span>
      </div>
    );
  }

  if (error) {
    return null; // Don't show error, just hide component
  }

  if (points === null || points === 0) {
    return null; // Don't show if no points
  }

  const monetaryValue = points * pointsValuePerPoint;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <StarIcon className="w-4 h-4 text-yellow-500" />
      {showLabel && <span className="text-xs text-gray-600 dark:text-gray-400">النقاط:</span>}
      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
        {points}
      </span>
      {showMonetaryValue && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({formatCurrency(monetaryValue)})
        </span>
      )}
    </div>
  );
};

