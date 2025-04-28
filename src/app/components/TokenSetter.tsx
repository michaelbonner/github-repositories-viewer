"use client";

import { useState } from "react";
import { encrypt } from "../lib/encrypt";
import { decrypt } from "../lib/decrypt";

export const TokenSetter = () => {
  const [isShowingToken, setIsShowingToken] = useState<boolean>(false);

  const getDefaultTokenValue = () => {
    if (typeof localStorage === "undefined") return "";

    const localStorageValue = localStorage.getItem(
      "githubRepositoriesViewer-accessToken"
    );

    if (!localStorageValue) return "";

    return decrypt(localStorageValue);
  };

  return (
    <div>
      <div className="grid gap-2 py-2 px-4 mt-8 border">
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
                encrypt(event.target.value.trim())
              );
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
      </div>
    </div>
  );
};
