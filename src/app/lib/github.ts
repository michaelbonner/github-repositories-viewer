type GithubUser = {
  login: string;
  id: number;
  avatar_url: string;
};

const cache = new Map<string, { user: GithubUser; expiresAt: number }>();

export async function getGithubUser(token: string): Promise<GithubUser> {
  const now = Date.now();
  const cached = cache.get(token);
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
  cache.set(token, { user, expiresAt: now + 5 * 60 * 1000 });
  return user;
}
