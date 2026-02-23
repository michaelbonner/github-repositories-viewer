import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dashboards, dashboardRepositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGithubUser } from "@/app/lib/github";

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("token ")) return null;
  return auth.slice(6);
}

export async function GET(req: NextRequest) {
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

  const rows = await db.query.dashboards.findMany({
    where: eq(dashboards.githubUsername, user.login),
    with: { repositories: true },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const name: string = body.name?.trim();
  const repositories: string[] = body.repositories ?? [];

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [dashboard] = await tx
      .insert(dashboards)
      .values({ name, githubUsername: user.login })
      .returning();

    if (repositories.length > 0) {
      await tx.insert(dashboardRepositories).values(
        repositories.map((repoFullName) => ({
          dashboardId: dashboard.id,
          repoFullName,
        })),
      );
    }

    return dashboard;
  });

  return NextResponse.json(result, { status: 201 });
}
