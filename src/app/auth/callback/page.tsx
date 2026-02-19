"use client";

import { useEffect, useState } from "react";
import { encrypt } from "../../lib/encrypt";

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(
        params.get("error_description") || "Authorization was denied"
      );
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code received from GitHub");
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await fetch("/api/auth/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data.access_token) {
          setStatus("error");
          setErrorMessage(data.error || "Failed to exchange code for token");
          return;
        }

        localStorage.setItem(
          "githubRepositoriesViewer-accessToken",
          encrypt(data.access_token)
        );
        localStorage.setItem(
          "githubRepositoriesViewer-authMethod",
          "oauth"
        );

        setStatus("success");
        window.location.href = "/";
      } catch {
        setStatus("error");
        setErrorMessage("Failed to complete authentication");
      }
    };

    exchangeCode();
  }, []);

  return (
    <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
      <h1 className="text-2xl font-bold sm:text-4xl">
        Github Repositories Viewer
      </h1>
      <div className="py-4 px-4 mt-8 border">
        {status === "loading" && <p>Signing in with GitHub...</p>}
        {status === "success" && <p>Signed in! Redirecting&hellip;</p>}
        {status === "error" && (
          <div>
            <p className="text-red-700">{errorMessage}</p>
            <a className="mt-4 inline-block underline" href="/">
              Go back
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
