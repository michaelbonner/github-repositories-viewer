import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dashboards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getGithubUser } from "@/app/lib/github";
import type { GithubCommit } from "@/types/GithubCommit";
import type { GithubIssue } from "@/types/GithubIssue";

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("token ")) return null;
  return auth.slice(6);
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = getToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user;
  try {
    user = await getGithubUser(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const dashboard = await db.query.dashboards.findFirst({
    where: and(
      eq(dashboards.id, id),
      eq(dashboards.githubUsername, user.login),
    ),
    with: { repositories: true },
  });

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  const until = searchParams.get("until") ?? new Date().toISOString();
  const sinceDefault = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since = searchParams.get("since") ?? sinceDefault.toISOString();

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  const repoActivity = await Promise.all(
    dashboard.repositories.map(async (repo) => {
      const [owner, repoName] = repo.repoFullName.split("/");

      const [commitsRes, pullsRes, issuesRes] = await Promise.all([
        fetch(
          `https://api.github.com/repos/${owner}/${repoName}/commits?since=${since}&until=${until}&per_page=100`,
          { headers },
        ),
        fetch(
          `https://api.github.com/repos/${owner}/${repoName}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
          { headers },
        ),
        fetch(
          `https://api.github.com/repos/${owner}/${repoName}/issues?state=all&sort=updated&direction=desc&since=${since}&per_page=100`,
          { headers },
        ),
      ]);

      const commits: GithubCommit[] = commitsRes.ok
        ? await commitsRes.json()
        : [];

      const allPulls = pullsRes.ok ? await pullsRes.json() : [];
      const pulls = Array.isArray(allPulls)
        ? allPulls.filter((pr: { updated_at: string }) => {
            const updated = new Date(pr.updated_at);
            return updated >= new Date(since) && updated <= new Date(until);
          })
        : [];

      const allIssues: GithubIssue[] = issuesRes.ok
        ? await issuesRes.json()
        : [];
      const issues = Array.isArray(allIssues)
        ? allIssues.filter(
            (issue) =>
              !issue.pull_request &&
              new Date(issue.updated_at) <= new Date(until),
          )
        : [];

      return {
        repoFullName: repo.repoFullName,
        commits: Array.isArray(commits) ? commits : [],
        pulls,
        issues,
      };
    }),
  );

  return NextResponse.json({ repos: repoActivity, since, until });
}
