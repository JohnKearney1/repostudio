// RepoOperations.tsx
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore, useFileStore } from './store/store';
import { Repository } from '../types/ObjectTypes';

export const loadRepositoriesScript = async () => {
  const { setRepositories, setSelectedRepository, selectedRepository } = useRepositoryStore.getState();

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

    // Check if there's a selected repository already set, avoid overwriting it
    if (!selectedRepository) {
      const currentSettings = await invoke("get_app_settings_command") as {
        general_auto_fingerprint: boolean;
        audio_autoplay: boolean;
        setup_selected_repository: string;
      };
      const selectedRepoId = currentSettings.setup_selected_repository;

      if (selectedRepoId) {
        const repoToSelect = repos.find(repo => repo.id === selectedRepoId);
        if (repoToSelect) {
          setSelectedRepository(repoToSelect);
        } else {
          setSelectedRepository(repos[0] || null);
        }
      } else {
        setSelectedRepository(repos[0] || null);
      }
    }
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


// RepoOperations.tsx
export const updateSelectedRepository = async (repo: Repository) => {
  const { setSelectedRepository } = useRepositoryStore.getState();
  try {
    const currentSettings = await invoke("get_app_settings_command") as {
      general_auto_fingerprint: boolean;
      general_theme: string;
      audio_autoplay: boolean;
      setup_selected_repository: string;
    };
     
    await invoke('update_app_settings_command', { 
      args: {
        general_auto_fingerprint: currentSettings.general_auto_fingerprint,
        general_theme: currentSettings.general_theme,
        audio_autoplay: currentSettings.audio_autoplay,
        setup_selected_repository: repo.id,
      }
    });

    setSelectedRepository(repo); 
  } catch (err) {
    console.error('Failed to update selected repository', err);
  }
};

