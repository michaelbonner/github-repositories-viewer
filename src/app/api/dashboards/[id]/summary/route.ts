import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dashboards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getGithubUser } from "@/app/lib/github";
import OpenAI from "openai";

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("token ")) return null;
  return auth.slice(6);
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
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
  });

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { activity?: unknown; since?: unknown; until?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { activity, since, until } = body;

  if (!activity || !Array.isArray((activity as { repos?: unknown })?.repos)) {
    return NextResponse.json(
      { error: "activity.repos must be an array" },
      { status: 400 },
    );
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return NextResponse.json(
      { error: "OpenAI not configured" },
      { status: 503 },
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const lines: string[] = [
    `# Activity Summary for "${dashboard.name}"`,
    `**Period:** ${since} to ${until}`,
    "",
  ];

  const repos = (activity as { repos: Record<string, unknown>[] }).repos;
  for (const repo of repos) {
    const commits = Array.isArray(repo.commits) ? repo.commits : [];
    const pulls = Array.isArray(repo.pulls) ? repo.pulls : [];
    const issues = Array.isArray(repo.issues) ? repo.issues : [];

    lines.push(`## ${repo.repoFullName}`);
    lines.push(
      `- Commits: ${commits.length}, Pull Requests: ${pulls.length}, Issues: ${issues.length}`,
    );

    if (commits.length > 0) {
      lines.push("### Recent Commits");
      for (const c of commits.slice(0, 10) as {
        commit?: { message?: string; author?: { name?: string } };
        author?: { login?: string };
      }[]) {
        const msg = c.commit?.message?.split("\n")[0] ?? "(no message)";
        lines.push(`- ${msg} (${c.author?.login ?? c.commit?.author?.name ?? "unknown"})`);
      }
    }

    if (pulls.length > 0) {
      lines.push("### Pull Requests");
      for (const pr of pulls.slice(0, 10) as {
        state?: string;
        title?: string;
        user?: { login?: string };
      }[]) {
        lines.push(`- [${pr.state}] ${pr.title} by ${pr.user?.login ?? "unknown"}`);
      }
    }

    if (issues.length > 0) {
      lines.push("### Issues");
      for (const issue of issues.slice(0, 10) as {
        state?: string;
        title?: string;
        user?: { login?: string };
      }[]) {
        lines.push(`- [${issue.state}] ${issue.title} by ${issue.user?.login ?? "unknown"}`);
      }
    }
    lines.push("");
  }

  const prompt = lines.join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful engineering manager assistant. Summarize the GitHub activity data provided in a concise, readable markdown format. Highlight key accomplishments, notable PRs, and any patterns or concerns.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    const summary = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
