"use client";

export const TokenSetter = () => {
  return (
    <div className="grid gap-2 border mt-8 py-2 px-4">
      <label className="text-sm font-bold" htmlFor="githubToken">
        Github access token
      </label>
      <input
        className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        id="githubToken"
        type="text"
        onChange={(event) => {
          localStorage.setItem(
            "githubRepositoriesViewer-accessToken",
            event.target.value
          );
        }}
        defaultValue={
          localStorage.getItem("githubRepositoriesViewer-accessToken") || ""
        }
      />
    </div>
  );
};
