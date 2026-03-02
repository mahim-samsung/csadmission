"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Select } from "@/components/ui/Select";

// ── Type helpers ──────────────────────────────────

interface AdmissionData {
  deadline: Date | null;
  greRequired: boolean | null;
  ieltsRequired: boolean | null;
  ieltsScore: number | null;
  toeflScore: number | null;
  applicationFee: number | null;
  confidenceScore: number;
  needsReview: boolean;
  lastVerifiedAt: Date;
}

interface UniversityRow {
  id: string;
  name: string;
  state: string | null;
  website: string | null;
  csRanking: number;
  csAdmissionUrl: string | null;
  admissions?: AdmissionData[];
}

type SortField = "csRanking" | "name" | "createdAt";
type SortDir = "asc" | "desc";

// ── Constants ─────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const MONTHS = [
  { v: "10", l: "October" }, { v: "11", l: "November" },
  { v: "12", l: "December" }, { v: "1", l: "January" },
  { v: "2", l: "February" }, { v: "3", l: "March" },
];

// Option arrays for custom Select
const GRE_OPTIONS = [
  { value: "", label: "GRE - All" },
  { value: "required", label: "GRE Required" },
  { value: "waived", label: "GRE Waived" },
];

const STATE_OPTIONS = [
  { value: "", label: "All States" },
  ...US_STATES.map(s => ({ value: s, label: s })),
];

const MONTH_OPTIONS = [
  { value: "", label: "Deadline - Any" },
  ...MONTHS.map(m => ({ value: m.v, label: m.l })),
];

// ── Small UI helpers ──────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank <= 10
      ? "bg-brand-700 text-white shadow-sm shadow-brand-900/20"
      : rank <= 25
      ? "bg-brand-100 text-brand-700"
      : rank <= 50
      ? "bg-slate-100 text-slate-600"
      : "bg-slate-50 text-slate-500";
  return (
    <span className={`inline-flex h-6 w-10 items-center justify-center rounded-md text-[11px] font-bold ${cls}`}>
      #{rank}
    </span>
  );
}

function GreBadge({ required }: { required: boolean | null }) {
  if (required === null)
    return <span className="text-slate-300 text-sm">—</span>;
  return required ? (
    <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
      Required
    </span>
  ) : (
    <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
      Waived
    </span>
  );
}

function MiniConfBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.85 ? "bg-emerald-500" : score >= 0.65 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
}

