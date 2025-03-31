// RepoOperations.tsx
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore, useFileStore } from './store';
import { Repository } from '../types/ObjectTypes';

// Load repositories from backend and set the first repository as selected.
export const loadRepositoriesScript = async () => {
  const { setRepositories, setSelectedRepository } = useRepositoryStore.getState();

  try {
    let repos: Repository[] = await invoke("get_repositories_command");

    if (repos.length === 0) {
      console.log("No repositories found. Creating default repository...");
      await invoke("create_repository_command", {
        id: "default",
        name: "Default Repository",
        description: "This is the default repository, customize it however!"
      });
      console.log("Default repository created.");
      repos = await invoke("get_repositories_command");
    }

    setRepositories(repos);
    setSelectedRepository(repos[0] || null);
  } catch (error) {
    console.error("Failed to load repositories:", error);
  }
};

// Create a new repository
export const createRepository = async (id: string, name: string, description: string) => {
  const { setRepositories, setSelectedRepository } = useRepositoryStore.getState();
  try {
    await invoke("create_repository_command", { id, name, description });
    // Reload repositories from backend
    let repos: Repository[] = await invoke("get_repositories_command");
    setRepositories(repos);

    const newRepo = repos.find((repo) => repo.id === id);
    if (newRepo) {
      setSelectedRepository(newRepo);
    } else {
      console.warn(`New repository with id ${id} not found in the list.`);
      // fallback: select the first one, if needed
      setSelectedRepository(repos[0] || null);
    }
  } catch (error) {
    console.error("Failed to create repository:", error);
  }
};

// Delete a repository
export const deleteRepository = async (repoId: string) => {
  const { selectedRepository } = useRepositoryStore.getState();
  const { setAllFiles, setSelectedFiles } = useFileStore.getState();

  try {
    await invoke("delete_repository_command", { id: repoId });
    // Clear file state if the deleted repo was selected
    if (selectedRepository?.id === repoId) {
      setAllFiles([]);
      setSelectedFiles([]);
    }

    await loadRepositoriesScript(); // Reload to update state
  } catch (error) {
    console.error("Failed to delete repository:", error);
  }
};

// Update repository info
export const updateRepository = async (id: string, name: string, description: string) => {
  try {
    await invoke("update_repository_command", { id, name, description });
    console.log(`Repository '${id}' updated successfully!`);
    await loadRepositoriesScript(); // Reload to update state
  } catch (error) {
    console.error("Failed to update repository:", error);
  }
};

// Refresh files in a repository (syncs files in backend)
export const refreshRepositoryFiles = async (repoId: string) => {
  try {
    await invoke("refresh_files_in_repository_command", { repoId });
    console.log(`Refreshed files in repository '${repoId}'`);
  } catch (error) {
    console.error("Failed to refresh repository files:", error);
  }
};
