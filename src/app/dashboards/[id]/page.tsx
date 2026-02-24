"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { decrypt } from "../../lib/decrypt";
import Link from "next/link";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import type { GithubCommit } from "@/types/GithubCommit";
import type { GithubIssue } from "@/types/GithubIssue";

type PullRequest = {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
  merged_at: string | null;
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
};

type RepoActivity = {
  repoFullName: string;
  commits: GithubCommit[];
  pulls: PullRequest[];
  issues: GithubIssue[];
};

type ActivityData = {
  repos: RepoActivity[];
  since: string;
  until: string;
};

type Dashboard = {
  id: string;
  name: string;
  repositories: { id: string; repoFullName: string }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRepoUrl(repoFullName: string) {
  return `https://github.com/${repoFullName}`;
}

function StateBadge({ state, mergedAt }: { state: string; mergedAt?: string | null }) {
  const isMerged = mergedAt != null;
  const label = isMerged ? "merged" : state;
  const colors: Record<string, string> = {
    open: "bg-green-100 text-green-800",
    closed: "bg-red-100 text-red-800",
    merged: "bg-purple-100 text-purple-800",
  };
  return (
    <span
      className={`inline-block py-0.5 px-2 text-xs rounded-full font-medium ${colors[label] ?? "bg-gray-100 text-gray-800"}`}
    >
      {label}
    </span>
  );
}

function RepoSection({ repo }: { repo: RepoActivity }) {
  const [open, setOpen] = useState(true);
  const total =
    repo.commits.length + repo.pulls.length + repo.issues.length;

  return (
    <div className="border rounded-md">
      <div className="flex justify-between items-center px-4 py-3">
        <a
          href={getRepoUrl(repo.repoFullName)}
          target="_blank"
          rel="noreferrer"
          className="font-semibold hover:underline"
        >
          {repo.repoFullName}
        </a>
        <button
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`Toggle ${repo.repoFullName} activity`}
        >
          {total} item{total !== 1 ? "s" : ""} {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 grid gap-6">
          {/* Commits */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">
              Commits ({repo.commits.length})
            </h4>
            {repo.commits.length === 0 ? (
              <p className="text-sm text-gray-500">No commits in this period.</p>
            ) : (
              <ul className="grid gap-2">
                {repo.commits.map((c) => (
                  <li key={c.sha} className="flex items-start gap-3 text-sm">
                    {c.author?.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.author.avatar_url}
                        alt={c.author.login}
                        className="w-6 h-6 rounded-full mt-0.5 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline line-clamp-2"
                      >
                        {c.commit.message.split("\n")[0]}
                      </a>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {c.author?.login ?? c.commit.author.name} ·{" "}
                        {formatDate(c.commit.author.date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pull Requests */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">
              Pull Requests ({repo.pulls.length})
            </h4>
            {repo.pulls.length === 0 ? (
              <p className="text-sm text-gray-500">No pull requests in this period.</p>
            ) : (
              <ul className="grid gap-2">
                {repo.pulls.map((pr) => (
                  <li key={pr.id} className="flex items-start gap-3 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pr.user.avatar_url}
                      alt={pr.user.login}
                      className="w-6 h-6 rounded-full mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        {pr.title}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StateBadge state={pr.state} mergedAt={pr.merged_at} />
                        <span className="text-xs text-gray-500">
                          {pr.user.login} · {formatDate(pr.updated_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Issues */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">
              Issues ({repo.issues.length})
            </h4>
            {repo.issues.length === 0 ? (
              <p className="text-sm text-gray-500">No issues in this period.</p>
            ) : (
              <ul className="grid gap-2">
                {repo.issues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-3 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={issue.user.avatar_url}
                      alt={issue.user.login}
                      className="w-6 h-6 rounded-full mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        {issue.title}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StateBadge state={issue.state} />
                        <span className="text-xs text-gray-500">
                          {issue.user.login} · {formatDate(issue.updated_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [since, setSince] = useState(sevenDaysAgo);
  const [until, setUntil] = useState(today);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [selectedContributor, setSelectedContributor] = useState("");
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = () => {
      const raw = localStorage.getItem("githubRepositoriesViewer-accessToken");
      if (raw) {
        const decrypted = decrypt(raw);
        if (decrypted) setToken(decrypted);
      }
      setTokenChecked(true);
    };
    checkToken();
    const interval = setInterval(checkToken, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token || !id) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/dashboards/${id}`, {
          headers: { Authorization: `token ${token}` },
        });
        if (!res.ok) throw new Error("Dashboard not found");
        const data = await res.json();
        setDashboard(data);
      } catch (e) {
        setDashboardError(e instanceof Error ? e.message : "Unknown error");
      }
    };
    fetchDashboard();
  }, [token, id]);

  const loadActivity = async () => {
    if (!token) return;
    setIsLoadingActivity(true);
    setActivityError(null);
    setSummary(null);
    try {
      const params = new URLSearchParams({
        since: new Date(since).toISOString(),
        until: new Date(until + "T23:59:59").toISOString(),
      });
      const res = await fetch(`/api/dashboards/${id}/activity?${params}`, {
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load activity");
      const data: ActivityData = await res.json();
      setActivity(data);
      setSelectedContributor("");
    } catch (e) {
      setActivityError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const generateSummary = async () => {
    if (!filteredActivity || !token) return;
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/dashboards/${id}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${token}`,
        },
        body: JSON.stringify({
          activity: filteredActivity,
          since: filteredActivity.since,
          until: filteredActivity.until,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate summary");
      }
      const data = await res.json();
      setSummary(data.summary);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const contributorOptions = useMemo(() => {
    if (!activity) return [];

    const contributors = new Set<string>();
    for (const repo of activity.repos) {
      for (const commit of repo.commits) {
        if (commit.author?.login) contributors.add(commit.author.login);
      }
      for (const pr of repo.pulls) {
        if (pr.user.login) contributors.add(pr.user.login);
      }
      for (const issue of repo.issues) {
        if (issue.user.login) contributors.add(issue.user.login);
      }
    }

    return Array.from(contributors).sort((a, b) => a.localeCompare(b));
  }, [activity]);

  const filteredActivity = useMemo(() => {
    if (!activity) return null;
    if (!selectedContributor) return activity;

    const repos = activity.repos
      .map((repo) => {
        const commits = repo.commits.filter(
          (commit) => commit.author?.login === selectedContributor,
        );
        const pulls = repo.pulls.filter(
          (pr) => pr.user.login === selectedContributor,
        );
        const issues = repo.issues.filter(
          (issue) => issue.user.login === selectedContributor,
        );
        return { ...repo, commits, pulls, issues };
      })
      .filter((repo) => repo.commits.length + repo.pulls.length + repo.issues.length > 0);

    return { ...activity, repos };
  }, [activity, selectedContributor]);

  if (!tokenChecked) {
    return (
      <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
        <p className="text-orange-600">Sign in to view this dashboard.</p>
      </main>
    );
  }

  if (dashboardError) {
    return (
      <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
        <p className="text-red-700">{dashboardError}</p>
        <Link href="/dashboards" className="text-sm text-blue-600 underline mt-2 inline-block">
          ← Back to dashboards
        </Link>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
      <div className="mb-6">
        <Link href="/dashboards" className="text-sm text-gray-500 hover:text-gray-900">
          ← Dashboards
        </Link>
        <h1 className="text-2xl font-bold sm:text-4xl mt-2">{dashboard.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {dashboard.repositories.length} repo
          {dashboard.repositories.length !== 1 ? "s" : ""}:{" "}
          {dashboard.repositories.map((r, index) => (
            <span key={r.id}>
              <a
                href={getRepoUrl(r.repoFullName)}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {r.repoFullName}
              </a>
              {index < dashboard.repositories.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>

      {/* Date range controls */}
      <div className="flex flex-wrap gap-4 items-end mb-6 p-4 border rounded-md">
        <div>
          <label className="text-sm font-bold block mb-1" htmlFor="since">
            Since
          </label>
          <input
            id="since"
            type="date"
            className="py-2 px-3 leading-tight text-gray-700 rounded-sm border appearance-none focus:outline-hidden focus:shadow-outline"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-bold block mb-1" htmlFor="until">
            Until
          </label>
          <input
            id="until"
            type="date"
            className="py-2 px-3 leading-tight text-gray-700 rounded-sm border appearance-none focus:outline-hidden focus:shadow-outline"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
        </div>
        <button
          className="py-2 px-4 text-white rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
          onClick={loadActivity}
          disabled={isLoadingActivity}
        >
          {isLoadingActivity ? "Loading..." : "Load Activity"}
        </button>
      </div>

      {activityError && (
        <p className="text-red-700 mb-4">{activityError}</p>
      )}

      {activity && (
        <>
          <div className="mb-4">
            <label className="text-sm font-bold block mb-1" htmlFor="contributor">
              Contributor
            </label>
            <select
              id="contributor"
              className="py-2 px-3 leading-tight text-gray-700 rounded-sm border bg-white focus:outline-hidden focus:shadow-outline"
              value={selectedContributor}
              onChange={(e) => {
                setSelectedContributor(e.target.value);
                setSummary(null);
                setSummaryError(null);
              }}
            >
              <option value="">All contributors</option>
              {contributorOptions.map((contributor) => (
                <option key={contributor} value={contributor}>
                  {contributor}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 mb-6">
            {filteredActivity?.repos.map((repo) => (
              <RepoSection key={repo.repoFullName} repo={repo} />
            ))}
          </div>

          {filteredActivity && filteredActivity.repos.length === 0 && (
            <p className="text-sm text-gray-500 mb-6">
              No activity found for contributor <span className="font-medium">{selectedContributor}</span> in this date range.
            </p>
          )}

          <div className="flex items-center gap-4 mb-6">
            <button
              className="py-2 px-4 text-white rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              onClick={generateSummary}
              disabled={isGeneratingSummary || !filteredActivity || filteredActivity.repos.length === 0}
            >
              {isGeneratingSummary ? "Generating..." : "Generate Summary"}
            </button>
            {summaryError && (
              <p className="text-sm text-red-700">{summaryError}</p>
            )}
          </div>

          {summary && (
            <div className="p-4 border rounded-md bg-gray-50">
              <h2 className="text-lg font-semibold mb-3">AI Summary</h2>
              <div className="prose prose-sm max-w-none">
                <Streamdown>{summary}</Streamdown>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
