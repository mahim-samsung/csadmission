"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-red-100 bg-red-50 p-10 shadow-sm">
        <div className="mb-4 text-5xl">⚠️</div>
        <h2 className="text-2xl font-bold text-red-700">Something went wrong</h2>

        {error.message && (
          <p className="mt-2 max-w-md text-sm text-red-600">{error.message}</p>
        )}

        {error.digest && (
          <p className="mt-1 font-mono text-xs text-red-400">
            Error ID: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
