// FileOperations.tsx
// This module contains functions for file operations in the application.
// It uses the Tauri API to interact with the backend.

import { invoke } from "@tauri-apps/api/core";
import { useFileStore, useRepositoryStore } from "./store";
import { FileMetadata, Repository } from "../types/ObjectTypes";

/// Loads the all the files for a given repository.
export const loadFilesScript = async () => {
  const { setAllFiles, selectedFiles, setSelectedFiles } = useFileStore.getState();
  const { selectedRepository } = useRepositoryStore.getState();
  const repoId = selectedRepository?.id;

  try {
    if (!repoId) {
      console.warn("No repository selected.");
      setAllFiles([]);
      setSelectedFiles([]); // Also clear selected files if needed.
      return;
    }
    console.log("Loading files from repository:", repoId);
    const newFiles: FileMetadata[] = await invoke("get_files_in_repository_command", {
      repoId: repoId,
    });
    console.log("Files returned from backend:", newFiles);

    // Capture the currently selected file IDs.
    const selectedFileIds = new Set(selectedFiles.map((f) => f.id));

    // Update the full file list.
    setAllFiles(newFiles);

    // Reapply the selection state: retain only the files that still exist in the new file list.
    const preservedSelection = newFiles.filter((file) => selectedFileIds.has(file.id));
    setSelectedFiles(preservedSelection);
    console.warn("LOAD FILES SCRIPT FINISHED");
  } catch (error) {
    console.error("Failed to load files:", error);
  }
};


/// Add a file to the selected repository.
export const fileAddScript = async (
    selectedRepository: Repository | null,
    fileToAdd: string,
    handleRemoveDuplicates: () => void
) => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      await invoke("create_file_command", {
        repoId: selectedRepository.id,
        filePath: fileToAdd,
      });
      console.log("File added:", fileToAdd);
      console.warn("FILE ADD SCRIPT FINISHED: CALLING HANDLE REMOVE DUPLICATES");
      
      await handleRemoveDuplicates();
    } catch (error) {
      console.error("Failed to add file:", error);
    }
  };

/// Searches for duplicate files in the selected repository and removes them.
export const handleRemoveDuplicates = async (
    repoId: string
) => {
    try {
    if (!repoId) {
        console.warn("No repository selected!");
        return;
    }
    await invoke("remove_duplicate_files_command", { repoId: repoId });
    console.warn("HANDLE REMOVE DUPLICATES SCRIPT FINISHED");

    } catch (error) {
    console.error("Error removing duplicates:", error);
    }
};
