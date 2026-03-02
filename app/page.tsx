import { Suspense } from "react";
import { UniversityTable } from "@/components/universities/UniversityTable";
import { TableSkeleton } from "@/components/universities/TableSkeleton";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  Live data
                </span>
                <span className="text-xs text-slate-400">Updated weekly by AI crawler</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">
                CS PhD Admission Requirements
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ranked programs with deadlines, test scores, and fees.
              </p>
            </div>

            <div className="mt-4 flex items-center gap-6 sm:mt-0 sm:text-right">
              {[
                { label: "Universities", value: "200+" },
                { label: "Verified", value: "Weekly" },
                { label: "Built by", value: "Mahim" },
              ].map((s) => (
                <div key={s.label} className="text-center sm:text-right">
                  <div className="text-lg font-bold text-brand-900">{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Suspense fallback={<TableSkeleton />}>
          <UniversityTable />
        </Suspense>
      </div>
    </div>
  );
}
