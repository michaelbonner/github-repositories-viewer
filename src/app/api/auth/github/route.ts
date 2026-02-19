import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GitHub OAuth is not configured on the server" },
      { status: 500 }
    );
  }

  let tokenResponse: Response;
  let tokenData: Record<string, string>;

  try {
    tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch (err) {
    console.error("GitHub token exchange fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach GitHub OAuth endpoint" },
      { status: 502 }
    );
  }

  try {
    tokenData = await tokenResponse.json();
  } catch (err) {
    console.error("Failed to parse GitHub token response as JSON:", err);
    return NextResponse.json(
      { error: "Invalid response from GitHub OAuth endpoint" },
      { status: 502 }
    );
  }

  if (tokenData.error) {
    return NextResponse.json(
      { error: tokenData.error_description || tokenData.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ access_token: tokenData.access_token });
}
