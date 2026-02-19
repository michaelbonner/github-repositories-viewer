"use client";

import { useEffect, useState } from "react";
import { decrypt } from "../lib/decrypt";
import { encrypt } from "../lib/encrypt";

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

export const TokenSetter = () => {
  const [isShowingToken, setIsShowingToken] = useState<boolean>(false);
  const [isOAuth, setIsOAuth] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setIsOAuth(getAuthMethod() === "oauth");
    setIsSignedIn(hasToken());
  }, []);

  const getDefaultTokenValue = () => {
    if (typeof localStorage === "undefined") return "";

    const localStorageValue = localStorage.getItem(
      "githubRepositoriesViewer-accessToken",
    );

    if (!localStorageValue) return "";

    return decrypt(localStorageValue);
  };

  const getAuthMethod = () => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem("githubRepositoriesViewer-authMethod");
  };

  const hasToken = () => {
    if (typeof localStorage === "undefined") return false;
    return !!localStorage.getItem("githubRepositoriesViewer-accessToken");
  };

  const handleSignOut = () => {
    localStorage.removeItem("githubRepositoriesViewer-accessToken");
    localStorage.removeItem("githubRepositoriesViewer-authMethod");
    window.location.reload();
  };

  const handleOAuthSignIn = () => {
    if (!GITHUB_CLIENT_ID) return;

    const state = crypto.randomUUID();
    sessionStorage.setItem("githubRepositoriesViewer-oauthState", state);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: "repo",
      redirect_uri: `${window.location.origin}/auth/callback`,
      state,
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  if (isOAuth && isSignedIn) {
    return (
      <div className="grid gap-2 py-2 px-4 mt-8 border">
        <div className="flex items-center justify-between">
          <p className="text-sm">Signed in with GitHub OAuth</p>
          <button
            className="py-1 px-3 text-sm text-red-700 rounded-md border border-red-700 hover:bg-red-50"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-2 py-2 px-4 mt-8 border">
        {GITHUB_CLIENT_ID && (
          <div className="grid gap-2">
            <button
              className="flex items-center justify-center gap-2 py-2 px-4 w-full text-white rounded-md bg-slate-900 hover:bg-slate-800"
              onClick={handleOAuthSignIn}
            >
              Sign in with GitHub
            </button>
            <div className="flex items-center gap-4 my-2">
              <hr className="flex-1" />
              <span className="text-sm text-gray-500">
                or use a personal access token
              </span>
              <hr className="flex-1" />
            </div>
          </div>
        )}
        <label className="text-sm font-bold" htmlFor="githubToken">
          Github access token
        </label>
        <input
          className="py-2 px-3 w-full leading-tight text-gray-700 rounded-sm border appearance-none focus:outline-hidden focus:shadow-outline"
          data-1p-ignore
          defaultValue={getDefaultTokenValue()}
          id="githubToken"
          onBlur={() => {
            setIsShowingToken(false);
          }}
          onChange={(event) => {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(
                "githubRepositoriesViewer-accessToken",
                encrypt(event.target.value.trim()),
              );
              localStorage.removeItem("githubRepositoriesViewer-authMethod");
            }
          }}
          onFocus={() => {
            setIsShowingToken(true);
          }}
          placeholder="ghp_..."
          type={isShowingToken ? "text" : "password"}
        />
        <div className="text-sm p-4">
          <p className="font-semibold">Instructions</p>
          <ol className="list-decimal list-inside ml-2">
            <li>
              <a
                className="underline"
                href="https://github.com/settings/tokens/new?description=Repositories%20Viewer&scopes=repo&default_expires_at=none"
                target="_blank"
                rel="noopener noreferrer"
              >
                Generate a token
              </a>
              . Make sure the token has enough access to read your repositories
              and their collaborators.
            </li>
            <li>Copy the token and paste it into the input field above.</li>
          </ol>
        </div>
        {isSignedIn && (
          <div className="flex justify-end pb-2">
            <button
              className="py-1 px-3 text-sm text-red-700 rounded-md border border-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
