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
          className="py-2 px-3 w-full leading-tight text-gray-700 rounded border appearance-none focus:outline-none focus:shadow-outline"
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
          type={isShowingToken ? "text" : "password"}
        />
        <p className="text-sm">
          Instructions: Generate a token here:{" "}
          <a
            className="underline"
            href="https://github.com/settings/tokens"
            target="_blank"
          >
            https://github.com/settings/tokens
          </a>
          . Make sure the token has enough access to read your repositories and
          their collaborators.
        </p>
      </div>
    </div>
  );
};
