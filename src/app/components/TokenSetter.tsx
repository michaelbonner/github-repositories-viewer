"use client";

import { useState } from "react";

export const TokenSetter = () => {
  const [isShowingToken, setIsShowingToken] = useState<boolean>(false);
  return (
    <div>
      <div className="grid gap-2 border mt-8 py-2 px-4">
        <label className="text-sm font-bold" htmlFor="githubToken">
          Github access token
        </label>
        <input
          className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          data-1p-ignore
          defaultValue={
            typeof localStorage !== "undefined"
              ? localStorage.getItem("githubRepositoriesViewer-accessToken") ||
                ""
              : ""
          }
          id="githubToken"
          onBlur={() => {
            setIsShowingToken(false);
          }}
          onChange={(event) => {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(
                "githubRepositoriesViewer-accessToken",
                event.target.value.trim()
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
