"use client";

import { GithubCollaborator } from "@/types/GithubCollaborator";
import { GithubRepository } from "@/types/GithubRepository";
import { useEffect, useState } from "react";
import { AiFillGithub } from "react-icons/ai";

export const RepositoriesList = () => {
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [filteredRepositories, setFilteredRepositories] = useState<
    GithubRepository[]
  >([]);
  const [filterText, setFilterText] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    setFilteredRepositories(
      repositories.filter((repository) => {
        return repository.name.toLowerCase().includes(filterText.toLowerCase());
      })
    );
  }, [filterText, repositories]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof localStorage !== "undefined") {
        const accessToken = localStorage.getItem(
          "githubRepositoriesViewer-accessToken"
        );
        if (accessToken) {
          setAccessToken(accessToken);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!accessToken) {
    return <div className="mt-8 py-2 px-4 text-orange-600"></div>;
  }

  const fetchRepositories = async (page: number) => {
    setErrorText(null);
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&direction=desc&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      }
    );

    const responseData = await response.json();

    if (Array.isArray(responseData)) {
      setRepositories((repositories) => [...repositories, ...responseData]);
    } else {
      setErrorText(
        responseData?.message ||
          "An unexpected error occurred. Double check your access token and try again."
      );
      setRepositories([]);
    }

    if (response.headers.get("Link")?.includes(`rel="next"`)) {
      fetchRepositories(page + 1);
    }
  };

  return (
    <div className="grid gap-8 border mt-8 py-2 px-4">
      <div className="flex gap-4 items-center">
        <h2>
          Repositories List{" "}
          {repositories.length > 0 && <>({repositories.length})</>}
        </h2>
        <div>
          <button
            className="bg-slate-900 text-white py-1 px-3 rounded-md"
            onClick={(e) => {
              e.preventDefault();
              fetchRepositories(1);
            }}
          >
            Load Repositories
          </button>
        </div>
      </div>
      {repositories.length > 0 && (
        <>
          <div className="max-w-sm">
            <label className="text-sm font-bold" htmlFor="filterText">
              Search
            </label>
            <input
              className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="filterText"
              type="text"
              onChange={(event) => {
                setFilterText(event.target.value);
              }}
              value={filterText}
            />
          </div>
          <div className="grid gap-4">
            {repositories.map((repository) => (
              <Repository
                accessToken={accessToken}
                key={repository.id}
                repository={repository}
                shouldHide={
                  !filteredRepositories.find(
                    (r) => r.full_name === repository.full_name
                  )
                }
              />
            ))}
          </div>
        </>
      )}
      {errorText && <p className="text-red-700">{errorText}</p>}
    </div>
  );
};

const Repository = ({
  accessToken,
  repository,
  shouldHide,
}: {
  accessToken: string | null;
  repository: GithubRepository;
  shouldHide: boolean;
}) => {
  const [collaborators, setCollaborators] = useState<GithubCollaborator[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [collaboratorState, setCollaboratorState] = useState<
    "initial" | "loaded" | "error"
  >("initial");

  useEffect(() => {
    const fetchCollaborators = async () => {
      setErrorText(null);
      const response = await fetch(
        repository.collaborators_url.replace("{/collaborator}", ""),
        {
          headers: {
            Authorization: `token ${accessToken}`,
          },
          cache: "force-cache",
        }
      );
      const responseData = await response.json();
      if (Array.isArray(responseData)) {
        setCollaboratorState("loaded");
        setCollaborators(responseData);
      } else {
        setCollaboratorState("error");
        setErrorText(responseData.message);
        setCollaborators([]);
      }
    };
    fetchCollaborators();
  }, [accessToken, repository.collaborators_url]);

  if (shouldHide) return <></>;

  return (
    <div className="hover:bg-gray-50 -mx-4 px-4 py-4">
      <h3 className="text-xl font-bold">
        <a
          className="inline-flex items-center gap-2"
          href={repository.html_url}
          target="_blank"
          rel="noreferrer"
        >
          <AiFillGithub />
          <span>
            {repository.owner.login}/{repository.name}
          </span>
        </a>
      </h3>
      <div className="mt-2 flex items-center gap-4">
        <h4>Collaborators</h4>
        <ul className="flex gap-2 flex-wrap">
          {collaboratorState === "initial" && <li>Loading...</li>}
          {collaborators.map((collaborator) => {
            return (
              <li key={collaborator.id}>
                <a
                  className="flex gap-4 items-center border rounded-md py-2 px-4 hover:bg-gray-100"
                  href={`https://github.com/${collaborator.login}`}
                  target="_blank"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="rounded-full w-8 h-8"
                    src={collaborator.avatar_url}
                    alt={collaborator.login}
                  />
                  {collaborator.login}
                </a>
              </li>
            );
          })}
        </ul>
        {errorText && <p className="text-red-700">{errorText}</p>}
      </div>
    </div>
  );
};
