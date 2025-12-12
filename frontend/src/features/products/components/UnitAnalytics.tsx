import React, { useMemo } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Unit } from '@/shared/types';
import { MetricCard } from '@/shared/components/ui/MetricCard';

interface UnitAnalyticsProps {
  units: Unit[];
}

const UnitAnalytics: React.FC<UnitAnalyticsProps> = ({ units }) => {
  const analytics = useMemo(() => {
    const totalUnits = units.length;
    const recentUnits = units.filter(unit => {
      const createdAt = new Date(unit.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt >= thirtyDaysAgo;
    }).length;

    return {
      totalUnits,
      recentUnits,
    };
  }, [units]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي الوحدات"
          value={analytics.totalUnits.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="الوحدات المضافة (آخر 30 يوم)"
          value={analytics.recentUnits.toString()}
          icon={<div className="w-6 h-6 bg-green-500 rounded"></div>}
          bgColor="bg-green-100"
          valueColor="text-green-600"
        />
      </div>
    </div>
  );
};

export default UnitAnalytics;

