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
    return <div className="py-2 px-4 mt-8 text-orange-600"></div>;
  }

  const fetchRepositories = async (page: number) => {
    setIsLoadingRepositories(true);
    setErrorText(null);

    const repositoriesUrl = new URL("https://api.github.com/user/repos");
    repositoriesUrl.searchParams.append("sort", "updated");
    repositoriesUrl.searchParams.append("direction", "desc");
    repositoriesUrl.searchParams.append("per_page", "50");
    repositoriesUrl.searchParams.append("page", `${page}`);

    const response = await fetch(repositoriesUrl.href, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

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
    <div className="grid gap-8 py-2 px-4 mt-8 border">
      <div className="grid flex-wrap gap-4 items-center sm:flex">
        <h2>
          Repositories List{" "}
          {repositories.length > 0 && <>({repositories.length})</>}
        </h2>
        <div>
          <button
            className="py-1 px-3 w-full text-white rounded-md bg-slate-900"
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
        <div className="grid flex-wrap gap-4 sm:flex">
          <div className="max-w-sm">
            <label className="text-sm font-bold" htmlFor="filterText">
              Search
            </label>
            <input
              className="py-2 px-3 w-full leading-tight text-gray-700 rounded border appearance-none focus:outline-none focus:shadow-outline"
              id="filterText"
              type="text"
              onChange={(event) => {
                setFilterText(event.target.value);
              }}
              value={filterText}
            />
          </div>
          <div className="grid max-w-sm">
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

      const collaboratorsUrl = new URL(
        repository.collaborators_url.replace("{/collaborator}", "")
      );
      const response = await fetch(collaboratorsUrl.href, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
        cache: "force-cache",
      });
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

      const pullUrl = new URL(repository.pulls_url.replace("{/number}", ""));
      pullUrl.searchParams.append("state", "open");
      pullUrl.searchParams.append("per_page", "100");

      const response = await fetch(pullUrl.href, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
        cache: "force-cache",
      });
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
    <div className="py-4 px-4 -mx-4 hover:bg-gray-50">
      <h3 className="text-lg font-bold break-words sm:text-xl">
        <a
          className="inline-flex overflow-auto gap-2 items-center w-full"
          href={repository.html_url}
          target="_blank"
          rel="noreferrer"
        >
          <AiFillGithub />
          <span className="break-words">
            {repository.owner.login}/
            <wbr />
            {repository.name}
          </span>
        </a>
      </h3>
      <div className="sm:ml-6">
        <div className="flex gap-4 items-center mt-2">
          <ul className="flex flex-wrap gap-2">
            {collaboratorState === "initial" && (
              <li>Loading collaborators...</li>
            )}
            {collaborators.map((collaborator) => {
              return (
                <li key={collaborator.id}>
                  <a
                    className="flex gap-2 items-center py-1 px-2 rounded-md border sm:gap-4 sm:py-2 sm:px-4 hover:bg-gray-100"
                    href={`https://github.com/${collaborator.login}`}
                    target="_blank"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-5 h-5 rounded-full sm:w-8 sm:h-8"
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
            <h4 className="pl-2 mt-4 font-semibold sm:text-lg">
              Pull Requests
            </h4>
            <div className="grid gap-4 mt-2">
              <ul className="grid flex-wrap gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {pullsState === "initial" && <li>Loading pull requests...</li>}
                {pulls.map((pull) => {
                  return (
                    <li key={pull.id}>
                      <a
                        className="grid gap-2 items-center py-2 px-4 rounded-md border hover:bg-gray-100"
                        href={pull.html_url}
                        target="_blank"
                      >
                        <span className="font-semibold sm:text-lg">
                          {pull.title}
                        </span>
                        <span className="text-sm text-gray-600">
                          #{pull.id} opened{" "}
                          {new Date(pull.created_at).toLocaleDateString()} at{" "}
                          {new Date(pull.created_at).toLocaleTimeString()} by{" "}
                          {pull.user.login}
                        </span>
                        {pull.labels.length > 0 && (
                          <span className="flex flex-wrap gap-1 text-xs">
                            {pull.labels.map((label) => {
                              return (
                                <span
                                  key={label.id}
                                  className="py-1 px-2 text-xs bg-gray-200 rounded-full"
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
      <div className="flex gap-1 items-center sm:gap-3">
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse shrink-0"></div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-48 h-5 bg-gray-200 rounded-full animate-pulse"></div>
          <div>/</div>
          <div className="w-48 h-5 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-48 h-10 bg-gray-200 rounded-md animate-pulse"></div>
      </div>
    </div>
  );
};
