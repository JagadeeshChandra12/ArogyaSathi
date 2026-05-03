import React from 'react';

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const HealthStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        <Skeleton className="w-16 h-8 mb-2" />
        <Skeleton className="w-full h-4" />
      </div>
    ))}
  </div>
);

export const ReportCardSkeleton = () => (
  <div className="p-4 border border-gray-200 rounded-2xl space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-24 h-4" />
        </div>
      </div>
      <Skeleton className="w-20 h-6 rounded-full" />
    </div>
    <div className="pt-3 border-t border-gray-100 flex gap-2">
      <Skeleton className="w-16 h-5 rounded-full" />
      <Skeleton className="w-24 h-5 rounded-full" />
    </div>
  </div>
);

export const DashboardWidgetSkeleton = () => (
  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="w-48 h-8" />
      <Skeleton className="w-24 h-10 rounded-xl" />
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="w-full h-20 rounded-2xl" />
      ))}
    </div>
  </div>
);

export default Skeleton;
