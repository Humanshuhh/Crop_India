import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse" aria-label="Loading dashboard...">
      {/* Welcome Section Skeleton */}
      <div className="h-48 sm:h-56 rounded-3xl bg-stone-200/70 p-6 sm:p-8 border border-stone-200/80 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-8 sm:h-10 w-72 rounded-xl bg-stone-300/80" />
          <div className="h-4 w-64 rounded bg-stone-300/60" />
        </div>
        <div className="flex gap-3">
          <div className="h-7 w-36 rounded-xl bg-stone-300/80" />
          <div className="h-7 w-28 rounded-xl bg-stone-300/80" />
        </div>
      </div>

      {/* 3 Primary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-56 rounded-3xl bg-white border border-stone-200 p-6 space-y-4">
          <div className="h-4 w-28 rounded bg-stone-200" />
          <div className="h-10 w-24 rounded bg-stone-200" />
          <div className="grid grid-cols-2 gap-2 pt-4">
            <div className="h-8 rounded bg-stone-100" />
            <div className="h-8 rounded bg-stone-100" />
          </div>
        </div>
        <div className="h-56 rounded-3xl bg-white border border-stone-200 p-6 space-y-4">
          <div className="h-4 w-28 rounded bg-stone-200" />
          <div className="h-6 w-48 rounded bg-stone-200" />
          <div className="h-12 rounded bg-stone-100" />
        </div>
        <div className="h-56 rounded-3xl bg-white border border-stone-200 p-6 space-y-4">
          <div className="h-4 w-28 rounded bg-stone-200" />
          <div className="h-6 w-48 rounded bg-stone-200" />
          <div className="h-12 rounded bg-stone-100" />
        </div>
      </div>

      {/* 4 Farm Overview Metrics Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-white border border-stone-200 p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-stone-200" />
            <div className="h-8 w-24 rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
};
