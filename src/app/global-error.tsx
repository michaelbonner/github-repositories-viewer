"use client";

import { useEffect } from "react";

// Rendered in place of the root layout when it fails, so globals.css, the
// Inter font and <Nav /> are unavailable. Keep styling inline and
// self-contained.
const styles = {
  body: {
    margin: 0,
    minHeight: "100vh",
    background: "#ffffff",
    color: "#111827",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  main: {
    maxWidth: "80rem",
    margin: "0 auto",
    padding: "3rem 2rem",
  },
  title: { margin: 0, fontSize: "2.25rem", lineHeight: 1.1, fontWeight: 700 },
  text: {
    marginTop: "1rem",
    maxWidth: "36rem",
    color: "#374151",
    lineHeight: 1.5,
  },
  digest: { marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginTop: "2rem",
  },
  primary: {
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "0.375rem",
    background: "#0f172a",
    color: "#ffffff",
    font: "inherit",
    cursor: "pointer",
  },
  secondary: {
    padding: "0.5rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    color: "#111827",
    textDecoration: "none",
  },
} satisfies Record<string, React.CSSProperties>;

export default function GlobalError({
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
    <html lang="en">
      <body style={styles.body}>
        <title>Something went wrong | GitHub Repositories Viewer</title>
        <main style={styles.main}>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.text}>
            GitHub Repositories Viewer couldn&apos;t load. This is usually
            temporary, so try again in a moment.
          </p>
          {digest && (
            <p style={styles.digest}>
              Error reference: <code>{digest}</code>
            </p>
          )}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => retry()}
              style={styles.primary}
            >
              Try again
            </button>
            {/* Full reload on purpose: the app shell itself failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={styles.secondary}>
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
