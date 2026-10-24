"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined;

  return (
    <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
      <h1 className="text-2xl font-bold sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-xl text-gray-700">
        We hit an unexpected error loading this page. This is usually
        temporary, so try again. If it keeps happening, GitHub may be
        unavailable or your access token may need to be reset.
      </p>
      {digest && (
        <p className="mt-2 text-sm text-gray-500">
          Error reference: <code>{digest}</code>
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-8">
        <button
          type="button"
          onClick={() => retry()}
          className="py-2 px-4 text-white rounded-md bg-slate-900 hover:bg-slate-800"
        >
          Try again
        </button>
        <Link href="/" className="py-2 px-4 rounded-md border hover:bg-gray-50">
          Back to home
        </Link>
      </div>
    </main>
  );
}
