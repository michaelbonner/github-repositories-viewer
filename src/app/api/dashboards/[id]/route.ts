import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dashboards, dashboardRepositories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getGithubUser } from "@/app/lib/github";

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

  return NextResponse.json(dashboard);
}

export async function PUT(req: NextRequest, { params }: Params) {
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

  const existing = await db.query.dashboards.findFirst({
    where: and(
      eq(dashboards.id, id),
      eq(dashboards.githubUsername, user.login),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { name?: unknown; repositories?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const name: string | undefined = (body.name as string)?.trim();
  const repositories: string[] | undefined = Array.isArray(body.repositories)
    ? (body.repositories as string[])
    : undefined;

  const result = await db.transaction(async (tx) => {
    if (name) {
      await tx
        .update(dashboards)
        .set({ name, updatedAt: new Date() })
        .where(eq(dashboards.id, id));
    }

    if (repositories !== undefined) {
      await tx
        .delete(dashboardRepositories)
        .where(eq(dashboardRepositories.dashboardId, id));

      if (repositories.length > 0) {
        await tx.insert(dashboardRepositories).values(
          repositories.map((repoFullName) => ({
            dashboardId: id,
            repoFullName,
          })),
        );
      }
    }

    return tx.query.dashboards.findFirst({
      where: eq(dashboards.id, id),
      with: { repositories: true },
    });
  });

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: Params) {
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

  const existing = await db.query.dashboards.findFirst({
    where: and(
      eq(dashboards.id, id),
      eq(dashboards.githubUsername, user.login),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(dashboards).where(eq(dashboards.id, id));

  return new NextResponse(null, { status: 204 });
}
