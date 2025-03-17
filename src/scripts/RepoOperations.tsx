// RepoOperations.tsx
// This module contains functions for repository operations in the application.
// It uses the Tauri API to interact with the backend.

import { Repository } from '../components/store';
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore } from '../components/store';


// Load repositories from backend and set the first repository as selected.
// If no repositories are found, create a default repository.
export const loadRepositoriesScript = async () => {
    const { setRepositories, setSelectedRepository } = useRepositoryStore.getState();
  
    try {
      let repos: Repository[] = await invoke("get_repositories_command");
  
      if (repos.length === 0) {
        console.log("No repositories found. Creating default repository...");
        const defaultRepoId: string = await invoke("create_repository_command", {
          name: "Default Repository",
          description: "This is the default repository, customize it however!",
          id: "default"
        });
        console.log("Default repository created with ID:", defaultRepoId);
        repos = await invoke("get_repositories_command");
      }
  
      console.warn("LOAD REPOSITORIES SCRIPT FINISHED: SETTING REPOSITORIES AND SELECTED REPOSITORY");
      setRepositories(repos);
      setSelectedRepository(repos[0]);
    } catch (error) {
      console.error("Failed to load repositories:", error);
    }
  };
  

