import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | GitHub Repositories Viewer",
};

export default function NotFound() {
  return (
    <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
      <p className="text-sm font-medium text-gray-500">404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-4xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-gray-700">
        We couldn&apos;t find that page. It may have been moved, or the link
        might be mistyped. If you were looking for a dashboard, it may have
        been deleted.
      </p>
      <div className="flex flex-wrap gap-2 mt-8">
        <Link
          href="/"
          className="py-2 px-4 text-white rounded-md bg-slate-900 hover:bg-slate-800"
        >
          View repositories
        </Link>
        <Link
          href="/dashboards"
          className="py-2 px-4 rounded-md border hover:bg-gray-50"
        >
          Go to dashboards
        </Link>
      </div>
    </main>
  );
}
