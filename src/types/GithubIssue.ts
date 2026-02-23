export type GithubIssue = {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: "open" | "closed";
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // Issues returned by GitHub's issues API include this field for PRs
  pull_request?: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
  };
};
