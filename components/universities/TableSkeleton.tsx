export function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Filter bar skeleton */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2.5">
          <div className="skeleton h-9 flex-1 min-w-[200px] rounded-lg" />
          <div className="skeleton h-9 w-40 rounded-lg" />
          <div className="skeleton h-9 w-36 rounded-lg" />
          <div className="skeleton h-9 w-44 rounded-lg" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex gap-8">
            {[40, 180, 40, 80, 40, 60, 80].map((w, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />
            ))}
          </div>
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-8 border-b border-slate-50 px-4 py-3.5"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div className="skeleton h-6 w-10 rounded-md" />
            <div className="skeleton h-4 w-48 rounded" />
            <div className="skeleton h-4 w-8 rounded" />
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-4 w-10 rounded" />
            <div className="skeleton h-4 w-12 rounded" />
            <div className="skeleton h-1.5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
