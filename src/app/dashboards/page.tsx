"use client";

import { useEffect, useState } from "react";
import { decrypt } from "../lib/decrypt";
import Link from "next/link";

type DashboardRepo = {
  id: string;
  dashboardId: string;
  repoFullName: string;
};

type Dashboard = {
  id: string;
  name: string;
  githubUsername: string;
  createdAt: string;
  updatedAt: string;
  repositories: DashboardRepo[];
};

type GithubRepository = {
  id: number;
  full_name: string;
};

export default function DashboardsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [userRepos, setUserRepos] = useState<GithubRepository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [manualRepo, setManualRepo] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!token) return;
    fetchDashboards();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboards = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboards", {
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load dashboards");
      const data = await res.json();
      setDashboards(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm("Delete this dashboard?")) return;
    try {
      const res = await fetch(`/api/dashboards/${id}`, {
        method: "DELETE",
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete dashboard");
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert("Failed to delete dashboard");
    }
  };

  const openCreateForm = async () => {
    setIsCreating(true);
    setNewName("");
    setSelectedRepos(new Set());
    setManualRepo("");
    setRepoSearch("");

    if (!token) return;
    setIsLoadingRepos(true);
    try {
      const res = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=100",
        { headers: { Authorization: `token ${token}` } },
      );
      if (res.ok) {
        const data: GithubRepository[] = await res.json();
        setUserRepos(Array.isArray(data) ? data : []);
      }
    } catch {
      // fall back to manual entry
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const toggleRepo = (fullName: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const addManualRepo = () => {
    const trimmed = manualRepo.trim();
    if (!trimmed) return;
    setSelectedRepos((prev) => new Set(prev).add(trimmed));
    setManualRepo("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          repositories: Array.from(selectedRepos),
        }),
      });
      if (!res.ok) throw new Error("Failed to create dashboard");
      setIsCreating(false);
      await fetchDashboards();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRepos = userRepos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  if (!tokenChecked) {
    return (
      <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
        <h1 className="text-2xl font-bold sm:text-4xl">Dashboards</h1>
        <p className="mt-8 text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
        <h1 className="text-2xl font-bold sm:text-4xl">Dashboards</h1>
        <p className="mt-8 text-orange-600">Sign in to manage dashboards.</p>
      </main>
    );
  }

  return (
    <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold sm:text-4xl">Dashboards</h1>
        {!isCreating && (
          <button
            className="py-2 px-4 text-white rounded-md bg-slate-900 hover:bg-slate-800"
            onClick={openCreateForm}
          >
            New Dashboard
          </button>
        )}
      </div>

      {isCreating && (
        <form
          className="mt-8 p-4 border rounded-md"
          onSubmit={handleCreate}
        >
          <h2 className="text-lg font-semibold mb-4">Create Dashboard</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-bold block mb-1" htmlFor="dashName">
                Name
              </label>
              <input
                id="dashName"
                className="py-2 px-3 w-full leading-tight text-gray-700 rounded-sm border appearance-none focus:outline-hidden focus:shadow-outline"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Dashboard"
                required
              />
            </div>

            <div>
              <p className="text-sm font-bold mb-1">Repositories</p>
              {selectedRepos.size > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.from(selectedRepos).map((r) => (
                    <span
                      key={r}
                      className="flex items-center gap-1 py-1 px-2 text-sm bg-slate-100 rounded"
                    >
                      {r}
                      <button
                        type="button"
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => toggleRepo(r)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {isLoadingRepos ? (
                <p className="text-sm text-gray-500">Loading your repos...</p>
              ) : userRepos.length > 0 ? (
                <div>
                  <input
                    className="py-2 px-3 w-full leading-tight text-gray-700 rounded-sm border appearance-none focus:outline-hidden focus:shadow-outline mb-2"
                    placeholder="Search repos..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto border rounded p-2 grid gap-1">
                    {filteredRepos.map((repo) => (
                      <label
                        key={repo.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRepos.has(repo.full_name)}
                          onChange={() => toggleRepo(repo.full_name)}
                        />
                        {repo.full_name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2 mt-2">
                <input
                  className="py-2 px-3 flex-1 leading-tight text-gray-700 rounded-sm border appearance-none focus:outline-hidden focus:shadow-outline"
                  placeholder="Add manually: owner/repo"
                  value={manualRepo}
                  onChange={(e) => setManualRepo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addManualRepo();
                    }
                  }}
                />
                <button
                  type="button"
                  className="py-2 px-4 text-sm rounded-md border hover:bg-gray-50"
                  onClick={addManualRepo}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="py-2 px-4 text-sm rounded-md border hover:bg-gray-50"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 text-sm text-white rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="mt-8 text-gray-500">Loading dashboards...</div>
      )}

      {error && <p className="mt-8 text-red-700">{error}</p>}

      {!isLoading && dashboards.length === 0 && !isCreating && (
        <p className="mt-8 text-gray-500">
          No dashboards yet. Create one to get started.
        </p>
      )}

      {dashboards.length > 0 && (
        <div className="grid gap-4 mt-8">
          {dashboards.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between py-4 px-4 border rounded-md hover:bg-gray-50"
            >
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-gray-500">
                  {d.repositories.length} repo
                  {d.repositories.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboards/${d.id}`}
                  className="py-1 px-3 text-sm rounded-md border hover:bg-gray-100"
                >
                  View
                </Link>
                <button
                  className="py-1 px-3 text-sm text-red-700 rounded-md border border-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(d.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
