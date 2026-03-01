"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/client";

// ── Helpers ───────────────────────────────────────

function fmt(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtDeadline(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank <= 10
      ? "bg-brand-700 text-white shadow-sm shadow-brand-900/20"
      : rank <= 25
      ? "bg-brand-100 text-brand-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${cls}`}>
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
        />
      </svg>
      #{rank} CS Ranking
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${accent ? "bg-brand-100" : "bg-slate-50"}`}
        >
          {icon}
        </span>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${accent ? "text-brand-700" : "text-slate-900"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.85
      ? "from-emerald-400 to-emerald-600"
      : score >= 0.65
      ? "from-amber-400 to-amber-600"
      : "from-red-400 to-red-600";
  const label =
    score >= 0.85 ? "High confidence" : score >= 0.65 ? "Moderate confidence" : "Low confidence";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-800">Data Confidence</span>
          <span className="ml-2 text-xs text-slate-400">{label}</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-slate-900">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>0%</span>
        <span className="text-amber-500">65% threshold</span>
        <span className="text-emerald-500">85% high</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────

export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: university, isLoading, isError } = api.university.getUniversityById.useQuery(
    { id },
    { enabled: !!id },
  );

  // ── Loading ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen animate-pulse bg-slate-50">
        <div className="border-b border-slate-100 bg-white px-6 py-8">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-9 w-80 rounded-lg" />
            <div className="flex gap-2">
              <div className="skeleton h-7 w-32 rounded-lg" />
              <div className="skeleton h-7 w-24 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton mb-3 h-3 w-20 rounded" />
                <div className="skeleton h-8 w-28 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────
  if (isError || !university) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">🎓</div>
        <h2 className="text-xl font-bold text-slate-800">University not found</h2>
        <p className="text-sm text-slate-500">
          This record may have been removed or the ID is invalid.
        </p>
        <Link href="/" className="btn-primary text-sm">
          ← Back to rankings
        </Link>
      </div>
    );
  }

  const adm = university.admissions[0];

  // ── Page ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero header ── */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {/* Breadcrumb */}
          <button
            onClick={() => router.back()}
            className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-brand-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            All universities
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {university.name}
              </h1>

              {/* Badges row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RankBadge rank={university.csRanking} />
                {university.state && (
                  <span className="badge bg-slate-100 text-slate-600">
                    📍 {university.state}
                  </span>
                )}
                {adm?.needsReview && (
                  <span className="badge bg-red-50 text-red-600 ring-1 ring-red-200/80">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 inline-block" />
                    Needs Review
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {university.website && (
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs"
                >
                  Website
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}
              {university.csAdmissionUrl && (
                <a
                  href={university.csAdmissionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs"
                >
                  Official Admissions Page
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* No admission data banner */}
        {!adm && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4">
            <span className="text-2xl">🔍</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">No admission data yet</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Trigger the crawler to extract requirements from the official admissions page.
              </p>
            </div>
          </div>
        )}

        {/* Needs review warning */}
        {adm?.needsReview && (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Needs Manual Review</p>
              <p className="text-xs text-red-600 mt-0.5">
                The AI extraction produced low-confidence results for this program. Verify data against the official admissions page before relying on it.
              </p>
            </div>
          </div>
        )}

        {/* ── Admission metric cards ── */}
        {adm && (
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Admission Requirements
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <MetricCard
                icon="📅"
                label="Application Deadline"
                value={fmtDeadline(adm.deadline)}
                sub="Fall semester"
                accent={!!adm.deadline}
              />
              <MetricCard
                icon="📝"
                label="GRE Exam"
                value={
                  adm.greRequired === true
                    ? "Required"
                    : adm.greRequired === false
                    ? "Waived"
                    : "Unknown"
                }
                sub={
                  adm.greRequired === true
                    ? "General exam required"
                    : adm.greRequired === false
                    ? "GRE not required"
                    : "Not specified"
                }
                accent={adm.greRequired === false}
              />
              <MetricCard
                icon="🌐"
                label="TOEFL (iBT)"
                value={adm.toeflScore !== null ? `${adm.toeflScore}` : "—"}
                sub={adm.toeflScore ? "Minimum total score" : "Not specified"}
              />
              <MetricCard
                icon="🇬🇧"
                label="IELTS"
                value={adm.ieltsScore !== null ? `${adm.ieltsScore}` : "—"}
                sub={
                  adm.ieltsScore
                    ? `Band ${adm.ieltsScore} minimum`
                    : adm.ieltsRequired === false
                    ? "Not accepted"
                    : "Not specified"
                }
              />
              <MetricCard
                icon="💳"
                label="Application Fee"
                value={adm.applicationFee !== null ? `$${adm.applicationFee}` : "—"}
                sub={adm.applicationFee ? "USD, non-refundable" : "Not specified"}
              />
              <MetricCard
                icon="🗓"
                label="Last Verified"
                value={fmt(adm.lastVerifiedAt)}
                sub="By AI crawler"
              />
            </div>
          </div>
        )}

        {/* ── Confidence score ── */}
        {adm && (
          <div className="card p-6">
            <ConfidenceBar score={adm.confidenceScore} />
          </div>
        )}

        {/* ── All admission records (history) ── */}
        {university.admissions.length > 1 && (
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Verification History
            </h2>
            <div className="card divide-y divide-slate-50">
              {university.admissions.map((rec, i) => (
                <div key={rec.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <div className="flex items-center gap-3">
                    {i === 0 && (
                      <span className="badge bg-brand-100 text-brand-700">Latest</span>
                    )}
                    <span className="text-slate-600">{fmt(rec.lastVerifiedAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      Confidence:{" "}
                      <span className="font-semibold text-slate-700">
                        {Math.round(rec.confidenceScore * 100)}%
                      </span>
                    </span>
                    {rec.needsReview && (
                      <span className="badge bg-red-50 text-red-600">Review</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Programs ── */}
        {university.programs.length > 0 && (
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Programs
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {university.programs.map((prog) => (
                <div key={prog.id} className="card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{prog.name}</div>
                      {prog.department && (
                        <div className="text-xs text-slate-500 mt-0.5">{prog.department}</div>
                      )}
                    </div>
                    <span className="badge bg-slate-100 text-slate-600 flex-shrink-0">
                      {prog.degree}
                    </span>
                  </div>
                  {prog.deadline && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5" />
                      </svg>
                      Deadline: {fmtDeadline(prog.deadline)}
                    </div>
                  )}
                  {prog.url && (
                    <a
                      href={prog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                    >
                      Program page
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
