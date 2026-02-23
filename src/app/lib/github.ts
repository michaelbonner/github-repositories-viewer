import { createHash } from "crypto";

type GithubUser = {
  login: string;
  id: number;
  avatar_url: string;
};

const cache = new Map<string, { user: GithubUser; expiresAt: number }>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getGithubUser(token: string): Promise<GithubUser> {
  const now = Date.now();
  const key = hashToken(token);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const user: GithubUser = await response.json();

  // Evict expired entries before inserting
  cache.forEach((v, k) => {
    if (v.expiresAt <= now) cache.delete(k);
  });
  cache.set(key, { user, expiresAt: now + 5 * 60 * 1000 });
  return user;
}
