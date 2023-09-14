"use client";

import { GithubCollaborator } from "@/types/GithubCollaborator";
import { GithubRepository } from "@/types/GithubRepository";
import { useEffect, useState } from "react";
import { AiFillGithub } from "react-icons/ai";

export const RepositoriesList = () => {
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);

  if (!localStorage.getItem("githubRepositoriesViewer-accessToken")) {
    return <div className="mt-8 py-2 px-4 text-orange-600"></div>;
  }

  const fetchRepositories = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const response = await fetch(
      "https://api.github.com/user/repos?sort=updated&direction=desc&per_page=100",
      {
        headers: {
          Authorization: `token ${localStorage.getItem(
            "githubRepositoriesViewer-accessToken"
          )}`,
        },
      }
    );
    setRepositories(await response.json());
  };

  return (
    <div className="grid gap-8 border mt-8 py-2 px-4">
      <div className="flex gap-4 items-center">
        <h2>Repositories List</h2>
        <div>
          <button
            className="bg-slate-900 text-white py-1 px-3 rounded-md"
            onClick={fetchRepositories}
          >
            Load Repositories
          </button>
        </div>
      </div>
      <div className="grid gap-8">
        {repositories.map((repository) => (
          <Repository key={repository.id} repository={repository} />
        ))}
      </div>
    </div>
  );
};

const Repository = ({ repository }: { repository: GithubRepository }) => {
  const [collaborators, setCollaborators] = useState<GithubCollaborator[]>([]);

  useEffect(() => {
    const fetchCollaborators = async () => {
      const response = await fetch(
        repository.collaborators_url.replace("{/collaborator}", ""),
        {
          headers: {
            Authorization: `token ${localStorage.getItem(
              "githubRepositoriesViewer-accessToken"
            )}`,
          },
        }
      );
      const responseData = await response.json();
      if (Array.isArray(responseData)) setCollaborators(responseData);
    };
    fetchCollaborators();
  }, [repository.collaborators_url]);

  return (
    <div>
      <h3 className="text-xl font-bold">
        <a
          className="flex items-center gap-2"
          href={repository.html_url}
          target="_blank"
          rel="noreferrer"
        >
          <AiFillGithub />
          {repository.name}
        </a>
      </h3>
      <div className="mt-2 flex items-center gap-4">
        <h4 className="text-lg">Collaborators</h4>
        <ul className="flex gap-2 flex-wrap">
          {collaborators.map((collaborator) => {
            return (
              <li
                className="flex gap-4 items-center border rounded-md py-2 px-4"
                key={collaborator.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="rounded-full w-8 h-8"
                  src={collaborator.avatar_url}
                  alt={collaborator.login}
                />
                {collaborator.login}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
