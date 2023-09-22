"use client";

import { GithubCollaborator } from "@/types/GithubCollaborator";
import { GithubRepository } from "@/types/GithubRepository";
import { useEffect, useState } from "react";
import { AiFillGithub } from "react-icons/ai";
import Toggle from "./Toggle";
import { decrypt } from "../lib/decrypt";

export const RepositoriesList = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [filteredRepositories, setFilteredRepositories] = useState<
    GithubRepository[]
  >([]);
  const [filterText, setFilterText] = useState<string>("");
  const [isIncludingArchived, setIsIncludingArchived] =
    useState<boolean>(false);
  const [isLoadingRepositories, setIsLoadingRepositories] =
    useState<boolean>(false);

  useEffect(() => {
    setFilteredRepositories(
      repositories
        .filter((repository) => {
          return repository.name
            .toLowerCase()
            .includes(filterText.toLowerCase());
        })
        .filter((repository) => {
          // if this is an archived repository and we are not including archived repositories, hide it
          if (!isIncludingArchived && repository.archived) return false;

          return true;
        })
    );
  }, [filterText, isIncludingArchived, repositories]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof localStorage !== "undefined") {
        const accessToken = decrypt(
          localStorage.getItem("githubRepositoriesViewer-accessToken") || ""
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
    setIsLoadingRepositories(true);
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

    setIsLoadingRepositories(false);

    if (Array.isArray(responseData)) {
      setRepositories((r) =>
        [...r, ...responseData].reduce((acc, current) => {
          const x = acc.find(
            (item: GithubRepository) => item.id === current.id
          );

          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, [])
      );
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
      {(repositories.length > 0 || isLoadingRepositories) && (
        <div className="flex gap-4">
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
          <div className="max-w-sm grid">
            <label className="text-sm font-bold" htmlFor="filterText">
              Include Archived
            </label>
            <Toggle
              enabled={isIncludingArchived}
              setEnabled={setIsIncludingArchived}
            />
          </div>
          <div>Filtered Repositories: {filteredRepositories.length}</div>
        </div>
      )}
      {isLoadingRepositories && (
        <div className="grid gap-12 mt-6">
          <LoadingRepositorySkeleton />
          <LoadingRepositorySkeleton />
          <LoadingRepositorySkeleton />
          <LoadingRepositorySkeleton />
          <LoadingRepositorySkeleton />
        </div>
      )}
      {repositories.length > 0 && (
        <>
          <div className="grid gap-4">
            {repositories.map((repository) => {
              const shouldHide = () => {
                // if this repository is already in the filtered list, hide it
                return !filteredRepositories.find(
                  (r) => r.full_name === repository.full_name
                );
              };
              return (
                <Repository
                  accessToken={accessToken}
                  key={repository.id}
                  repository={repository}
                  shouldHide={shouldHide()}
                />
              );
            })}
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
  const [collaboratorState, setCollaboratorState] = useState<
    "initial" | "loaded" | "error"
  >("initial");
  const [collaborators, setCollaborators] = useState<GithubCollaborator[]>([]);
  const [collaboratorsErrorText, setCollaboratorsErrorText] = useState<
    string | null
  >(null);

  const [pullsState, setPullsState] = useState<"initial" | "loaded" | "error">(
    "initial"
  );
  const [pulls, setPulls] = useState<GithubPull[]>([]);
  const [pullsErrorText, setPullsErrorText] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollaborators = async () => {
      setCollaboratorsErrorText(null);
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
        setCollaboratorsErrorText(responseData.message);
        setCollaborators([]);
      }
    };
    fetchCollaborators();
  }, [accessToken, repository.collaborators_url]);

  useEffect(() => {
    const fetchPulls = async () => {
      setPullsErrorText(null);
      const response = await fetch(
        repository.pulls_url.replace("{/number}", ""),
        {
          headers: {
            Authorization: `token ${accessToken}`,
          },
          cache: "force-cache",
        }
      );
      const responseData = await response.json();
      if (Array.isArray(responseData)) {
        setPullsState("loaded");
        setPulls(responseData);
      } else {
        setPullsState("error");
        setPullsErrorText(responseData.message);
        setPulls([]);
      }
    };
    fetchPulls();
  }, [accessToken, repository.pulls_url]);

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
      <div className="ml-6">
        <div className="mt-2 flex items-center gap-4">
          <ul className="flex gap-2 flex-wrap">
            {collaboratorState === "initial" && (
              <li>Loading collaborators...</li>
            )}
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
          {collaboratorsErrorText && (
            <p className="text-red-700">{collaboratorsErrorText}</p>
          )}
        </div>
        {pulls.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mt-4 pl-2">Pull Requests</h4>
            <div className="mt-2 grid gap-4">
              <ul className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-2 flex-wrap">
                {pullsState === "initial" && <li>Loading pull requests...</li>}
                {pulls.map((pull) => {
                  return (
                    <li key={pull.id}>
                      <a
                        className="grid gap-2 items-center border rounded-md py-2 px-4 hover:bg-gray-100"
                        href={`https://github.com/${pull.html_url}`}
                        target="_blank"
                      >
                        <span className="text-lg font-semibold">
                          {pull.title}
                        </span>
                        <span className="text-sm text-gray-600">
                          #{pull.id} opened{" "}
                          {new Date(pull.created_at).toLocaleDateString()} at{" "}
                          {new Date(pull.created_at).toLocaleTimeString()} by{" "}
                          {pull.user.login}
                        </span>
                        {pull.labels.length > 0 && (
                          <span className="text-xs flex flex-wrap gap-1">
                            {pull.labels.map((label) => {
                              return (
                                <span
                                  key={label.id}
                                  className="bg-gray-200 rounded-full px-2 py-1 text-xs"
                                  style={{
                                    backgroundColor: `#${label.color}`,
                                    color: "white",
                                  }}
                                >
                                  {label.name}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
        {pullsErrorText && <p className="text-red-700">{pullsErrorText}</p>}
      </div>
    </div>
  );
};

const LoadingRepositorySkeleton = () => {
  return (
    <div className="grid gap-4">
      <div className="flex gap-3 items-center">
        <div className="bg-gray-200 animate-pulse rounded-full w-6 h-6"></div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-200 animate-pulse rounded-full w-48 h-5"></div>
          <div>/</div>
          <div className="bg-gray-200 animate-pulse rounded-full w-48 h-5"></div>
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <div className="bg-gray-200 animate-pulse rounded-md w-48 h-10"></div>
      </div>
    </div>
  );
};