function SortIcon({ active, dir }: { field: string; active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-flex transition-opacity ${active ? "opacity-100 text-brand-600" : "opacity-30"}`}>
      {active && dir === "desc" ? (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8.5L1.5 4h9L6 8.5z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 3.5L10.5 8h-9L6 3.5z" />
        </svg>
      )}
    </span>
  );
}

// ── Main component ────────────────────────────────

export function UniversityTable() {
  // ── Filter state ───────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [greFilter, setGreFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState("");
  const [rankMin, setRankMin] = useState("");
  const [rankMax, setRankMax] = useState("");
  const [deadlineMonth, setDeadlineMonth] = useState("");
  const [sortField, setSortField] = useState<SortField | null>("csRanking");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Query ──────────────────────────────────────
  const greRequired =
    greFilter === "required" ? true : greFilter === "waived" ? false : undefined;

  const { data, isLoading, isError } = api.university.getUniversities.useQuery(
    {
      search: debouncedSearch || undefined,
      greRequired,
      state: stateFilter || undefined,
      rankingRange:
        rankMin || rankMax
          ? {
              min: rankMin ? parseInt(rankMin) : undefined,
              max: rankMax ? parseInt(rankMax) : undefined,
            }
          : undefined,
      includeAdmissions: true,
      orderBy: sortField,
      orderDir: sortDir,
      limit: 150,
    },
    { staleTime: 60_000 },
  );

  // ── Client-side deadline month filter ──────────
  const rows = useMemo<UniversityRow[]>(() => {
    const items = (data?.items ?? []) as UniversityRow[];
    if (!deadlineMonth) return items;
    const month = parseInt(deadlineMonth);
    return items.filter((u) => {
      const adm = u.admissions?.[0];
      if (!adm?.deadline) return false;
      return new Date(adm.deadline).getMonth() + 1 === month;
    });
  }, [data, deadlineMonth]);

  // ── Sort toggle ────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      // If already sorted by this field and direction is desc, reset to default (csRanking asc)
      if (sortDir === "desc") {
        setSortField("csRanking");
        setSortDir("asc");
      } else {
        // Otherwise toggle direction
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    } else {
      // New field - set to asc
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ── Clear all filters ──────────────────────────
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setGreFilter("");
    setStateFilter("");
    setRankMin("");
    setRankMax("");
    setDeadlineMonth("");
  };

  const hasActiveFilters =
    debouncedSearch || greFilter || stateFilter || rankMin || rankMax || deadlineMonth;

  return (
    <div className="animate-in space-y-4">
      {/* ── Filter bar ── */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
            </svg>
            <input
              className="input-base pl-9"
              placeholder="Search universities or state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* GRE filter */}
          <Select
            className="w-40"
            value={greFilter}
            onChange={setGreFilter}
            options={GRE_OPTIONS}
          />

          {/* State filter */}
          <Select
            className="w-36"
            value={stateFilter}
            onChange={setStateFilter}
            options={STATE_OPTIONS}
          />

          {/* Ranking range */}
          <div className="flex items-center gap-1.5">
            <input
              className="input-base w-20 text-center"
              type="number" min={1} placeholder="Rank ≥"
              value={rankMin}
              onChange={(e) => setRankMin(e.target.value)}
            />
            <span className="text-slate-300">–</span>
            <input
              className="input-base w-20 text-center"
              type="number" min={1} placeholder="Rank ≤"
              value={rankMax}
              onChange={(e) => setRankMax(e.target.value)}
            />
          </div>

          {/* Deadline month */}
          <Select
            className="w-44"
            value={deadlineMonth}
            onChange={setDeadlineMonth}
            options={MONTH_OPTIONS}
          />

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
              Clear
            </button>
          )}
        </div>

        {/* Result count */}
        {/* <div className="mt-2.5 flex items-center gap-2 border-t border-slate-50 pt-2.5">
          <span className="text-xs text-slate-400">
            {isLoading ? "Loading…" : `${rows.length} program${rows.length !== 1 ? "s" : ""}`}
            {data && rows.length !== data.total && ` of ${data.total} total`}
          </span>
          {isLoading && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          )}
        </div> */}
      </div>

      {/* ── Table card ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              {/* Sticky header */}
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-white/95 backdrop-blur-sm">
                  {[
                    { label: "Rank", field: "csRanking" as SortField, cls: "w-16 text-center" },
                    { label: "University", field: "name" as SortField, cls: "min-w-[220px]" },
                    { label: "State", field: null, cls: "w-16 hidden sm:table-cell" },
                    { label: "GRE", field: null, cls: "w-28" },
                    { label: "TOEFL", field: null, cls: "w-16 text-right hidden md:table-cell" },
                    { label: "IELTS", field: null, cls: "w-16 text-right hidden md:table-cell" },
                    { label: "Deadline", field: null, cls: "w-24 hidden lg:table-cell" },
                    { label: "Fee", field: null, cls: "w-16 text-right hidden xl:table-cell" },
                    // { label: "Confidence", field: null, cls: "w-28 hidden lg:table-cell" },
                    { label: "", field: null, cls: "w-8" },
                  ].map(({ label, field, cls }) => (
                    <th
                      key={label || "actions"}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${cls} ${field ? "cursor-pointer select-none hover:text-slate-600" : ""}`}
                      onClick={field ? () => toggleSort(field) : undefined}
                    >
                      {field ? (
                        <span className="flex items-center">
                          {label}
                          <SortIcon
                            field={field}
                            active={sortField === field}
                            dir={sortDir}
                          />
                        </span>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {/* Loading skeletons */}
                {isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[16, 200, 40, 80, 40, 40, 60, 40, 80, 20].map((w, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div
                            className="skeleton h-4 rounded"
                            style={{ width: w, opacity: 1 - i * 0.1 }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                {/* Error state */}
                {isError && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">⚠️</span>
                        <p className="text-sm font-medium text-slate-700">Failed to load data</p>
                        <p className="text-xs text-slate-400">Check your database connection</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!isLoading && !isError && rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
                          🎓
                        </div>
                        <p className="text-sm font-medium text-slate-700">No universities found</p>
                        <p className="text-xs text-slate-400">
                          {hasActiveFilters ? "Try adjusting your filters" : "Run the crawler to populate data"}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={clearFilters}
                            className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!isLoading &&
                  rows.map((uni) => {
                    const adm = uni.admissions?.[0];
                    return (
                      <UniversityRow key={uni.id} uni={uni} adm={adm} />
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Row component (memoised) ──────────────────────

function UniversityRow({
  uni,
  adm,
}: {
  uni: UniversityRow;
  adm?: AdmissionData;
}) {
  const router = useRouter();
  const deadline = adm?.deadline
    ? new Date(adm.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  return (
    <tr 
      className="row-hover group cursor-pointer"
      onClick={() => router.push(`/universities/${uni.id}`)}
    >
      {/* Rank */}
      <td className="px-4 py-3.5 text-center">
        <RankBadge rank={uni.csRanking} />
      </td>

      {/* Name */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors duration-150 line-clamp-1">
              {uni.name}
            </div>
            {adm?.needsReview && (
              <span className="badge bg-red-50 text-red-600 ring-1 ring-red-200/60 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                Review needed
              </span>
            )}
          </div>
        </div>
      </td>

      {/* State */}
      <td className="hidden px-4 py-3.5 sm:table-cell">
        <span className="text-xs font-medium text-slate-500">{uni.state ?? "—"}</span>
      </td>

      {/* GRE */}
      <td className="px-4 py-3.5">
        <GreBadge required={adm?.greRequired ?? null} />
      </td>

      {/* TOEFL */}
      <td className="hidden px-4 py-3.5 text-right md:table-cell">
        <span className="tabular-nums text-slate-700">
          {adm?.toeflScore ?? <span className="text-slate-300">—</span>}
        </span>
      </td>

      {/* IELTS */}
      <td className="hidden px-4 py-3.5 text-right md:table-cell">
        <span className="tabular-nums text-slate-700">
          {adm?.ieltsScore ?? <span className="text-slate-300">—</span>}
        </span>
      </td>

      {/* Deadline */}
      <td className="hidden px-4 py-3.5 lg:table-cell">
        <span className={`text-sm font-medium ${adm?.deadline ? "text-slate-800" : "text-slate-300"}`}>
          {deadline}
        </span>
      </td>

      {/* Fee */}
      <td className="hidden px-4 py-3.5 text-right xl:table-cell">
        <span className="tabular-nums text-slate-700">
          {adm?.applicationFee
            ? `$${adm.applicationFee}`
            : <span className="text-slate-300">—</span>}
        </span>
      </td>

      {/* Confidence */}
      {/* <td className="hidden px-4 py-3.5 lg:table-cell">
        {adm ? (
          <MiniConfBar score={adm.confidenceScore} />
        ) : (
          <span className="text-xs text-slate-300">No data</span>
        )}
      </td> */}

      {/* Link arrow */}
      <td className="px-3 py-3.5">
        <svg
          className="h-4 w-4 text-slate-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-brand-600"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </td>
    </tr>
  );
}
