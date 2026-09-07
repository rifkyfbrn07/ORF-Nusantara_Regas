/** Shared skeleton shown while dashboard pages stream their data */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat data">
      {/* Page heading skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="h-3 w-40 rounded skeleton-regas" />
        <div className="h-6 w-64 rounded skeleton-regas" />
        <div className="h-3 w-48 rounded skeleton-regas" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
            <div className="h-3 w-16 rounded skeleton-regas" />
            <div className="h-7 w-10 rounded skeleton-regas" />
            <div className="h-2.5 w-14 rounded skeleton-regas" />
          </div>
        ))}
      </div>

      {/* Content panel skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">Memuat data operasional dari server...</p>
    </div>
  );
}
