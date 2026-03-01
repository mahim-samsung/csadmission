import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-bold text-gray-100">404</p>
      <h2 className="mt-4 text-2xl font-semibold text-gray-800">Page not found</h2>
      <p className="mt-2 text-sm text-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Go home
      </Link>
    </div>
  );
}
